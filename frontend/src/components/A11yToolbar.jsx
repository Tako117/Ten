import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '../context/AccessibilityContext';
import { Languages, Type, Contrast, Brain } from 'lucide-react';

const A11yToolbar = () => {
  const { i18n } = useTranslation();
  const { highContrast, toggleHighContrast, cycleTextSize, textSize, learningProfile, setLearningProfile } = useAccessibility();

  const cycleLearningProfile = () => {
    const profiles = ['none', 'hearing', 'dyslexia', 'adhd'];
    const currentIndex = profiles.indexOf(learningProfile);
    const nextIndex = (currentIndex + 1) % profiles.length;
    setLearningProfile(profiles[nextIndex]);
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div 
      className="fixed top-4 left-4 z-50 flex gap-2 bg-white p-2 rounded-2xl shadow-md border border-gray-100 a11y-toolbar-container"
      role="toolbar"
      aria-label="Accessibility and Language Toolbar"
    >
      {/* Ensure Language is first reachable element */}
      <div className="flex gap-1 border-r border-gray-200 pr-2 mr-1 items-center">
        <Languages className="w-4 h-4 text-gray-400 mr-1 hidden sm:block" aria-hidden="true" />
        <button 
          onClick={() => changeLanguage('en')} 
          tabIndex={1}
          aria-label="Switch language to English"
          aria-pressed={i18n.language === 'en'}
          className={`px-3 py-2 text-sm font-bold rounded-xl transition-all ${i18n.language === 'en' ? 'bg-brand-indigo text-white' : 'text-brand-slate hover:bg-gray-100'}`}
        >
          EN
        </button>
        <button 
          onClick={() => changeLanguage('kk')} 
          tabIndex={1}
          aria-label="Switch language to Kazakh"
          aria-pressed={i18n.language === 'kk'}
          className={`px-3 py-2 text-sm font-bold rounded-xl transition-all ${i18n.language === 'kk' ? 'bg-brand-indigo text-white' : 'text-brand-slate hover:bg-gray-100'}`}
        >
          KK
        </button>
        <button 
          onClick={() => changeLanguage('ru')} 
          tabIndex={1}
          aria-label="Switch language to Russian"
          aria-pressed={i18n.language === 'ru'}
          className={`px-3 py-2 text-sm font-bold rounded-xl transition-all ${i18n.language === 'ru' ? 'bg-brand-indigo text-white' : 'text-brand-slate hover:bg-gray-100'}`}
        >
          RU
        </button>
      </div>

      <button 
        onClick={cycleTextSize} 
        tabIndex={1}
        aria-label={`Cycle text size. Current is ${textSize}`}
        className="flex items-center justify-center p-2 rounded-xl text-brand-slate hover:bg-gray-100 transition-all focus:ring-2 focus:ring-brand-indigo"
      >
        <Type className="w-5 h-5" />
      </button>

      <button
        onClick={cycleLearningProfile}
        tabIndex={1}
        aria-label={`Learning Profile: ${learningProfile}`}
        className="flex items-center justify-center p-2 rounded-xl text-brand-slate hover:bg-gray-100 transition-all focus:ring-2 focus:ring-brand-indigo relative group"
      >
        <Brain className={`w-5 h-5 ${learningProfile !== 'none' ? 'text-indigo-500' : 'text-gray-400'}`} />
        <span className="absolute top-10 whitespace-nowrap bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
          Mode: {learningProfile}
        </span>
      </button>

      <button 
        onClick={toggleHighContrast} 
        tabIndex={1}
        aria-pressed={highContrast}
        aria-label={highContrast ? "Disable High Contrast mode" : "Enable High Contrast mode"}
        className={`flex items-center justify-center p-2 rounded-xl transition-all focus:ring-2 focus:ring-brand-indigo ${highContrast ? 'bg-yellow-400 text-black' : 'text-brand-slate hover:bg-gray-100'}`}
      >
        <Contrast className="w-5 h-5" />
      </button>
    </div>
  );
};

export default A11yToolbar;
