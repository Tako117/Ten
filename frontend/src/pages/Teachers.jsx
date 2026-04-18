import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle, Loader2, ArrowRight } from 'lucide-react';

const Teachers = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState('IDLE'); // IDLE, PROCESSING, DONE
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    triggerMockUpload();
  };
  
  const triggerMockUpload = () => {
    setUploadState('PROCESSING');
    setTimeout(() => {
      setUploadState('DONE');
    }, 2500);
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row items-center gap-16">
      
      {/* Left Copy */}
      <div className="w-full lg:w-1/2 flex flex-col items-start">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold uppercase tracking-wide mb-6">
          For Educators
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-6">Drop a Lesson. Generate a Curriculum.</h1>
        <p className="text-lg text-slate-500 mb-8 max-w-lg leading-relaxed">
          Upload any text or document. Teñ's adaptation pipeline automatically fragments tests for ADHD, simplifies language for Dyslexia, and queues perfectly timed ASL signing logic—instantly.
        </p>
        <button className="flex items-center gap-2 text-indigo-600 font-bold hover:gap-3 transition-all">
          Explore Enterprise features <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Right Mock Upload */}
      <div className="w-full lg:w-1/2 p-4 bg-white border border-slate-100 shadow-2xl rounded-3xl relative overflow-hidden">
        
        {uploadState === 'DONE' ? (
           <div className="p-10 flex flex-col items-center justify-center text-center h-[350px]">
             <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10" />
             </div>
             <h3 className="text-xl font-bold text-slate-800 mb-2">Curriculum Adapted!</h3>
             <p className="text-sm text-slate-500 mb-6">This lesson is now available in ADHD, Dyslexia, and Sign configurations.</p>
             <button onClick={() => setUploadState('IDLE')} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 font-bold text-slate-600 rounded-xl transition-colors">
               Upload another
             </button>
           </div>
        ) : (
          <form 
            className={`w-full h-[350px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all bg-slate-50
              ${dragActive ? 'border-indigo-500 bg-indigo-50/50 scale-[0.98]' : 'border-slate-300'}
            `}
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          >
            {uploadState === 'PROCESSING' ? (
              <div className="flex flex-col items-center gap-4 text-indigo-500">
                <Loader2 className="w-10 h-10 animate-spin" />
                <p className="font-bold text-sm tracking-wide">Adapting via Teñ Engine...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-slate-400 cursor-pointer pointer-events-none">
                <UploadCloud className={`w-12 h-12 ${dragActive ? 'text-indigo-500' : ''}`} />
                <h3 className="font-bold text-slate-700">Drag a lesson document here</h3>
                <p className="text-xs text-center max-w-xs px-4">Supported: PDFs, Textbooks, Word Docs. Simulation starts immediately.</p>
              </div>
            )}
            
            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={triggerMockUpload} disabled={uploadState==='PROCESSING'} />
          </form>
        )}
      </div>

    </div>
  );
};

export default Teachers;
