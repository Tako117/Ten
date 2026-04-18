import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';
import * as fp from 'fingerpose';

/**
 * Define Custom ASL Gestures using Fingerpose
 * We provide robust mappings for 'A', 'B', 'C' to prove the pipeline correctly processes 3D landmarks
 */

// 'A' Letter
const aLetter = new fp.GestureDescription('A');
aLetter.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0);
aLetter.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 0.8); // Provide slight flex tolerance
for (let finger of [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
  aLetter.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
  aLetter.addCurl(finger, fp.FingerCurl.HalfCurl, 0.9);
}

// 'B' Letter
const bLetter = new fp.GestureDescription('B');
bLetter.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 1.0);
bLetter.addCurl(fp.Finger.Thumb, fp.FingerCurl.FullCurl, 0.9);
for (let finger of [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
  bLetter.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
  bLetter.addDirection(finger, fp.FingerDirection.VerticalUp, 1.0);
}

// 'C' Letter
const cLetter = new fp.GestureDescription('C');
for(let finger of [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
  cLetter.addCurl(finger, fp.FingerCurl.HalfCurl, 1.0);
}

// Instantiate Gesture Estimator once globally to save memory and processing power
const GE = new fp.GestureEstimator([
  aLetter,
  bLetter,
  cLetter,
  fp.Gestures.ThumbsUpGesture,
  fp.Gestures.VictoryGesture
]);

export default function VisionTranslator() {
  const webcamRef = useRef(null);
  const [translatedText, setTranslatedText] = useState('');
  const [isModelLoading, setIsModelLoading] = useState(true);
  
  // Refs for loop & state tracking without triggering re-renders
  const requestRef = useRef(null);
  const isDetectingRef = useRef(false);

  const detect = async (net) => {
    // Basic guards ensuring webcam data is reliably available
    if (
      webcamRef.current &&
      webcamRef.current.video &&
      webcamRef.current.video.readyState === 4 &&
      !isDetectingRef.current
    ) {
      isDetectingRef.current = true;
      try {
        const video = webcamRef.current.video;
        // Estimate hands, passing through the video elements tensor stream
        const hand = await net.estimateHands(video);

        if (hand && hand.length > 0) {
          // Estimate gesture using the default threshold of 8.5
          const estimatedGestures = GE.estimate(hand[0].landmarks, 8.5);

          if (estimatedGestures && estimatedGestures.gestures && estimatedGestures.gestures.length > 0) {
            // Find the most confident gesture above threshold
            const highestConfidence = estimatedGestures.gestures.reduce((p, c) => { 
              return (p.score > c.score) ? p : c;
            });
            
            if (highestConfidence && highestConfidence.score >= 8.5) {
              setTranslatedText(highestConfidence.name);
            }
          }
        }
      } catch (err) {
        console.error("TF.js Detection error:", err);
      } finally {
        // Unlock detection flag so the next animation frame can fire a new estimate
        isDetectingRef.current = false;
      }
    }
    
    // Continuously loop detection bound to screen refresh rate
    requestRef.current = requestAnimationFrame(() => detect(net));
  };

  const runHandpose = async () => {
    try {
      // Must safely await until WebGL/WASM backends are properly initialized
      await tf.ready(); 
      const net = await handpose.load();
      setIsModelLoading(false);
      detect(net);
    } catch (err) {
      console.error('Error loading handpose model or TensorFlow backend:', err);
      setIsModelLoading(false);
    }
  };

  useEffect(() => {
    runHandpose();
    
    // Prevent memory leaks / infinite loops upon unmount
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto p-8 bg-slate-900 rounded-3xl shadow-[0_0_40px_rgba(99,102,241,0.15)] text-indigo-50 border border-slate-800">
      <div className="flex w-full items-center justify-between mb-6">
          <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
            Vision Translator 
            <span className="text-sm font-medium px-3 py-1 ml-4 bg-indigo-500/10 text-indigo-300 rounded-full border border-indigo-500/20 align-middle">
              Live AI
            </span>
          </h2>
      </div>
      
      {isModelLoading ? (
        <div className="flex flex-col items-center justify-center w-full aspect-video bg-slate-950/50 rounded-2xl relative overflow-hidden backdrop-blur-sm border border-slate-800">
           <div className="w-14 h-14 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
           <p className="text-indigo-200 font-semibold tracking-wider text-sm animate-pulse">Initializing TensorFlow Neural Net...</p>
        </div>
      ) : (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] bg-black ring-1 ring-slate-700 group">
          <Webcam
            ref={webcamRef}
            muted
            className="absolute top-0 left-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }} // Mirror the webcam visually for natural intuitive user UX
          />
          <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full z-10 border border-white/5 transition duration-300">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.7)]"></div>
            <span className="text-xs font-bold text-emerald-50 tracking-widest uppercase">Live Decoding</span>
          </div>
          <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur border border-white/10 px-3 py-1.5 rounded text-[10px] text-white/50 uppercase font-mono tracking-widest">
            3D Handpose Sync
          </div>
        </div>
      )}

      <div className="mt-8 w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        <label className="block text-xs font-bold text-indigo-300 mb-3 uppercase tracking-[0.2em]">Neural Text Output</label>
        <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-6 flex flex-col justify-center min-h-[120px] shadow-inner relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent opacity-50"></div>
          <span className={`text-5xl md:text-6xl text-center font-black z-10 ${translatedText ? 'text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]' : 'text-slate-700'} transition-all duration-300`}>
            {translatedText ? (translatedText === 'Victory' ? 'V' : (translatedText === 'Thumbs_Up' ? 'Thumbs Up' : translatedText)) : '...'}
          </span>
        </div>
      </div>
    </div>
  );
}
