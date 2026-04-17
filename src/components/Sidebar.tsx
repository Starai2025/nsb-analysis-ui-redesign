import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  FileUp, 
  Gavel, 
  FileText, 
  MessageSquareQuote, 
  PenLine
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useCurrentThreadSummary } from '../lib/useCurrentThreadSummary';
import { clearCurrentThread } from '../lib/db';

export default function Sidebar() {
  const location = useLocation();
  const summary = useCurrentThreadSummary(location.pathname);
  const navItems = [
    { icon: FileUp, label: 'New Analysis', to: '/intake' },
    { icon: Gavel, label: 'Decision Summary', to: '/summary' },
    { icon: FileText, label: 'Report', to: '/report' },
    { icon: MessageSquareQuote, label: 'Sources', to: '/sources' },
    { icon: PenLine, label: 'Draft Response', to: '/draft' },
  ];

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[232px] flex-col overflow-hidden border-r border-white/10 bg-[#11244d] text-white shadow-2xl">
      <div className="border-b border-white/8 px-5 py-6">
        <div className="text-[16px] font-black uppercase tracking-[0.07em] text-white">
          Never Sign<span className="text-[#e67e22]">™</span>
        </div>
        <p className="mt-2 text-[9px] uppercase tracking-[0.26em] text-white/35">Change Analysis Platform</p>
      </div>

      <div className="border-b border-white/8 px-5 py-5">
        <div className="text-[9px] font-bold uppercase tracking-[0.28em] text-white/30">Active Project</div>
        <div id="sidebarProjectName" className="mt-3 text-[13px] font-bold leading-5 text-white">
          {summary.hasThread && summary.projectName ? summary.projectName : 'No active analysis'}
        </div>
        <div className="mt-1 text-[11px] leading-5 text-white/38">
          {summary.hasThread && summary.contractNumber
            ? summary.contractNumber
            : 'Start a new contract review'}
        </div>
      </div>

      <div className="px-5 pt-4 text-[9px] font-bold uppercase tracking-[0.28em] text-white/24">
        Analysis
      </div>

      <nav className="flex-1 space-y-1 px-0 pt-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => {
              if (item.to === '/intake') {
                void clearCurrentThread();
              }
            }}
            className={({ isActive }) => cn(
              "ni group mx-0 flex items-center gap-3 border-l-[3px] px-5 py-3.5 text-[12px] font-semibold transition-all",
              isActive 
                ? "border-[#e67e22] bg-white/8 text-white" 
                : "border-transparent text-white/55 hover:bg-white/5 hover:text-white"
            )}
          >
            <div className={cn(
              "flex h-5 w-5 items-center justify-center rounded-sm border border-white/8 bg-white/6 text-white/50 transition-all",
              "group-hover:border-white/12 group-hover:bg-white/10 group-hover:text-white",
            )}>
              <item.icon size={12} />
            </div>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/8 px-5 py-5">
        <div className="text-[11px] leading-6 text-white/20">
          Never Sign Blind™
        </div>
        <div className="text-[11px] leading-6 text-white/20">
          Confidential · AI Analysis
        </div>
      </div>
    </aside>
  );
}
