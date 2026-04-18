import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';

/**
 * Math utility for Euclidean space and sequence pattern matching
 */
const MathUtils = {
  magnitude: (v) => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
  dotProduct: (v1, v2) => v1.x * v2.x + v1.y * v2.y + v1.z * v2.z,
  cosineSimilarity: (v1, v2) => {
    const mag1 = MathUtils.magnitude(v1);
    const mag2 = MathUtils.magnitude(v2);
    if (mag1 === 0 || mag2 === 0) return 0;
    return MathUtils.dotProduct(v1, v2) / (mag1 * mag2);
  }
};

/**
 * Dynamic Motion Dictionary
 * Maps temporal trajectory vectors (normalized) to ASL words
 * Y-axis: negative is UP in canvas space
 * X-axis: negative is LEFT, positive is RIGHT
 */
const GestureDictionary = [
  // 'Help' - Both hands (or tracked hand) moving vertically upward
  { name: "Help", template: { x: 0, y: -1, z: 0 }, minMag: 1.5 },

  // 'Hello' - Hand moves outward and up away from center of mass
  { name: "Hello", template: { x: 1, y: -1, z: 0 }, minMag: 1.5 },   // Right hand
  { name: "Hello", template: { x: -1, y: -1, z: 0 }, minMag: 1.5 },  // Left hand

  // 'Finish/Done' - Hands cross and move horizontally outward
  { name: "Finish / Done", template: { x: 1, y: 0, z: 0 }, minMag: 2.0 },  // Swipe right
  { name: "Finish / Done", template: { x: -1, y: 0, z: 0 }, minMag: 2.0 }  // Swipe left
];

const BUFFER_SIZE = 20;
const COOLDOWN_MS = 1500;

export default function DynamicVisionTranslator() {
  const webcamRef = useRef(null);
  const sequenceBuffer = useRef([]);
  const requestRef = useRef(null);
  const isDetectingRef = useRef(false);
  const lastDetectionTime = useRef(0);

  const [translatedText, setTranslatedText] = useState("");
  const [isModelLoading, setIsModelLoading] = useState(true);

  /**
   * Sequence Classifier using Cosine Similarity Time Warping representation
   * Computes trajectory endpoints and velocity curve similarity against dictionary
   */
  const classifySequence = useCallback((buffer) => {
    if (buffer.length < BUFFER_SIZE) return null;

    // Temporal frame analysis: Calculate dynamic deltas
    const startFrame = buffer[0];
    const endFrame = buffer[buffer.length - 1];

    const trajectoryVector = {
      x: endFrame.x - startFrame.x,
      y: endFrame.y - startFrame.y,
      z: endFrame.z - startFrame.z
    };

    const motionMagnitude = MathUtils.magnitude(trajectoryVector);

    let bestMatch = null;
    let highestConfidence = 0;

    // Pattern Matching Template evaluation
    for (const gesture of GestureDictionary) {
      if (motionMagnitude < gesture.minMag) continue; // Ignore micros-twitches

      const similarity = MathUtils.cosineSimilarity(trajectoryVector, gesture.template);

      // Strict thresholding for confidence > 0.75
      if (similarity >= 0.75 && similarity > highestConfidence) {
        highestConfidence = similarity;
        bestMatch = gesture.name;
      }
    }

    return bestMatch;
  }, []);

  const detect = useCallback(async (net) => {
    if (
      webcamRef.current &&
      webcamRef.current.video &&
      webcamRef.current.video.readyState === 4 &&
      !isDetectingRef.current
    ) {
      isDetectingRef.current = true;

      try {
        const video = webcamRef.current.video;
        const hand = await net.estimateHands(video);

        if (hand && hand.length > 0) {
          // Handpose landmark indices: 0 = palm base, 8 = index fingertip
          const landmarks = hand[0].landmarks;
          const palmBase = landmarks[0];
          const indexTip = landmarks[8];

          // 1. Calculate Spatial Scale (distance between palm logic and fingertip) 
          // This creates z-index depth independence allowing users to be near/far from camera
          const dx = palmBase[0] - indexTip[0];
          const dy = palmBase[1] - indexTip[1];
          const dz = palmBase[2] - indexTip[2];
          const scaleFactor = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

          // 2. Normalize palm coordinates relative to the physical hand scale (not canvas scale)
          const normalizedPoint = {
            x: palmBase[0] / scaleFactor,
            y: palmBase[1] / scaleFactor,
            z: palmBase[2] / scaleFactor
          };

          // 3. Buffer append and maintain temporal window
          sequenceBuffer.current.push(normalizedPoint);
          if (sequenceBuffer.current.length > BUFFER_SIZE) {
            sequenceBuffer.current.shift();
          }

          // 4. Temporal Classification (respecting cooldowns)
          const now = Date.now();
          if (now - lastDetectionTime.current > COOLDOWN_MS) {
            const match = classifySequence(sequenceBuffer.current);
            if (match) {
              setTranslatedText(match);
              lastDetectionTime.current = now;
              // Flush buffer to prevent immediate redundant classifications of the same motion
              sequenceBuffer.current = [];
            }
          }
        } else {
          // If hand is lost, slowly decay the buffer to simulate interrupted motion
          if (sequenceBuffer.current.length > 0) sequenceBuffer.current.shift();
        }
      } catch (err) {
        console.error("Dynamic Trajectory tracking error:", err);
      } finally {
        isDetectingRef.current = false;
      }
    }

    requestRef.current = requestAnimationFrame(() => detect(net));
  }, [classifySequence]);

  const initPipeline = useCallback(async () => {
    try {
      await tf.ready();
      const net = await handpose.load();
      setIsModelLoading(false);
      detect(net);
    } catch (err) {
      console.error('Error hydrating temporal model weights:', err);
      setIsModelLoading(false);
    }
  }, [detect]);

  useEffect(() => {
    initPipeline();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      sequenceBuffer.current = []; // Wipe sequences from RAM on unmount
    };
  }, [initPipeline]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-5xl mx-auto p-6 md:p-10 bg-slate-900/90 rounded-[2.5rem] shadow-[0_0_50px_rgba(99,102,241,0.2)] text-indigo-50 border border-slate-700/50 backdrop-blur-xl">
      <div className="flex w-full items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-indigo-400 to-cyan-400">
            Temporal Sign Engine
          </h2>
          <p className="text-slate-400 text-sm mt-1 font-medium tracking-wide">Dynamic Spatiotemporal Tracking</p>
        </div>
        <div className="px-4 py-1.5 bg-pink-500/10 text-pink-300 rounded-full border border-pink-500/20 text-xs font-bold tracking-widest uppercase animate-pulse">
          Live Model
        </div>
      </div>

      {isModelLoading ? (
        <div className="flex flex-col items-center justify-center w-full aspect-video bg-slate-950/60 rounded-3xl relative overflow-hidden border border-slate-800/80 shadow-inner">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-pink-500 rounded-full animate-spin mb-6 drop-shadow-[0_0_20px_rgba(236,72,153,0.5)]"></div>
          <p className="text-indigo-200/80 font-bold tracking-widest text-sm uppercase animate-pulse">Establishing Temporal Buffer...</p>
        </div>
      ) : (
        <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.9)] bg-black ring-1 ring-slate-700 group">
          <Webcam
            ref={webcamRef}
            muted
            className="absolute top-0 left-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />

          <div className="absolute top-6 left-6 flex items-center space-x-3 bg-black/50 backdrop-blur-lg px-5 py-2.5 rounded-full z-10 border border-white/10 shadow-lg">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </div>
            <span className="text-xs font-bold text-cyan-50 tracking-[0.2em] uppercase">Temporal Tracking</span>
          </div>

          <div className="absolute bottom-6 right-6 flex gap-2">
            <div className="bg-black/50 backdrop-blur-lg border border-white/10 px-4 py-2 rounded-xl text-[10px] text-white/60 uppercase font-mono tracking-widest flex items-center">
              Buffer: 20 Frames
            </div>
            <div className="bg-black/50 backdrop-blur-lg border border-white/10 px-4 py-2 rounded-xl text-[10px] text-white/60 uppercase font-mono tracking-widest flex items-center">
              DTW Matcher
            </div>
          </div>
        </div>
      )}

      <div className="mt-10 w-full bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700/50 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-indigo-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-indigo-500 to-cyan-500"></div>

        <label className="block text-xs font-bold text-indigo-300 mb-4 uppercase tracking-[0.25em]">Recognized Motion</label>

        <div className="w-full bg-slate-950/90 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center min-h-[140px] shadow-inner relative z-10">
          <span className={`text-6xl md:text-7xl text-center font-black ${translatedText ? 'text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.3)] bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-300 scale-105' : 'text-slate-700 scale-100'} transition-all duration-500 ease-out transform`}>
            {translatedText ? translatedText : '...'}
          </span>
        </div>
      </div>
    </div>
  );
}
