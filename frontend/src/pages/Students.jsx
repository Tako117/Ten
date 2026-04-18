import React, { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import AvatarPlaceholder from '../components/AvatarPlaceholder';

const Students = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const sampleLesson = "Welcome to your Live Lesson. I am your avatar translating into ASL while subtitles provide text.";

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 flex flex-col items-center">
      <div className="text-center mb-12 max-w-2xl">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">Learn Your Way</h1>
        <p className="text-lg text-slate-500 font-medium">Teñ's adaptive Live Lesson translates your study materials into the format you learn best with. Try the ASL module below.</p>
      </div>

      {/* Interactive Avatar Demo */}
      <div className="w-full max-w-4xl bg-white p-4 rounded-3xl border border-slate-200 shadow-xl flex flex-col group">
        <div className="h-[400px] w-full bg-slate-50 rounded-2xl overflow-hidden relative">
          <AvatarPlaceholder textToSign={isPlaying ? sampleLesson : ""} />
          
          {!isPlaying && (
             <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity">
               <div className="bg-white/90 text-slate-800 font-bold px-6 py-3 rounded-full flex items-center gap-2 shadow-lg">
                 Hover to engage
               </div>
             </div>
          )}
        </div>
        
        <div className="mt-4 px-4 py-3 bg-indigo-50 rounded-2xl flex items-center justify-between border border-indigo-100/50">
           <p className="text-indigo-900 font-medium text-sm md:text-base">"{sampleLesson}"</p>
           <button 
             onClick={() => setIsPlaying(!isPlaying)}
             className="w-10 h-10 shrink-0 bg-indigo-500 text-white rounded-xl flex flex-col items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all"
           >
             {isPlaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 ml-1" />}
           </button>
        </div>
      </div>
    </div>
  );
};

export default Students;
// Triggering HMR
