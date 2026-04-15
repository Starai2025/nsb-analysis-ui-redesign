import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FileUp, 
  Gavel, 
  FileText, 
  MessageSquareQuote, 
  PenLine, 
  Building2
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Sidebar() {
  const navItems = [
    { icon: FileUp, label: 'New Analysis', to: '/intake' },
    { icon: Gavel, label: 'Decision Summary', to: '/summary' },
    { icon: FileText, label: 'Report', to: '/report' },
    { icon: MessageSquareQuote, label: 'Sources', to: '/sources' },
    { icon: PenLine, label: 'Draft Response', to: '/draft' },
  ];

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col overflow-hidden border-r border-white/10 bg-[#0f2044] px-4 py-6 text-white shadow-2xl">
      <div className="mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e67e22] text-white shadow-lg shadow-[#e67e22]/20">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="block text-sm font-bold text-white">Never Sign Blind</h2>
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Change Analysis Platform</p>
          </div>
        </div>
      </div>

      <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/28">
        Analysis
      </div>

      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "group flex items-center gap-3 rounded-lg border-l-2 px-3 py-3 text-sm font-semibold transition-all",
              isActive 
                ? "border-[#e67e22] bg-white/8 text-white shadow-lg shadow-black/10" 
                : "border-transparent text-white/55 hover:bg-white/5 hover:text-white"
            )}
          >
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md transition-all",
              "bg-white/6 text-white/50 group-hover:bg-white/10 group-hover:text-white",
            )}>
              <item.icon size={16} />
            </div>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 rounded-xl border border-white/8 bg-white/5 p-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Active Project</div>
        <div className="mt-2 text-sm font-bold text-white">Project Alpha</div>
        <div className="mt-1 text-xs text-white/45">Contractor: BuildCorp</div>
      </div>
    </aside>
  );
}
