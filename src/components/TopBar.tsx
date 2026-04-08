import React from 'react';
import { Bell, Settings, Plus } from 'lucide-react';

export default function TopBar() {
  return (
    <header className="w-full h-16 sticky top-0 z-40 bg-white/80 backdrop-blur-md flex justify-between items-center px-8 border-b border-slate-200/50 ml-64">
      <div className="flex items-center gap-8">
        <h1 className="text-xl font-extrabold tracking-tighter text-on-surface font-headline">Never Sign Blind</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-on-surface">Status: Active</span>
        </div>
        <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-dim transition-colors flex items-center gap-2">
          <Plus size={16} />
          New Project
        </button>
        <div className="flex items-center gap-2">
          <button className="p-2 text-on-surface-variant hover:bg-slate-50 rounded-full transition-colors">
            <Bell size={20} />
          </button>
          <button className="p-2 text-on-surface-variant hover:bg-slate-50 rounded-full transition-colors">
            <Settings size={20} />
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden ml-2 bg-slate-200 flex items-center justify-center border border-slate-300">
            <img 
              alt="User profile" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBpbmf7AmKYtFD5OAt20_73qeJIr8tbYCC1AF9wEz92YLoo1jtjE6HnkXlwM5yXOnGdX7bgIQYAy4ky4U8Z3vE0C2uxAyhyjm3WHIouqas0ET35iYZbvZlsM-xO_VHpe-BN0VSOvUzBNcuXr7oXNCsF4UtSjne5cx44qhhR5ndXuiUXNI0_tP1Kgw99TnIsAHYgIcJUPQsRmqIbZAJ5h3Kmp1mEQJNFcE5lNd5qwd4plpEZsIEU2xGy1-4LQ3pucfjGumfprRkGUpw"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
