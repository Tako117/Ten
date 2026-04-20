import React, { useMemo } from 'react';
import { PoseViewer } from 'react-pose-viewer';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../config';

// AvatarPlaceholder always uses spoken=en.
// The Dashboard pipeline guarantees textToSign is English BEFORE it reaches this
// component — translation from KK/RU happens upstream in executeLessonSequence.
// We allow toggling between ase (ASL) and rsl (RSL) while enforcing spoken=en.
export default function AvatarPlaceholder({ textToSign, signLanguage = 'ase' }) {
  const { t } = useTranslation();

  // Determine if there is active user input vs idle state
  const isActive = textToSign && textToSign.trim() !== '';

  const apiUrl = useMemo(() => {
    // If no text, default to an idle "Welcome" sequence
    const text = isActive ? textToSign.trim() : 'Welcome';
    // ALWAYS spoken=en — text is guaranteed English from the translation bridge
    return `${API_BASE}/api/pose-proxy/spoken_text_to_signed_pose?spoken=en&signed=${signLanguage}&text=${encodeURIComponent(text)}`;
  }, [textToSign, isActive, signLanguage]);

  return (
    <div className={`w-full h-full min-h-[400px] sm:min-h-[500px] relative rounded-[2rem] overflow-hidden backdrop-blur-md border border-white/50 dark:border-slate-700/50 flex flex-col items-center justify-center transition-all duration-700 ease-in-out
      ${isActive ? 'bg-gradient-to-br from-indigo-500/10 to-pink-500/10 shadow-[0_0_30px_rgba(99,102,241,0.15)] animate-pulse' : 'bg-gradient-to-b from-blue-50/50 to-indigo-50/30 shadow-sm'}`}>

      {/* Avatar canvas — always en for spoken, dynamic for signed */}
      <div className={`absolute inset-0 w-full h-full flex items-center justify-center transition-colors duration-700 ${isActive ? 'bg-transparent' : 'bg-white/10 dark:bg-black/10'}`}>
        <PoseViewer
          src={apiUrl}
          loop={true}
          autoplay={true}
          aspectRatio={1}
        />
      </div>

      {/* Persistent Dashboard Label */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
        <div className={`text-xs font-bold tracking-tight uppercase px-4 py-1.5 rounded-full shadow-sm border transition-colors duration-500 ${isActive ? 'bg-indigo-500 text-white border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'text-slate-500 bg-white/50 dark:bg-black/40 backdrop-blur-md border-white/30 dark:border-white/10'}`}>
          {signLanguage === 'ase' ? t('label_live_asl_output') : 'LIVE RSL OUTPUT'}
        </div>
      </div>
    </div>
  );
}
