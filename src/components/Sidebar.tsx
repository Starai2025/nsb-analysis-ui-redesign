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
    <aside className="h-screen w-64 fixed left-0 top-0 bg-white border-r border-slate-200 flex flex-col py-6 px-4 z-50">
      <div className="mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-on-surface block">Never Sign Blind</h2>
            <p className="text-[10px] text-on-surface-variant tracking-wider uppercase">Change Order Intelligence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium",
              isActive 
                ? "text-primary bg-primary/5 font-bold translate-x-1" 
                : "text-on-surface-variant hover:text-on-surface hover:bg-slate-50"
            )}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>


    </aside>
  );
}
