import React, { useMemo, useState } from 'react';
import { PoseViewer } from 'react-pose-viewer';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../config';

const languageOptions = {
  'en-ase': { labelKey: 'lang_en_asl', spoken: 'en', signed: 'ase' },
  'ru-rsl': { labelKey: 'lang_ru_rsl', spoken: 'ru', signed: 'rsl' },
  'kk-kvk': { labelKey: 'lang_kk_ksl', spoken: 'kk', signed: 'kvk' }
};

export default function AvatarPlaceholder({ textToSign }) {
  const { t } = useTranslation();
  const [languagePair, setLanguagePair] = useState('en-ase');

  // Determine if there is active user input vs idle state
  const isActive = textToSign && textToSign.trim() !== '';

  const apiUrl = useMemo(() => {
    const selectedLang = languageOptions[languagePair];
    // If no text, default to an idle "Welcome" sequence
    const text = isActive ? textToSign.trim() : 'Caspian Startup';
    return `${API_BASE}/api/pose-proxy/spoken_text_to_signed_pose?spoken=${selectedLang.spoken}&signed=${selectedLang.signed}&text=${encodeURIComponent(text)}`;
  }, [textToSign, languagePair, isActive]);

  const showRoadmap = languagePair === 'kk-kvk' || languagePair === 'ru-rsl';

  return (
    <div className={`w-full h-full min-h-[400px] sm:min-h-[500px] relative rounded-[2rem] overflow-hidden backdrop-blur-md border border-white/50 dark:border-slate-700/50 flex flex-col items-center justify-center transition-all duration-700 ease-in-out
      ${isActive && !showRoadmap ? 'bg-gradient-to-br from-indigo-500/10 to-pink-500/10 shadow-[0_0_30px_rgba(99,102,241,0.15)] animate-pulse' : 'bg-gradient-to-b from-blue-50/50 to-indigo-50/30 shadow-sm'}`}>

      {/* Dropdown for language selection */}
      <div className="absolute top-4 right-4 z-10 transition-opacity duration-300">
        <select
          value={languagePair}
          onChange={(e) => setLanguagePair(e.target.value)}
          className="appearance-none bg-white/70 dark:bg-black/50 text-slate-700 dark:text-slate-300 text-sm font-semibold border border-white/40 dark:border-white/10 rounded-xl px-4 py-2 pr-9 shadow-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all"
          aria-label="Select Sign Language"
        >
          {Object.entries(languageOptions).map(([key, option]) => (
            <option key={key} value={key} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              {t(option.labelKey)}
            </option>
          ))}
        </select>
        {/* Custom Chevron Arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {showRoadmap ? (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-md z-0 animate-in fade-in duration-500">
          <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-2">
              <svg
                className="w-8 h-8 text-indigo-500/80"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                {t('avatar.roadmap.title', `Proprietary ${languagePair === 'kk-kvk' ? 'KSL' : 'RSL'} Models in Development`)}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[260px] mx-auto leading-relaxed">
                {t('avatar.roadmap.desc', 'Teñ AI Phase 2 Roadmap: Local Data Collection Required')}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className={`absolute inset-0 w-full h-full flex items-center justify-center transition-colors duration-700 ${isActive ? 'bg-transparent' : 'bg-white/10 dark:bg-black/10'}`}>
          <PoseViewer
            src={apiUrl}
            loop={true}
            autoplay={true}
            aspectRatio={1}
          />
        </div>
      )}

      {/* Persistent Dashboard Label */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
        <div className={`text-xs font-bold tracking-tight uppercase px-4 py-1.5 rounded-full shadow-sm border transition-colors duration-500 ${isActive ? 'bg-indigo-500 text-white border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'text-slate-500 bg-white/50 dark:bg-black/40 backdrop-blur-md border-white/30 dark:border-white/10'}`}>
          {t('label_live_asl_output')}
        </div>
      </div>
    </div>
  );
}
