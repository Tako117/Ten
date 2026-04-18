import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, RefreshCw, Loader2, Sparkles, Timer } from 'lucide-react';

const MAX_FRAMES = 5; // Capture exactly 5 frames spaced across 2.5s window
const INTERVAL_MS = 500;
const COMPRESSION_SIZE = 512; // 512x512 downsampling to avoid network bloat

export default function CloudVisionTranslator() {
  const webcamRef = useRef(null);
  
  // React State
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownTimer, setCountdownTimer] = useState(3);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [frameCount, setFrameCount] = useState(0);

  // Refs for tracking mutable loop state
  const captureIntervalRef = useRef(null);
  const framesBufferRef = useRef([]);

  const cleanUpIntervals = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  }, []);

  const captureFrame = useCallback(() => {
    if (!webcamRef.current || !webcamRef.current.video) return;
    
    const video = webcamRef.current.video;
    
    // Create offscreen canvas for extreme compression
    const canvas = document.createElement('canvas');
    canvas.width = COMPRESSION_SIZE;
    canvas.height = COMPRESSION_SIZE;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Mirror the image horizontally on the canvas to correct the webcam mirroring UX
      ctx.translate(COMPRESSION_SIZE, 0);
      ctx.scale(-1, 1);
      
      // Decapitation Math: Crop top 40% out of the matrix to hide facial traits
      const sourceY = video.videoHeight * 0.4;
      const sourceHeight = video.videoHeight * 0.6;
      const sourceWidth = video.videoWidth;

      ctx.drawImage(video, 0, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      
      const base64Jpeg = canvas.toDataURL('image/jpeg', 0.7); // 70% quality compression
      framesBufferRef.current.push(base64Jpeg);
      setFrameCount(framesBufferRef.current.length);

      // Auto-stop if we reach max buffer (safeguard API limits)
      if (framesBufferRef.current.length >= MAX_FRAMES) {
        cleanUpIntervals();
        setIsRecording(false);
        processSequenceCloud([...framesBufferRef.current]);
      }
    }
  }, [cleanUpIntervals]);

  const startHandsFreeFlow = useCallback((e) => {
    if (e) e.preventDefault();
    if (isProcessing || isRecording || isCountingDown) return;

    // Reset states
    framesBufferRef.current = [];
    setFrameCount(0);
    setTranslatedText('');
    setCountdownTimer(3);
    setIsCountingDown(true);

    // Initial countdown mechanics
    let currentCount = 3;
    const countdownInterval = setInterval(() => {
      currentCount -= 1;
      
      if (currentCount <= 0) {
        clearInterval(countdownInterval);
        setIsCountingDown(false);
        
        // At exactly 0, start Recording
        setIsRecording(true);
        captureFrame(); // trigger frame 1 instantly
        
        // Start running capture intervals
        captureIntervalRef.current = setInterval(() => {
          captureFrame();
        }, INTERVAL_MS);
        
      } else {
        setCountdownTimer(currentCount);
      }
    }, 1000);
    
  }, [captureFrame, isProcessing, isRecording, isCountingDown]);

  const processSequenceCloud = async (framesArray) => {
    setIsProcessing(true);
    setTranslatedText('');

    try {
      const response = await fetch('http://localhost:5000/api/translate-vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          frames: framesArray,
          prompt: "Analyze this sequence of images. What American Sign Language (ASL) word or phrase is being signed? Respond ONLY with the translated English text."
        })
      });

      if (!response.ok) {
        throw new Error('API rejection');
      }

      const data = await response.json();
      setTranslatedText(data.text || data.translation || "Did not recognize.");
    } catch (error) {
      console.error("RAW API ERROR: ", error);
      setTranslatedText("[Network/API Connection Error. Ensure Backend is running.]");
    } finally {
      setIsProcessing(false);
      // Dump large images from memory to avoid DOM memory leakage
      framesBufferRef.current = [];
      setFrameCount(0);
    }
  };

  useEffect(() => {
    return () => {
      cleanUpIntervals();
    };
  }, [cleanUpIntervals]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-5xl mx-auto p-6 md:p-10 bg-slate-900/90 rounded-[2.5rem] shadow-[0_0_50px_rgba(99,102,241,0.2)] text-indigo-50 border border-slate-700/50 backdrop-blur-xl transition-all duration-500">
      
      {/* Header */}
      <div className="flex w-full items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
            Cloud Vision Translator
          </h2>
          <p className="text-slate-400 text-sm mt-1 font-medium tracking-wide">Massive-Vocabulary Multimodal Inference</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 text-indigo-300 rounded-full border border-indigo-500/20 text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(99,102,241,0.2)]">
          <Sparkles className="w-3.5 h-3.5" />
          Native API
        </div>
      </div>
      
      {/* Viewport Box */}
      <div className={`relative w-full aspect-video rounded-3xl overflow-hidden bg-black ring-1 group transition-all duration-500
        ${(isRecording || isCountingDown) ? 'ring-cyan-500 shadow-[0_0_40px_rgba(6,182,212,0.3)]' : 'ring-slate-700 shadow-[inset_0_0_40px_rgba(0,0,0,0.9)]'}
        ${isProcessing ? 'opacity-80 scale-[0.98]' : 'opacity-100 scale-100'}
      `}>
        <Webcam
          ref={webcamRef}
          muted
          screenshotFormat="image/jpeg"
          screenshotQuality={0.5}
          videoConstraints={{ width: 512, height: 512, facingMode: "user" }}
          className={`absolute top-0 left-0 w-full h-full object-cover transition-all duration-500 ${isProcessing ? 'opacity-30 blur-md grayscale' : (isCountingDown ? 'blur-sm scale-105' : 'opacity-100')} `}
          style={{ transform: 'scaleX(-1)' }} // Local Mirror preview
        />

        {/* 3 Second Countdown Overlay */}
        {isCountingDown && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center z-20 backdrop-blur-sm animate-in fade-in duration-300">
             <div className="text-9xl md:text-[180px] font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.4)] animate-pulse tracking-tighter">
                {countdownTimer}
             </div>
             <p className="text-cyan-300 font-bold tracking-[0.3em] uppercase mt-2 text-sm md:text-md animate-bounce drop-shadow-md">
                Step Back and Raise Hands
             </p>
          </div>
        )}
        
        {/* Recording Active Overlay */}
        {isRecording && (
          <div className="absolute top-6 left-6 flex items-center space-x-3 bg-black/70 backdrop-blur-lg px-5 py-2.5 rounded-full z-10 border border-cyan-500/30 shadow-lg animate-in slide-in-from-top-4 duration-300">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </div>
            <span className="text-xs font-bold text-cyan-50 tracking-[0.2em] uppercase">Recording Sequence...</span>
            <span className="ml-2 bg-cyan-500 text-white text-[10px] px-2 py-0.5 rounded-md font-mono">{frameCount} / {MAX_FRAMES}</span>
          </div>
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 animate-in fade-in duration-500">
            <Loader2 className="w-16 h-16 text-indigo-400 animate-spin mb-6 drop-shadow-xl" />
            <div className="bg-black/60 backdrop-blur-xl px-8 py-4 rounded-full border border-indigo-500/30 flex items-center gap-4">
               <RefreshCw className="w-5 h-5 text-indigo-300 animate-[spin_3s_linear_infinite]" />
               <span className="text-sm font-bold text-indigo-100 tracking-[0.2em] uppercase">Analyzing Sequence Protocol...</span>
            </div>
          </div>
        )}

        {/* Idle Badge */}
        {!isRecording && !isProcessing && !isCountingDown && (
          <div className="absolute top-6 left-6 flex items-center space-x-3 bg-black/50 backdrop-blur-lg px-5 py-2.5 rounded-full z-10 border border-white/10 shadow-lg group-hover:bg-black/70 transition-colors">
            <Camera className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-50 tracking-[0.2em] uppercase">Lens Active</span>
          </div>
        )}
      </div>

      {/* Button & Output Row */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-6 w-full items-stretch">
        
        {/* Interaction Trigger */}
        <div className="md:col-span-4 flex items-center justify-center">
            <button
              onClick={startHandsFreeFlow}
              disabled={isProcessing || isRecording || isCountingDown}
              className={`relative w-full h-[120px] flex flex-col items-center justify-center gap-3 rounded-2xl font-black text-lg transition-all duration-300 select-none shadow-xl border overflow-hidden
                ${(isRecording || isCountingDown)
                  ? 'bg-gradient-to-br from-cyan-600 to-cyan-500 text-white border-cyan-400 scale-[0.98] shadow-inner opacity-90' 
                  : isProcessing
                    ? 'bg-slate-800 text-slate-500 border-slate-700 scale-100 opacity-80 cursor-not-allowed'
                    : 'bg-gradient-to-br from-indigo-500 to-cyan-500 text-white border-indigo-400 hover:scale-[1.02] hover:shadow-[0_10px_30px_rgba(99,102,241,0.4)] active:scale-[0.98]'
                }`}
            >
              {(isRecording || isCountingDown) ? <Timer className="w-8 h-8 animate-pulse text-white/80" /> : <Camera className="w-8 h-8" />}
              {isCountingDown ? `Get Ready (${countdownTimer}s)` : isRecording ? "Motion Active..." : isProcessing ? "Uploading..." : "Start Hands-Free Capture"}
              
              {/* Optional progress bar for scanning */}
              {isRecording && (
                <div className="absolute bottom-0 left-0 h-1.5 bg-black/30 w-full">
                  <div className="h-full bg-cyan-200 transition-all duration-[250ms] ease-linear" style={{ width: `${(frameCount / MAX_FRAMES) * 100}%` }}></div>
                </div>
              )}
            </button>
        </div>

        {/* API Response Output Tray */}
        <div className="md:col-span-8 bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 shadow-xl relative overflow-hidden group w-full flex flex-col justify-center">
          <div className="absolute top-0 left-0 w-full h-1 flex">
             <div className="h-full w-1/3 bg-indigo-500"></div>
             <div className="h-full w-1/3 bg-cyan-500"></div>
             <div className="h-full w-1/3 bg-emerald-500"></div>
          </div>
          
          <label className="block text-xs font-bold text-indigo-300 mb-3 uppercase tracking-[0.25em]">Cloud Inference Result</label>
          
          <div className="w-full bg-slate-950/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-center h-full min-h-[80px] shadow-inner">
            {isProcessing ? (
               <div className="flex items-center gap-4">
                  <div className="flex gap-1.5 items-center justify-center h-full ml-4">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
               </div>
            ) : (
               <span className={`text-lg md:text-xl font-black whitespace-normal break-words overflow-hidden 
                ${translatedText 
                  ? 'text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.4)] bg-clip-text text-transparent bg-gradient-to-r from-emerald-100 to-emerald-300' 
                  : 'text-slate-700'
                } transition-all duration-500 ease-out`}
               >
                 {translatedText ? translatedText : '...'}
               </span>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
