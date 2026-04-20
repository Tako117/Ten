import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Bot, User, Loader2, BookOpen, MessageSquare } from 'lucide-react';
import { API_BASE } from '../config';

const AiTutorPanel = ({ lessonText }) => {
  const [summary, setSummary] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [questionInput, setQuestionInput] = useState('');
  const chatEndRef = useRef(null);

  // Auto-Summary Effect
  useEffect(() => {
    if (lessonText && lessonText.trim().length > 10) {
      handleGenerateSummary();
    }
  }, [lessonText]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    setChatHistory([]);
    try {
      console.log("📡 [FRONTEND] Sending fetch to:", 'http://localhost:5000/api/ai-tutor');
      const response = await fetch(`http://localhost:5000/api/ai-tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonText }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch summary');
      
      setSummary(data.result);
    } catch (error) {
      console.error("❌ [FRONTEND] Fetch Error:", error);
      console.error('Summary fetch error:', error);
      setSummary('⚠️ *Failed to generate lesson summary. Please try again later.*');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!questionInput.trim() || isTyping) return;

    const userMsg = { role: 'user', text: questionInput };
    setChatHistory((prev) => [...prev, userMsg]);
    setQuestionInput('');
    setIsTyping(true);

    try {
      console.log("📡 [FRONTEND] Sending fetch to:", 'http://localhost:5000/api/ai-tutor');
      const response = await fetch(`http://localhost:5000/api/ai-tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonText, userQuestion: userMsg.text }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to get answer');

      setChatHistory((prev) => [...prev, { role: 'tutor', text: data.result }]);
    } catch (error) {
      console.error("❌ [FRONTEND] Fetch Error:", error);
      console.error('Q&A error:', error);
      setChatHistory((prev) => [...prev, { role: 'tutor', text: "I'm sorry, I'm having trouble connecting to my knowledge base right now. Could you please try asking again?" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="mt-8 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-400" />
          <h3 className="font-bold text-slate-100 uppercase tracking-wider text-xs">AI Lesson Tutor</h3>
        </div>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {/* Educational Summary Section */}
        <section className="relative">
          <div className="flex items-center gap-2 mb-4 text-indigo-300 font-bold text-sm">
            <BookOpen className="w-4 h-4" />
            <h4>Lesson Overview</h4>
          </div>
          
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-3/4"></div>
              <div className="h-4 bg-slate-800 rounded w-full"></div>
              <div className="h-4 bg-slate-800 rounded w-5/6"></div>
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {summary || "Waiting for lesson content to generate a summary..."}
              </ReactMarkdown>
            </div>
          )}
        </section>

        {/* Chat History Section */}
        <section className="pt-6 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-4 text-emerald-400 font-bold text-sm">
            <MessageSquare className="w-4 h-4" />
            <h4>Student Q&A</h4>
          </div>

          <div className="space-y-4">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`mt-1 p-1.5 rounded-lg shrink-0 ${msg.role === 'user' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-100 rounded-tr-none' 
                      : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
                  }`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex gap-3">
                  <div className="mt-1 p-1.5 rounded-lg shrink-0 bg-emerald-500/20 text-emerald-400">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </section>
      </div>

      {/* Input Footer */}
      <form onSubmit={handleAskQuestion} className="p-4 bg-slate-950/50 border-t border-slate-800">
        <div className="relative flex items-center">
          <input
            type="text"
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            disabled={isTyping}
            placeholder="Ask your tutor anything about the lesson..."
            className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-3 pr-14 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!questionInput.trim() || isTyping}
            className="absolute right-2 p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-lg"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default AiTutorPanel;
