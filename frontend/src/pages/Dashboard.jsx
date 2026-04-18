import React, { useState, useRef, useEffect } from 'react';
import AvatarPlaceholder from '../components/AvatarPlaceholder';
import { Mic, Camera, Loader2, Square, AlertCircle, Play, Pause, Square as StopIcon, Volume2, ArrowRight, RefreshCw, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CloudVisionTranslator from '../components/CloudVisionTranslator';
import { useAccessibility } from '../context/AccessibilityContext';
import { API_BASE } from '../config';

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

  // START LESSON PIPELINE
  const executeLessonPipeline = async (rawText) => {
    if (!rawText.trim()) return;
    setSessionState('PROCESSING');
    setSystemFeedback(`Adapting content for ${learningProfile} mode...`);
    setError(null);
    try {
      const adapted = await processLessonContent(rawText);
      setLessonData(adapted);
      
      setSessionState('ACTIVE_LESSON');
      setSystemFeedback(`Live lesson in progress. Optimized for ${learningProfile.toUpperCase()}`);
      setActiveChunkIndex(0);
      
      // Auto-play the adapted audio
      if (adapted?.adaptedText) {
        await handlePlayAudio(adapted.adaptedText);
      }
    } catch (err) {
      setError('Failed to adapt content.');
      setSessionState('ERROR');
      setSystemFeedback('Error during lesson setup.');
    }
  };

  // INPUT METHODS
  const handleManualStart = () => {
    executeLessonPipeline(manualText);
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
          executeLessonPipeline(data.text);

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
      executeLessonPipeline(finalResultText);

    } catch (err) {
      setError(err.message);
      setSessionState('ERROR');
      setSystemFeedback('Scanner failed.');
    }
  };

  const resetSession = () => {
    setSessionState('IDLE');
    setSystemFeedback('Idle - Ready to start lesson');
    setError(null);
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 h-full min-h-[75vh] items-start">

        {/* Left Column - Input & Processing */}
        <div className="lg:col-span-4 flex flex-col gap-6 order-2 lg:order-1">

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

        {/* Right Column - Unified Presenter (Structural Consistency) */}
        <div className="lg:col-span-8 order-1 lg:order-2 h-[600px] sm:h-[80vh] w-full bg-white rounded-[2rem] border border-slate-100 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col relative">
          
          {/* Output Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 backdrop-blur-sm z-10 shrink-0">
             <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${sessionState === 'ACTIVE_LESSON' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                <span className="text-sm font-bold text-slate-600">Lesson Presenter</span>
             </div>
             {sessionState === 'ACTIVE_LESSON' && (
               <button onClick={resetSession} className="text-xs font-bold text-slate-400 hover:text-slate-600">End Session</button>
             )}
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {sessionState === 'IDLE' && (
               <div className="m-auto text-center p-8 max-w-sm">
                 <Layers className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                 <h3 className="text-xl font-bold text-slate-700 mb-2">Awaiting Lesson Input</h3>
                 <p className="text-slate-500 text-sm">Provide text, speak, or scan a textbook to generate an adaptive lesson.</p>
               </div>
            )}
            
            {sessionState === 'PROCESSING' && (
               <div className="m-auto text-center p-8">
                 <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-6" />
                 <h3 className="text-lg font-bold text-slate-700 mb-2">Generating...</h3>
                 <p className="text-slate-500 text-sm">{systemFeedback}</p>
               </div>
            )}

            {sessionState === 'ACTIVE_LESSON' && (
               <div className="flex-1 flex flex-col h-full overflow-y-auto w-full relative">
                 {/* AVATAR LAYER */}
                 <div className={`w-full transition-all duration-500 flex-shrink-0 bg-slate-50
                   ${learningProfile === 'hearing' ? 'h-2/3' : 'h-1/3 border-b border-slate-100 bg-slate-100/50'}
                 `}>
                    <React.Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>}>
                      <AvatarPlaceholder textToSign={lessonData.adaptedText} />
                    </React.Suspense>
                 </div>

                 {/* TEXT / AUDIO LAYER */}
                 <div className={`flex-1 p-6 flex flex-col overflow-y-auto max-h-[400px] bg-white 
                    ${learningProfile === 'dyslexia' ? 'text-xl leading-loose font-medium selection:bg-yellow-200' : 'text-base font-normal'}
                 `}>
                    <div className="flex-1">
                      {learningProfile === 'adhd' && lessonData.chunks.length > 0 ? (
                        <div className="flex flex-col gap-4">
                           {lessonData.chunks.map((chunk, idx) => (
                              <div key={idx} className={`p-5 rounded-2xl border transition-all duration-300 
                                ${idx === activeChunkIndex ? 'border-indigo-400 bg-indigo-50 shadow-md transform scale-[1.01]' : 'border-slate-100 bg-white opacity-50'}`}>
                                <div className="flex items-start gap-4">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5
                                    ${idx === activeChunkIndex ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                    {idx + 1}
                                  </div>
                                  <p className={`text-slate-800 ${idx === activeChunkIndex ? 'font-semibold' : ''}`}>{chunk}</p>
                                </div>
                              </div>
                           ))}
                        </div>
                      ) : (
                        <p className={`text-slate-700 whitespace-pre-wrap leading-relaxed ${learningProfile === 'dyslexia' ? 'tracking-wide max-w-3xl mx-auto' : ''}`}>
                          {lessonData.adaptedText}
                        </p>
                      )}
                    </div>
                 </div>
                 
                 {/* Audio Controls */}
                 <div className="mt-auto px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between shrink-0 sticky bottom-0">
                    <div className="flex gap-2">
                      {isPlaying ? (
                        <button onClick={handlePause} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors shadow-sm text-slate-700">
                          <Pause className="w-5 h-5 fill-current" />
                        </button>
                      ) : (
                        <button onClick={() => handlePlayAudio(lessonData.adaptedText)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-500 hover:bg-indigo-600 transition-colors shadow-sm text-white">
                          <Play className="w-5 h-5 fill-current ml-1" />
                        </button>
                      )}
                      <button onClick={handleStop} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-500 transition-colors shadow-sm text-slate-500">
                        <StopIcon className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                      <Volume2 className="w-4 h-4 text-slate-400" />
                      <input 
                        type="range" min="0.5" max="2.0" step="0.1" 
                        value={audioSpeed} onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                        className="w-20 accent-indigo-500 h-1"
                      />
                      <span className="text-xs font-bold text-slate-500 w-6 text-right">{audioSpeed}x</span>
                    </div>
                  </div>
               </div>
            )}
          </div>
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
