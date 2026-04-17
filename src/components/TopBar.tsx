import React from 'react';
import { useLocation } from 'react-router-dom';
import { useCurrentThreadSummary } from '../lib/useCurrentThreadSummary';

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
  const summary = useCurrentThreadSummary(location.pathname);

  const projectChip = summary.hasThread && summary.projectName
    ? summary.projectName
    : 'No active project';
  const changeChip = summary.hasThread && summary.changeRequestId
    ? summary.changeRequestId
    : 'No change request';
  const citationChip = summary.citationCount > 0
    ? `${summary.citationCount} citation${summary.citationCount === 1 ? '' : 's'}`
    : 'No citations yet';

  return (
    <header className="sticky top-0 z-40 flex h-[58px] w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-8 shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="font-headline text-[16px] font-black uppercase tracking-[0.05em] text-on-surface">Never Sign Blind™</h1>
        <div className="h-5 w-px bg-slate-200" />
        <div id="crumb" className="text-[13px] font-medium text-slate-400">{crumb}</div>
      </div>

      <div className="flex items-center gap-3">
        <div id="topbarProjectChip" className="hidden xl:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-[#e67e22]" />
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{projectChip}</span>
        </div>
        <div id="topbarChangeChip" className="hidden xl:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-[#e67e22]" />
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{changeChip}</span>
        </div>
        <div id="topbarCitationChip" className="hidden xl:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-[#e67e22]" />
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{citationChip}</span>
        </div>
        <div className="hidden lg:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-700">AI Ready</span>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#254580] text-[12px] font-black uppercase text-white">
          SA
        </div>
      </div>
    </header>
  );
}
