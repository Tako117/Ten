import React, { useState, useEffect } from 'react';
import { Activity, Clock, CheckCircle2, MoreHorizontal } from 'lucide-react';

const Parents = () => {
  const [learningScore, setLearningScore] = useState(0);

  // Animate the bar chart on mount
  useEffect(() => {
    const t = setTimeout(() => setLearningScore(85), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 flex flex-col items-center">
      <div className="text-center mb-16 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wide mb-6">
          For Families
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-6">Track Progress. Eliminate Barriers.</h1>
        <p className="text-lg text-slate-500 font-medium">Get real-time insights into how your child interacts with adapted curriculum and celebrate milestones together.</p>
      </div>

      {/* Progress Dashboard Mockup */}
      <div className="w-full max-w-5xl rounded-3xl bg-white border border-slate-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden grid grid-cols-1 md:grid-cols-3">
        
        {/* Metric 1 */}
        <div className="p-8 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col justify-between">
          <div>
             <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500"><Clock className="w-5 h-5"/></div>
                <MoreHorizontal className="w-5 h-5 text-slate-300" />
             </div>
             <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Focus Time</p>
             <h2 className="text-4xl font-black text-slate-800">12<span className="text-lg text-slate-400 font-medium">h</span> 45<span className="text-lg text-slate-400 font-medium">m</span></h2>
          </div>
          <p className="text-sm text-emerald-500 font-bold mt-6">+14% vs last week</p>
        </div>

        {/* Metric 2 (Animated Bar) */}
        <div className="p-8 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col justify-between">
          <div>
             <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500"><Activity className="w-5 h-5"/></div>
                <MoreHorizontal className="w-5 h-5 text-slate-300" />
             </div>
             <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Comprehension Score</p>
             <h2 className="text-4xl font-black text-slate-800">{learningScore}%</h2>
          </div>
          
          <div className="w-full h-2 bg-slate-100 rounded-full mt-6 overflow-hidden">
             <div className="h-full bg-gradient-to-r from-rose-400 to-orange-400 rounded-full transition-all duration-1000 ease-out delay-150" style={{ width: `${learningScore}%` }}></div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-8 flex flex-col justify-between bg-slate-50/50">
          <div>
             <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500"><CheckCircle2 className="w-5 h-5"/></div>
                <MoreHorizontal className="w-5 h-5 text-slate-300" />
             </div>
             <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Recent Milestones</p>
             <ul className="space-y-3">
               <li className="flex gap-2 text-sm text-slate-600 font-medium"><CheckCircle2 className="w-5 h-5 text-emerald-400" /> Finished Biology Chapter 4</li>
               <li className="flex gap-2 text-sm text-slate-600 font-medium"><CheckCircle2 className="w-5 h-5 text-emerald-400" /> Mastered 50 new ASL signs</li>
             </ul>
          </div>
          <button className="w-full py-3 bg-white border border-slate-200 font-bold text-slate-700 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all mt-6 shadow-sm">
            View Full Report
          </button>
        </div>

      </div>
    </div>
  );
};

export default Parents;
