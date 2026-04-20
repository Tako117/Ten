import React, { useState, useRef, useEffect } from 'react';
import AvatarPlaceholder from '../components/AvatarPlaceholder';
import { Mic, Camera, Loader2, Square, AlertCircle, Play, Pause, Square as StopIcon, Volume2, ArrowRight, RefreshCw, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CloudVisionTranslator from '../components/CloudVisionTranslator';
import { useAccessibility } from '../context/AccessibilityContext';
import { API_BASE } from '../config';
import AiTutorPanel from '../components/AiTutorPanel';

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { learningProfile, processLessonContent } = useAccessibility();
  
  // State Machine
  const [sessionState, setSessionState] = useState('IDLE'); // IDLE, LISTENING_SCANNING, PROCESSING, ACTIVE_LESSON, ERROR
  const [systemFeedback, setSystemFeedback] = useState('Idle - Ready to start lesson');
  const [error, setError] = useState(null);

  // Content state
  const [lessonData, setLessonData] = useState({ originalText: '', adaptedText: '', chunks: [], profileUsed: 'none' });
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);

  // Chunking pipeline state
  const [activeChunk, setActiveChunk] = useState('');       // Current sentence shown as CC overlay
  const [avatarText, setAvatarText] = useState('');         // English text fed to the Avatar API
  const [signLanguage, setSignLanguage] = useState('ase');  // Selected sign language code
  const [isSequenceRunning, setIsSequenceRunning] = useState(false);
  const sequenceAbortRef = useRef(false);                   // Ref so abort is readable inside async loop

  // Legacy states for compatibility
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState(1.0);
  const [manualText, setManualText] = useState('');
  const [translationMode, setTranslationMode] = useState('textToAsl');
  
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Setup HTML5 Audio Neural TTS
  const handlePlayAudio = async (textToPlay) => {
    if (!textToPlay) return;
    
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
      }
      
      const response = await fetch(`${API_BASE}/api/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToPlay,
          languageCode: i18n.language
        })
      });

      if (!response.ok) throw new Error('Failed to generate Neural TTS');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      audioRef.current = new Audio(url);
      audioRef.current.playbackRate = audioSpeed;

      audioRef.current.onended = () => {
        setIsPlaying(false);
        // If ADHD, we might play chunks manually, but for now we play full text.
      };
      audioRef.current.ontimeupdate = () => {
        // Simple timing synchronization estimate for chunks
        if (learningProfile === 'adhd' && lessonData.chunks.length > 0) {
            const progress = audioRef.current.currentTime / audioRef.current.duration;
            if(!isNaN(progress)) {
                const newIndex = Math.min(Math.floor(progress * lessonData.chunks.length), lessonData.chunks.length - 1);
                setActiveChunkIndex(newIndex);
            }
        }
      };
      audioRef.current.onplay = () => setIsPlaying(true);
      
      await audioRef.current.play();
    } catch (err) {
      console.error("Audio playback error:", err);
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setActiveChunkIndex(0);
    }
  };

  const handleSpeedChange = (newSpeed) => {
    setAudioSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current && audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  // SEQUENTIAL CHUNKING PIPELINE
  const executeLessonSequence = async (rawText, currentLanguage) => {
    if (!rawText.trim()) return;
    sequenceAbortRef.current = false;
    setIsSequenceRunning(true);
    setSessionState('PROCESSING');
    setSystemFeedback(`Adapting content for ${learningProfile} mode...`);
    setError(null);

    try {
      // Step 1: Adapt content via AI profile engine
      const adapted = await processLessonContent(rawText);
      setLessonData(adapted);
      setSessionState('ACTIVE_LESSON');
      setSystemFeedback(`Live lesson running. Optimized for ${learningProfile.toUpperCase()}`);

      // Step 2: Split adapted text into sentence chunks
      const textToChunk = adapted?.adaptedText || rawText;
      // Only split at newlines and bullet points — preserves decimals like "4.1"
      const chunks = textToChunk
        .split(/(?:\r?\n|•)+/)
        .map(c => c.trim())
        .filter(c => c.length > 0);

      // Step 3: Drive the avatar one chunk at a time
      for (let i = 0; i < chunks.length; i++) {
        if (sequenceAbortRef.current) break;

        const chunk = chunks[i];
        setActiveChunk(chunk);          // Show original text as CC overlay
        setActiveChunkIndex(i);
        setSystemFeedback(`Signing chunk ${i + 1} / ${chunks.length}`);

        // Step 4: Frontend Translation (Replaces Backend API Call)
        let processedChunk = chunk;
        // If the chunk contains Cyrillic/Kazakh characters, translate to ENGLISH
        if (/[А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨө]/.test(chunk)) {
            console.log("🌐 Translating chunk to English pivot...");
            try {
                const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(chunk)}`;
                const res = await fetch(url);
                const data = await res.json();
                processedChunk = data[0].map(item => item[0]).join('');
            } catch (err) {
                console.error("❌ Translation failed:", err);
                processedChunk = ""; // Clear it to prevent crashing the pipeline
            }
        }

        // Strip punctuation and force lowercase so sign.mt matches pure dictionary root words
        const sanitizedForAvatar = processedChunk
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove all punctuation
            .replace(/\s+/g, ' ')    // Normalize multiple spaces into one
            .trim();

        // Cyrillic Kill-Switch: Hard guard before rendering
        if (/[А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨө]/.test(sanitizedForAvatar) || !sanitizedForAvatar) {
            console.error("🛑 Invalid or untranslated text detected! Aborting avatar render to prevent DataView crash.");
            setActiveChunk(`⚠ Error: Could not translate "${chunk}" to English.`);
            setSessionState('ERROR');
            break; // Halt the sequence loop
        }

        // Step 5: Preflight the pose-proxy to catch sign.mt rejections before they
        // silently freeze the avatar.
        const poseUrl = `${API_BASE}/api/pose-proxy/spoken_text_to_signed_pose` +
          `?spoken=en&signed=${signLanguage}&text=${encodeURIComponent(sanitizedForAvatar)}`;

        let poseOk = false;
        try {
          const poseRes = await fetch(poseUrl);
          if (!poseRes.ok) {
            const rawServerMessage = await poseRes.text();
            throw new Error(`sign.mt ${poseRes.status}: ${rawServerMessage}`);
          }
          poseOk = true;
        } catch (poseErr) {
          // Surface the exact rejection string in the CC overlay and halt the sequence
          setActiveChunk(`⚠ API ERROR: ${poseErr.message}`);
          setSystemFeedback('Avatar API rejected this chunk — sequence paused.');
          break;
        }

        if (!poseOk) break; // safety guard

        // Step 6: All clear — hand the English chunk to the avatar renderer
        setAvatarText(sanitizedForAvatar);

        // Step 7: Dynamic delay — 6s minimum. Add 1.5s per word, plus a character buffer for fingerspelling fallback
        const wordCount = sanitizedForAvatar.split(/\s+/).length;
        const charCount = sanitizedForAvatar.length;
        const dynamicDuration = Math.max(6000, (wordCount * 1500) + (charCount * 100));
        await new Promise(resolve => setTimeout(resolve, dynamicDuration));
      }

      // Only reset UI after the final animation timer has fully elapsed AND no abort was issued.
      // sequenceAbortRef.current is checked after the await above, not before, so this is safe.
      if (!sequenceAbortRef.current) {
        setActiveChunk('');
        setAvatarText('');
        setSessionState('IDLE');
        setSystemFeedback('Lesson complete.');
      }
    } catch (err) {
      console.error('Lesson sequence error:', err);
      setError('Failed to process lesson.');
      setSessionState('ERROR');
      setSystemFeedback('Error during lesson.');
    } finally {
      setIsSequenceRunning(false);
    }
  };

  const stopSequence = () => {
    sequenceAbortRef.current = true;
    setIsSequenceRunning(false);
    setActiveChunk('');
    setAvatarText('');
    handleStop();
  };

  // INPUT METHODS
  const handleManualStart = () => {
    executeLessonSequence(manualText, i18n.language);
  };

  const handleStartRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];

        setSessionState('PROCESSING');
        setSystemFeedback('Transcribing audio...');

        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('targetLanguage', i18n.language);

          const response = await fetch(`${API_BASE}/api/translate`, {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Failed to translate');

          setManualText(data.text);
          executeLessonSequence(data.text, i18n.language);

        } catch (err) {
          setError(err.message);
          setSessionState('ERROR');
          setSystemFeedback('Audio processing failed.');
        } finally {
          stream.getTracks().forEach(track => track.stop());
        }
      };

      audioChunksRef.current = [];
      recorder.start();
      mediaRecorderRef.current = recorder;
      
      setIsRecording(true);
      setSessionState('LISTENING_SCANNING');
      setSystemFeedback('Listening to input...');

    } catch (err) {
      setError('Microphone access denied or unavailable.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setSessionState('LISTENING_SCANNING');
    setSystemFeedback('Scanning textbook image...');

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('targetLanguage', i18n.language);

      const response = await fetch(`${API_BASE}/api/scan`, {
        method: 'POST',
        body: formData,
      });

      if (!response.body) throw new Error('ReadableStream not yet supported.');

      setSessionState('PROCESSING');
      setSystemFeedback('Extracting text from image...');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let finalResultText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.text !== undefined) finalResultText = parsed.text;
            if (parsed.error) throw new Error(parsed.error);
          } catch (e) {
            console.error('Error parsing stream chunk', e);
          }
        }
      }

      setManualText(finalResultText);
      executeLessonSequence(finalResultText, i18n.language);

    } catch (err) {
      setError(err.message);
      setSessionState('ERROR');
      setSystemFeedback('Scanner failed.');
    }
  };

  const resetSession = () => {
    sequenceAbortRef.current = true;
    setSessionState('IDLE');
    setSystemFeedback('Idle - Ready to start lesson');
    setError(null);
    setActiveChunk('');
    setAvatarText('');
    setIsSequenceRunning(false);
    handleStop();
  };

  return (
    <div className="flex-1 w-full max-w-[1400px] mx-auto px-6 py-8 sm:py-12">

      <div className="flex justify-center mb-8">
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl inline-flex shadow-sm border border-slate-200 dark:border-slate-700">
          <button 
            onClick={() => setTranslationMode('textToAsl')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${translationMode === 'textToAsl' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            Live Lesson Mode
          </button>
          <button 
            onClick={() => setTranslationMode('aslToText')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${translationMode === 'aslToText' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            Live ASL to English
          </button>
        </div>
      </div>

      {translationMode === 'textToAsl' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">

        {/* Left Column (Inputs & State) */}
        <div className="lg:col-span-4 space-y-6 flex flex-col order-2 lg:order-1">

          {/* Input Controls */}
          <div className={`flex flex-col gap-5 transition-opacity duration-300 ${(sessionState !== 'IDLE' && sessionState !== 'ERROR') ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Lesson Source</h2>
              <p className="text-sm text-slate-500 mb-4">Provide content to begin the adaptive lesson.</p>
            </div>

            <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 p-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
              <textarea 
                placeholder="Type or paste lesson content here..." 
                className="w-full px-4 py-3 outline-none text-slate-800 bg-transparent placeholder-slate-400 font-medium resize-none h-[100px]"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
              />
              <div className="flex items-center justify-end px-2 pb-2">
                <button 
                  onClick={handleManualStart}
                  disabled={!manualText.trim()}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Start Lesson
                </button>
              </div>
            </div>

            <button
              onMouseDown={handleStartRecording}
              onMouseUp={handleStopRecording}
              onMouseLeave={handleStopRecording}
              onTouchStart={handleStartRecording}
              onTouchEnd={handleStopRecording}
              className={`relative flex items-center justify-center gap-4 py-4 px-6 rounded-2xl font-bold text-lg select-none shadow-sm transition-transform ${isRecording ? 'bg-pink-500 text-white scale-95' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:scale-95'}`}
            >
              {isRecording ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-6 h-6 text-indigo-500" />}
              {isRecording ? "Release to Stop" : "Hold to Voice Input"}
            </button>

            <div className="relative">
              <input
                type="file" accept="image/*" capture="environment"
                onChange={handleImageUpload}
                disabled={sessionState === 'PROCESSING'}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
              />
              <button
                aria-hidden="true"
                className={`w-full flex items-center justify-center gap-4 py-4 px-6 rounded-2xl font-semibold text-lg shadow-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-95`}
              >
                <Camera className="w-6 h-6 text-indigo-500" />
                Scan Textbook
              </button>
            </div>
          </div>

          {/* System Feedback Tray */}
          <div className="flex flex-col bg-slate-50 rounded-2xl border border-slate-100 p-6 shadow-inner">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
              System State
              {(sessionState === 'PROCESSING' || sessionState === 'LISTENING_SCANNING') && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
            </h3>
            
            <div className="flex items-start gap-3">
              <Layers className={`w-5 h-5 mt-0.5 ${(sessionState==='ERROR') ? 'text-rose-500' : (sessionState==='ACTIVE_LESSON' ? 'text-emerald-500' : 'text-indigo-500')}`} />
              <div>
                <p className={`font-semibold text-sm ${(sessionState==='ERROR') ? 'text-rose-600' : 'text-slate-700'}`}>
                  {sessionState.replace('_', ' ')}
                </p>
                <p className="text-slate-500 text-xs mt-1">{systemFeedback}</p>
                {error && <p className="text-rose-500 text-xs mt-2 font-medium">{error}</p>}
                
                {sessionState === 'ERROR' && (
                  <button onClick={resetSession} className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100">
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (Outputs: Avatar & Tutor) */}
        <div className="lg:col-span-8 space-y-6 flex flex-col order-1 lg:order-2">
          
          {/* Lesson Presenter Card */}
          <div className="h-[600px] sm:h-[80vh] w-full bg-slate-900 rounded-[2rem] border border-slate-800 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col relative">
            {/* Output Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 backdrop-blur-sm z-10 shrink-0">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full transition-colors ${
                  isSequenceRunning ? 'bg-emerald-400 animate-pulse' :
                  sessionState === 'ACTIVE_LESSON' ? 'bg-emerald-400' :
                  sessionState === 'PROCESSING' ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'
                }`} />
                <span className="text-sm font-bold text-slate-300">Lesson Presenter</span>
                {isSequenceRunning && (
                  <span className="text-xs text-slate-500 font-medium ml-1">{systemFeedback}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <select 
                    value={signLanguage} 
                    onChange={(e) => setSignLanguage(e.target.value)}
                    className="bg-gray-800 text-white rounded px-3 py-1 text-sm border border-gray-700 focus:outline-none focus:border-gray-500"
                >
                    <option value="ase">American Sign Language (ASL)</option>
                    <option value="rsl">Russian Sign Language (RSL)</option>
                    <option value="kvk" disabled>Kazakh Sign Language (KVK) - Coming Soon</option>
                </select>
                {(sessionState === 'ACTIVE_LESSON' || isSequenceRunning) && (
                  <button
                    onClick={stopSequence}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 border border-rose-800 hover:border-rose-600 px-3 py-1 rounded-lg transition-colors shadow-sm"
                  >
                    End Session
                  </button>
                )}
              </div>
            </div>

            {/* Avatar Full-Canvas Area */}
            <div className="flex-1 relative overflow-hidden">
              {/* IDLE State */}
              {sessionState === 'IDLE' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                  <Layers className="w-16 h-16 text-slate-700 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-slate-400 mb-2">Awaiting Lesson Input</h3>
                  <p className="text-slate-600 text-sm">Provide text, speak, or scan a textbook to begin.</p>
                </div>
              )}

              {/* PROCESSING State */}
              {sessionState === 'PROCESSING' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                  <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-6" />
                  <h3 className="text-lg font-bold text-slate-300 mb-2">Generating Lesson...</h3>
                  <p className="text-slate-500 text-sm">{systemFeedback}</p>
                </div>
              )}

              {/* ERROR State */}
              {sessionState === 'ERROR' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                  <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-300 mb-2">Something went wrong</h3>
                  <p className="text-slate-500 text-sm mb-4">{error}</p>
                  <button onClick={resetSession} className="flex items-center gap-2 text-sm font-bold text-slate-300 bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl hover:bg-slate-700">
                    <RefreshCw className="w-4 h-4" /> Retry
                  </button>
                </div>
              )}

              {/* ACTIVE LESSON: Avatar canvas fills the right panel completely */}
              {sessionState === 'ACTIVE_LESSON' && (
                <>
                  <div className="absolute inset-0">
                    <React.Suspense fallback={
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                      </div>
                    }>
                      <AvatarPlaceholder textToSign={avatarText} signLanguage={signLanguage} />
                    </React.Suspense>
                  </div>

                  {activeChunk ? (
                    <div className="absolute bottom-0 left-0 right-0 z-20 px-6 py-5 bg-black/80 backdrop-blur-md border-t border-white/10">
                      <p className={`text-white text-center leading-relaxed whitespace-pre-wrap ${
                        learningProfile === 'dyslexia' ? 'text-xl font-medium tracking-wide' : 'text-base font-semibold'
                      }`}>
                        {activeChunk}
                      </p>
                      <div className="flex justify-center gap-1.5 mt-3">
                        {lessonData?.adaptedText && <span className="text-xs text-slate-400 font-medium">{systemFeedback}</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="absolute bottom-0 left-0 right-0 z-20 px-6 py-3 bg-black/40 backdrop-blur-sm border-t border-white/5">
                      <p className="text-slate-500 text-center text-xs font-medium">Lesson complete</p>
                    </div>
                  )}

                  <div className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-2">
                    {isPlaying ? (
                      <button onClick={handlePause} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white">
                        <Pause className="w-4 h-4 fill-current" />
                      </button>
                    ) : (
                      <button onClick={() => handlePlayAudio(lessonData.adaptedText)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-indigo-500 hover:bg-indigo-600 transition-colors text-white">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </button>
                    )}
                    <button onClick={handleStop} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-rose-500/30 hover:text-rose-400 transition-colors text-slate-400">
                      <StopIcon className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <div className="flex items-center gap-2 pl-1 border-l border-white/10">
                      <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="range" min="0.5" max="2.0" step="0.1"
                        value={audioSpeed} onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                        className="w-16 accent-indigo-400 h-1"
                      />
                      <span className="text-xs font-bold text-slate-400 w-6">{audioSpeed}x</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* AI Tutor Panel stacking cleanly below */}
          <AiTutorPanel lessonText={lessonData.originalText} className="w-full" />
        </div>

      </div>
      ) : (
        <div className="flex items-center justify-center w-full min-h-[75vh]">
          <CloudVisionTranslator />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
// Triggering HMR
