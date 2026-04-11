import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Trash2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { loadCurrentThread } from '../lib/db';

interface ChatMessage {
  role:         'user' | 'assistant';
  text:         string;
  sourceChunks?: SourceChunk[];
  error?:       boolean;
}

interface SourceChunk {
  id:          string;
  pageNumber?: number;
  text:        string;
  sourceId:    string;
}

function buildSuggestions(analysis: any): string[] {
  const base = ['What are the payment terms?', 'When is the notice deadline?'];
  if (analysis?.keyRisks?.[0]?.title) {
    base.push(`What does the contract say about ${analysis.keyRisks[0].title.toLowerCase()}?`);
  }
  return base.slice(0, 3);
}

export default function AskTheContract() {
  const [isOpen,      setIsOpen]      = useState(false);
  const [messages,    setMessages]    = useState<ChatMessage[]>([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCurrentThread().then(thread => {
      if (thread?.analysis) {
        setHasAnalysis(true);
        setSuggestions(buildSuggestions(thread.analysis));
      }
    });
  }, []);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: question };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const history = nextMessages
        .slice(-6)
        .map(m => ({ role: m.role as 'user' | 'assistant', text: m.text }));

      const res  = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ question, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat failed.');

      setMessages(prev => [...prev, {
        role:         'assistant',
        text:         data.answer,
        sourceChunks: data.sourceChunks ?? [],
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role:  'assistant',
        text:  err.message ?? 'Something went wrong. Please try again.',
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const showSuggestions = hasAnalysis && messages.length === 0;
  const showEmpty       = !hasAnalysis && messages.length === 0;

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden mb-4 flex flex-col"
            style={{ maxHeight: '560px' }}
          >
            {/* Header */}
            <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-3 shrink-0">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold leading-none">Ask the Contract</h4>
                <p className="text-[10px] text-white/70 mt-0.5">Powered by uploaded documents</p>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button onClick={() => setMessages([])} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Clear chat">
                    <Trash2 size={14} />
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 min-h-0">
              {showEmpty && (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                    <Bot size={22} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-on-surface">No contract loaded</p>
                  <p className="text-xs text-on-surface-variant max-w-[220px]">
                    Upload and analyze a contract on the Intake page to enable Q&A.
                  </p>
                </div>
              )}

              {showSuggestions && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Suggested questions</p>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="w-full text-left text-xs text-on-surface bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-primary hover:text-primary transition-all flex items-center gap-2 group"
                    >
                      <ChevronRight size={12} className="text-slate-300 group-hover:text-primary shrink-0" />
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot size={13} className="text-primary" />
                    </div>
                  )}
                  <div className="max-w-[85%] space-y-2">
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-white rounded-tr-none'
                        : msg.error
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 rounded-tl-none'
                          : 'bg-white text-on-surface border border-slate-200 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                    {msg.sourceChunks && msg.sourceChunks.length > 0 && (
                      <div className="space-y-1.5">
                        {msg.sourceChunks.slice(0, 2).map((chunk, ci) => (
                          <div key={ci} className="bg-white border border-slate-100 rounded-xl px-3 py-2">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Page {chunk.pageNumber ?? '?'}</p>
                            <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 font-mono">{chunk.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                      <User size={13} className="text-white" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot size={13} className="text-primary" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3">
                    <div className="flex items-center gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3.5 bg-white border-t border-slate-100 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  disabled={!hasAnalysis || loading}
                  className="w-full bg-slate-100 border-none rounded-xl py-3 px-4 pr-12 text-sm focus:ring-2 focus:ring-primary placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed outline-none"
                  placeholder={hasAnalysis ? 'Ask about the contract…' : 'Upload a contract first'}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || !hasAnalysis || loading}
                  className="absolute right-2 top-1.5 p-1.5 bg-primary text-white rounded-lg hover:bg-primary-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white shadow-lg hover:shadow-xl pl-4 pr-6 py-3 rounded-full border border-slate-200 flex items-center gap-3 text-on-surface hover:scale-105 transition-all"
      >
        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg">
          <Bot size={18} />
        </div>
        <span className="text-sm font-bold">Ask the Contract</span>
      </button>
    </div>
  );
}
