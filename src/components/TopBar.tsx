import React from 'react';
import { useLocation } from 'react-router-dom';

const crumbs: Record<string, string> = {
  '/intake': 'New Analysis',
  '/summary': 'Decision Summary',
  '/report': 'Report',
  '/sources': 'Sources',
  '/draft': 'Draft Response',
};

export default function TopBar() {
  const location = useLocation();
  const crumb = crumbs[location.pathname] ?? 'New Analysis';

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200/70 bg-white/90 px-8 shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-4">
        <h1 className="font-headline text-xl font-extrabold tracking-tight text-on-surface">Never Sign Blind</h1>
        <div className="h-5 w-px bg-slate-200" />
        <div className="text-sm font-medium text-on-surface-variant">{crumb}</div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden xl:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-[#e67e22]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Project Alpha</span>
        </div>
        <div className="hidden lg:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-emerald-700">AI Ready</span>
        </div>
      </div>
    </header>
  );
}
