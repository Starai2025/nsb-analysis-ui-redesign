import React from 'react';

export default function TopBar() {
  return (
    <header className="w-full h-16 sticky top-0 z-40 bg-white/80 backdrop-blur-md flex justify-between items-center px-8 border-b border-slate-200/50 ml-64">
      <div className="flex items-center gap-8">
        <h1 className="text-xl font-extrabold tracking-tighter text-on-surface font-headline">Never Sign Blind</h1>
      </div>
      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="text-xs font-bold text-on-surface">AI Ready</span>
      </div>
    </header>
  );
}
