import React, { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AskTheContract() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', content: "The contract states in section 12.1.2 that all change orders must be signed by the architect prior to commencement. Would you like me to check the Architect's sign-off status for CR-4052?", snippet: '"12.1.2: ...no work shall commence without written authorization via Change Order or CCD signed by the Architect and Owner..."'}
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', content: input }]);
    setInput('');
    // Simulate bot response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'bot', content: "I'm analyzing the March 12 field report. It appears the soil testing delays were attributed to unforeseen sub-surface bedrock conditions, which typically falls under the Owner's responsibility per Section 4.3." }]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden mb-4"
          >
            <div className="bg-primary text-white px-6 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold">Ask the Contract</h4>
                <p className="text-[10px] text-white/70 font-medium">AI Analysis powered by Project Documents</p>
              </div>
            </div>
            
            <div className="h-[400px] overflow-y-auto p-6 space-y-4 bg-slate-50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'bot' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot size={16} className="text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white rounded-tr-none' 
                      : 'bg-white text-on-surface border border-slate-200 rounded-tl-none'
                  }`}>
                    {msg.content}
                    {msg.snippet && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Supporting Snippet</p>
                        <div className="bg-slate-50 p-2 rounded text-[11px] text-on-surface-variant font-mono">
                          {msg.snippet}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-white border-t border-slate-100">
              <div className="relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  className="w-full bg-slate-100 border-none rounded-xl py-3 px-4 pr-12 text-sm focus:ring-2 focus:ring-primary placeholder:text-slate-400" 
                  placeholder="Type your question..." 
                />
                <button 
                  onClick={handleSend}
                  className="absolute right-2 top-1.5 p-1.5 bg-primary text-white rounded-lg hover:bg-primary-dim transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white precise-shadow hover:shadow-xl pl-4 pr-6 py-3 rounded-full border border-slate-200 flex items-center gap-3 text-on-surface hover:scale-105 transition-all group"
      >
        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg">
          <Bot size={18} />
        </div>
        <span className="text-sm font-bold">Ask the Contract</span>
      </button>
    </div>
  );
}
