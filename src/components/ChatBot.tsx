'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Send, X, Bot, User, Database, Plus, Menu, ArrowLeft, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type ChatMessage = { role: 'user' | 'bot'; text: string; data?: any; query?: string; id?: string };
type ChatSession = { id: string; title: string; updatedAt: number; messages: ChatMessage[] };

export function ChatBot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isUserAtBottom = useRef(true);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    // Consider "at bottom" if within 50px
    isUserAtBottom.current = scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  useEffect(() => {
    if (isUserAtBottom.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Load sessions from local storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('splitsense_chat_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id);
          setMessages(parsed[0].messages);
        }
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
  }, []);

  // Save sessions when messages change
  useEffect(() => {
    if (messages.length === 0) return;
    
    setSessions(prev => {
      const existingIdx = prev.findIndex(s => s.id === currentSessionId);
      let updated = [...prev];
      
      if (existingIdx >= 0) {
        updated[existingIdx] = { ...updated[existingIdx], messages, updatedAt: Date.now() };
      } else {
        const newId = currentSessionId || Date.now().toString();
        if (!currentSessionId) setCurrentSessionId(newId);
        const title = messages[0]?.text.slice(0, 30) + (messages[0]?.text.length > 30 ? '...' : '');
        updated.unshift({ id: newId, title, messages, updatedAt: Date.now() });
      }
      
      updated.sort((a, b) => b.updatedAt - a.updatedAt);
      updated = updated.slice(0, 20); // Keep max 20
      
      localStorage.setItem('splitsense_chat_sessions', JSON.stringify(updated));
      return updated;
    });
  }, [messages, currentSessionId]);

  const handleNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setShowSidebar(false);
  };

  const handleSelectChat = (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setShowSidebar(false);
  };

  // Calculate transform-origin from the dock icon's exact position
  const updateOrigin = useCallback(() => {
    const icon = document.getElementById('chat-dock-icon');
    const panel = panelRef.current;
    if (!icon || !panel) return;

    const iconRect = icon.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();

    // Icon center relative to the panel's top-left
    const originX = iconRect.left + iconRect.width / 2 - panelRect.left;
    const originY = iconRect.top + iconRect.height / 2 - panelRect.top;

    panel.style.transformOrigin = `${originX}px ${originY}px`;
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    const messageId = Date.now().toString() + Math.random().toString(36).slice(2);
    setMessages(prev => [...prev, { role: 'user', text: userMessage, id: messageId }]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-20).map(m => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.text
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage, history }),
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: data.answer || 'Here is the data I found:', 
        data: data.data,
        query: data.query,
        id: Date.now().toString() + Math.random().toString(36).slice(2)
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: `Error: ${err instanceof Error ? err.message : 'Something went wrong'}`,
        id: Date.now().toString() + Math.random().toString(36).slice(2)
      }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    globalThis.addEventListener('toggle-chat', handleToggle);
    return () => globalThis.removeEventListener('toggle-chat', handleToggle);
  }, []);

  // Toggle body class for layout shift — synchronized with chat slide
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('chat-open');
    } else {
      document.body.classList.remove('chat-open');
    }
    return () => {
      document.body.classList.remove('chat-open');
    };
  }, [isOpen]);

  // Recalculate origin on resize
  useEffect(() => {
    updateOrigin();
    window.addEventListener('resize', updateOrigin);
    return () => window.removeEventListener('resize', updateOrigin);
  }, [updateOrigin]);

  if (pathname === '/login') return null;

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.button 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            aria-label="Close Chat"
            className="fixed inset-0 w-full h-full bg-black/40 backdrop-blur-sm z-[60] lg:hidden cursor-default"
            onClick={() => setIsOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOpen(false);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Chat Panel — macOS dock launch animation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }}
            transition={{ type: 'tween', duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className={`
              fixed bottom-0 right-0
              lg:bottom-4 lg:right-4
              z-[70]
              w-full lg:w-[calc(33.333vw-1rem)]
              h-[100dvh] lg:h-[calc(100dvh-2rem)]
              bg-slate-950/80 backdrop-blur-3xl
              lg:border border-white/[0.08]
              lg:rounded-[1.5rem]
              flex flex-col
              shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)]
              overflow-hidden
            `}
          >
            
        {/* Top gradient mask to fade out text */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-slate-950 via-slate-950/80 to-transparent z-20 pointer-events-none rounded-t-[1.5rem]" />

        {/* Floating Top Elements */}
        <div className="absolute top-4 left-4 right-4 z-30 pointer-events-none flex justify-between items-start">
          {/* Left: Menu Pill */}
          <button onClick={() => setShowSidebar(!showSidebar)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] ring-1 ring-white/5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors pointer-events-auto">
            {showSidebar ? <ArrowLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          {/* Center: Title Pill */}
          <div className="flex items-center gap-2.5 bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] ring-1 ring-white/5 pr-4 pl-1.5 py-1.5 rounded-full pointer-events-auto">
            <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center relative shrink-0">
              <div className="absolute inset-0 rounded-full border border-violet-400/50 animate-ping opacity-20" />
              <Bot className="w-4 h-4 text-violet-400 relative z-10" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100 tracking-wide whitespace-nowrap">Audit AI</h3>
          </div>

          {/* Right: Close Pill */}
          <button onClick={() => setIsOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] ring-1 ring-white/5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors pointer-events-auto">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar overlay for chat history */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } }}
              transition={{ type: 'tween', duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-x-0 top-0 bottom-0 bg-slate-950 z-40 flex flex-col overflow-hidden rounded-t-[1.5rem]"
            >
              {/* Sidebar header */}
              <div className="flex items-center justify-between p-4 pt-5 border-b border-white/5">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Chat History</h4>
                <button 
                  onClick={() => setShowSidebar(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* New Chat button */}
              <div className="px-4 py-3">
                <button 
                  onClick={handleNewChat}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-sm font-medium hover:from-violet-500 hover:to-cyan-500 transition-all shadow-lg shadow-violet-500/20"
                >
                  <Plus className="w-4 h-4" />
                  New Chat
                </button>
              </div>
              {/* Session list */}
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
                {sessions.map((s, i) => (
                  <motion.button 
                    key={s.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => handleSelectChat(s)}
                    className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all duration-200 ${currentSessionId === s.id ? 'bg-violet-500/20 text-white ring-1 ring-violet-500/30' : 'hover:bg-white/5 text-slate-300'}`}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0 opacity-50" />
                    <div className="truncate text-sm flex-1">{s.title}</div>
                  </motion.button>
                ))}
                {sessions.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-12">No past chats yet</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages Area */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 pt-32 pb-32 space-y-4 bg-transparent relative z-10"
        >
          {messages.length === 0 && (
            <div className="text-center text-slate-500 mt-10">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Ask me anything about your expenses!</p>
              <p className="text-xs mt-1">e.g. &quot;Who owes the most?&quot; or &quot;Total spent in USD&quot;</p>
            </div>
          )}
          
          {messages.map((msg: any) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-violet-500/20 text-violet-400'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl p-3 text-sm ${msg.role === 'user' ? 'bg-cyan-600/20 border border-cyan-500/20 text-cyan-50' : 'bg-slate-800/50 border border-white/5 text-slate-200'}`}>
                {msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900/50 prose-pre:border prose-pre:border-white/10 prose-th:bg-slate-800 prose-td:border-white/10 prose-th:border-white/10">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                    {msg.data && Array.isArray(msg.data) && msg.data.length > 0 && msg.data[0].__isChart === 1 && (
                      <div className="w-full h-64 mt-2 bg-slate-900/50 rounded-xl p-4 border border-white/5">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={msg.data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} angle={-45} textAnchor="end" />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                            <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                            <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}
                
                {msg.query && (
                  <details className="mt-2 pt-2 border-t border-white/10">
                    <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-400 transition-colors">View SQL query</summary>
                    <p className="text-[10px] text-slate-500 font-mono break-all mt-1">{msg.query}</p>
                    {msg.data && (
                      <pre className="text-[10px] text-emerald-400/60 font-mono mt-1 max-h-32 overflow-auto">
                        {JSON.stringify(msg.data, null, 2)}
                      </pre>
                    )}
                  </details>
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 flex gap-1 items-center">
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-20 lg:rounded-b-[1.5rem] overflow-hidden">
          <div className="px-4 pb-6 pt-10 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
            <form onSubmit={handleSubmit} className="flex gap-2 items-center relative bg-slate-800/90 border border-white/10 rounded-full p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-md ring-1 ring-white/5 focus-within:ring-violet-500/50 transition-all pointer-events-auto">
              <button 
                type="button" 
                onClick={handleNewChat} 
                className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors" 
                title="New Chat"
              >
                <Plus className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 bg-transparent px-2 py-2 text-sm text-white focus:outline-none placeholder-slate-500"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-10 h-10 shrink-0 rounded-full bg-violet-600 flex items-center justify-center text-white hover:bg-violet-500 disabled:opacity-50 disabled:hover:bg-violet-600 transition-colors shadow-[0_0_15px_rgba(139,92,246,0.5)]"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}
