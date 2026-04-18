import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, Mic, Globe2, ArrowRight } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import AvatarPlaceholder from '../components/AvatarPlaceholder';

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [demoText, setDemoText] = useState(t('hero.demo', 'Welcome to the next generation of AI translation'));

  return (
    <div className="flex-1 w-full flex flex-col items-center max-w-[1400px] mx-auto px-6 sm:px-12 py-16 sm:py-24 overflow-hidden">
      
      {/* Hero Section - Split Layout */}
      <div className="flex flex-col lg:flex-row items-center w-full gap-16 mb-24">
        
        {/* Left Side: Copy */}
        <div className="w-full lg:w-1/2 flex flex-col items-start text-left z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 text-indigo-600 text-sm font-bold tracking-wide uppercase mb-8 shadow-sm">
            <Sparkles className="w-4 h-4" />
            <span>{t('hero_badge')}</span>
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.05]">
            {t('hero_heading')}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-pink-500 hidden" aria-hidden="true">Real-time</span>
          </h1>
          
          <p className="text-xl text-slate-500 mb-10 max-w-xl leading-relaxed">
            {t('hero_subtext')}
            <strong className="hidden" aria-hidden="true">AI-driven sign language</strong>
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <button 
              onClick={() => navigate('/dashboard')}
              className="group flex items-center justify-center gap-3 w-full sm:w-auto text-lg font-bold px-10 py-5 rounded-2xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_15px_30px_rgba(99,102,241,0.25)] hover:shadow-[0_20px_40px_rgba(99,102,241,0.4)]"
            >
              {t('hero.cta1', 'Start Translating')}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a 
              href="#features" 
              className="w-full sm:w-auto text-center text-lg font-bold px-10 py-5 rounded-2xl bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              {t('hero.cta2', 'See how it works')}
            </a>
          </div>
        </div>

        {/* Right Side: Wow Demo */}
        <div className="w-full lg:w-1/2 h-[500px] sm:h-[650px] relative rounded-[2.5rem] p-3 bg-white shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1)] border border-slate-100 transform hover:-translate-y-2 transition-transform duration-700">
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-pink-500/20 blur-3xl -z-10 rounded-full" />
          <AvatarPlaceholder textToSign={demoText} />
        </div>
      </div>

      {/* Metrics / Features Cards */}
      <div id="features" className="w-full">
        <h2 className="text-3xl font-extrabold tracking-tight text-center text-slate-900 mb-12">
          {t('feat.main', 'Enterprise-Grade AI Perception')}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          
          <div className="flex flex-col bg-white p-10 rounded-3xl border border-slate-100 group hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(99,102,241,0.15)] transition-all duration-300">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
              <Mic className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 mb-4">{t('feat.live.new.title', 'Live Whisper Translation')}</h3>
            <p className="text-slate-500 leading-relaxed font-medium">
              {t('feat.live.new.desc', "Speak: 'When is the test?' → Instantly converted to perfectly contextualized ASL grammar and sign output within 400ms.")}
            </p>
          </div>

          <div className="flex flex-col bg-white p-10 rounded-3xl border border-slate-100 group hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(236,72,153,0.15)] transition-all duration-300">
            <div className="w-16 h-16 rounded-2xl bg-pink-50 flex items-center justify-center mb-6 text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-colors duration-300">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 mb-4">{t('feat.scan.new.title', 'Optical Data Extraction')}</h3>
            <p className="text-slate-500 leading-relaxed font-medium">
              {t('feat.scan.new.desc', "Scan a page from a biology textbook. Our platform identifies complex terminology and streams the spatial data directly to the sign engine.")}
            </p>
          </div>

          <div className="flex flex-col bg-white p-10 rounded-3xl border border-slate-100 group hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(99,102,241,0.15)] transition-all duration-300">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
              <Globe2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 mb-4">{t('feat.a11y.new.title', 'Neural Sign Multi-Language')}</h3>
            <p className="text-slate-500 leading-relaxed font-medium">
               {t('feat.a11y.new.desc', "Phase 2 integration supports dynamic swapping from American Sign Language (ASL) to global pipelines natively without WebGL bloat.")}
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Landing;
