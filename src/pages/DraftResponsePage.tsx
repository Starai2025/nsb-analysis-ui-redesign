import React, { useState, useEffect, useRef } from 'react';
import {
  Save, Copy, FileText, ShieldAlert, TrendingUp, Clock,
  Zap, CheckCircle2, AlertTriangle, Info, Sparkles,
  Loader2, RefreshCw, RotateCcw, Download, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { loadCurrentThread, saveCurrentThread } from '../lib/db';
import { loadCurrentWorkspaceSnapshot, loadCurrentWorkspaceThreadView } from '../lib/projectStore';
import NoAnalysis from '../components/NoAnalysis';
import { AnalysisResult, ClauseRecord, Draft, DraftStatus, DraftStrategy, ProjectData } from '../types';
import { cn } from '../lib/utils';
import { buildRelevantDraftClauses, getClauseShortSourceRef } from '../lib/clauseSurface';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusColor(v: string) {
  const map: Record<string, string> = {
    'Yes': 'bg-rose-100 text-rose-700 border-rose-200',
    'Likely': 'bg-amber-100 text-amber-700 border-amber-200',
    'Possible': 'bg-amber-100 text-amber-700 border-amber-200',
    'No': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Not Enough Information': 'bg-slate-100 text-slate-600 border-slate-200',
    'Low': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Moderate': 'bg-amber-100 text-amber-700 border-amber-200',
    'High': 'bg-rose-100 text-rose-700 border-rose-200',
    'Critical': 'bg-rose-200 text-rose-900 border-rose-300',
  };
  return map[v] ?? 'bg-slate-100 text-slate-600 border-slate-200';
}

async function exportDraftPDF(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
  const pdf    = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageW  = pdf.internal.pageSize.getWidth();
  const pageH  = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const cW     = pageW - margin * 2;
  const imgH   = (canvas.height * cW) / canvas.width;
  const useH   = pageH - margin * 2;
  let rem = imgH, sy = 0, first = true;
  while (rem > 0) {
    if (!first) pdf.addPage();
    first = false;
    const sh = Math.min(useH, rem);
    const sc = document.createElement('canvas');
    sc.width = canvas.width;
    sc.height = Math.ceil(sh * (canvas.height / imgH));
    sc.getContext('2d')!.drawImage(canvas, 0, Math.ceil(sy * (canvas.height / imgH)), canvas.width, sc.height, 0, 0, canvas.width, sc.height);
    pdf.addImage(sc.toDataURL('image/png'), 'PNG', margin, margin, cW, sh);
    pdf.setFontSize(7); pdf.setTextColor(160, 160, 160);
    pdf.text('Never Sign Blind — Confidential — Draft Response', pageW / 2, pageH - 12, { align: 'center' });
    sy += sh; rem -= sh;
  }
  pdf.save(filename);
}

// ---------------------------------------------------------------------------
// Strategy Tab
// ---------------------------------------------------------------------------

function StrategyTab({ s, projectData }: { s: DraftStrategy; projectData: ProjectData | null }) {
  return (
    <div id="draftStrategyPanel" className="grid grid-cols-12 gap-8">
      <div className="col-span-8 space-y-6">

        {/* What Changed */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface">1. What Changed</h3>
          </div>
          <div className="p-6">
            <p className="text-sm text-on-surface leading-relaxed">{s.whatChanged}</p>
          </div>
        </section>

        {/* Arcadis Position */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface">2. Current Position</h3>
          </div>
          <div className="p-6">
            <p className="text-sm text-on-surface leading-relaxed">{s.arcadisPosition}</p>
          </div>
        </section>

        {/* Critical Path */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface">3. Critical Path Impact</h3>
            <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${statusColor(s.criticalPathImpact)}`}>
              {s.criticalPathImpact}
            </span>
          </div>
          <div className="p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
              <TrendingUp size={18} />
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">{s.recommendedPath}</p>
          </div>
        </section>

        {/* Schedule Risk */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface">4. Schedule Delay Risk</h3>
            <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${statusColor(s.scheduleDelayRisk)}`}>
              {s.scheduleDelayRisk}
            </span>
          </div>
          <div className="p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
              <Clock size={18} />
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">{s.commercialContext}</p>
          </div>
        </section>

        {/* Mitigation */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface">5. Mitigation Strategy</h3>
          </div>
          <div className="p-6 space-y-4">
            {s.mitigationSteps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Zap size={14} />
                </div>
                <p className="text-sm text-on-surface leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Alternative Paths */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface">6. Alternative Paths</h3>
          </div>
          <div className="p-6">
            <ul className="space-y-3">
              {s.alternativePaths.map((path, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-on-surface">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  {path}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Recommended Path */}
        <section className="bg-primary text-white rounded-xl shadow-lg p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldAlert size={120} /></div>
          <div className="relative z-10">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4 text-white/80">7. Recommended Path</h3>
            <p className="text-base font-bold leading-relaxed">{s.recommendedPath}</p>
          </div>
        </section>
      </div>

      {/* Sidebar */}
      <div className="col-span-4 space-y-6">
        <div className="sticky top-24 space-y-6">
          <section className="bg-slate-900 text-white rounded-xl p-6 shadow-xl border border-white/10">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
              <Info size={16} /> Commercial Context
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed italic">"{s.commercialContext}"</p>
          </section>

          {s.strategicReminders.length > 0 && (
            <section className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-on-surface mb-4">Strategic Reminders</h3>
              <ul className="space-y-3">
                {s.strategicReminders.map((r, i) => (
                  <li key={i} className="flex gap-3 text-xs text-on-surface-variant">
                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={14} />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function DraftResponsePage() {
  const navigate = useNavigate();

  const [activeTab,    setActiveTab]    = useState<'draft' | 'strategy'>('draft');
  const [draftStatus,  setDraftStatus]  = useState<DraftStatus>('idle');
  const [draft,        setDraft]        = useState<Draft | null>(null);
  const [analysis,     setAnalysis]     = useState<AnalysisResult | null>(null);
  const [projectData,  setProjectData]  = useState<ProjectData | null>(null);
  const [letterText,   setLetterText]   = useState('');
  const [errorMsg,     setErrorMsg]     = useState('');
  const [exporting,    setExporting]    = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [projectClauses, setProjectClauses] = useState<ClauseRecord[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const autoGenerateAttemptedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      const snapshot = await loadCurrentWorkspaceSnapshot();
      const thread = await loadCurrentWorkspaceThreadView() ?? await loadCurrentThread();
      if (thread?.analysis)    setAnalysis(thread.analysis);
      if (thread?.projectData) setProjectData(thread.projectData);
      setProjectClauses(snapshot?.clauses ?? []);
      if (thread?.draft && thread.draft.letter && thread.draft.strategy) {
        setDraft(thread.draft);
        setLetterText(thread.draft.letter);
        setDraftStatus('ready');
      }
    };

    void load();
  }, []);

  const handleGenerate = async () => {
    setDraftStatus('generating');
    setErrorMsg('');
    try {
      const thread = await loadCurrentWorkspaceThreadView() ?? await loadCurrentThread();
      const relevantClauses = buildRelevantDraftClauses(projectClauses, (thread?.analysis ?? analysis) ?? null, 4);
      const res    = await fetch('/api/generate-draft', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          analysis:    thread?.analysis    ?? analysis,
          projectData: thread?.projectData ?? projectData,
          citations:   thread?.citations   ?? [],
          report:      thread?.report      ?? null,
          clauses:     relevantClauses.map((clause) => ({
            title: clause.title,
            sourceRef: getClauseShortSourceRef(clause),
            excerpt: clause.excerpt,
            whyItMatters: clause.whyItMatters,
            linkedIssueTypes: clause.linkedIssueTypes,
            linkedDeadlineTypes: clause.linkedDeadlineTypes,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Draft generation failed.');

      const newDraft: Draft = data.draft;
      await saveCurrentThread({
        ...(thread ?? {}),
        analysis:    thread?.analysis    ?? analysis!,
        projectData: thread?.projectData ?? projectData ?? { name: '', contractNumber: '', changeRequestId: '' },
        draft:       newDraft,
      } as any);

      setDraft(newDraft);
      setLetterText(newDraft.letter);
      setDraftStatus('ready');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setDraftStatus('failed');
    }
  };

  useEffect(() => {
    if (autoGenerateAttemptedRef.current || draftStatus !== 'idle' || !analysis) {
      return;
    }
    autoGenerateAttemptedRef.current = true;
    void handleGenerate();
  }, [analysis, draftStatus, projectClauses, projectData]);

  const handleRegenerate = async () => {
    setDraft(null);
    setLetterText('');
    setDraftStatus('idle');
    const thread = await loadCurrentWorkspaceThreadView() ?? await loadCurrentThread();
    if (thread) await saveCurrentThread({ ...thread, draft: undefined } as any);
  };

  const handleSave = async () => {
    if (!draft) return;
    const updated: Draft = { ...draft, letter: letterText, updatedAt: new Date().toISOString() };
    const thread = await loadCurrentWorkspaceThreadView() ?? await loadCurrentThread();
    if (thread) await saveCurrentThread({ ...thread, draft: updated } as any);
    setDraft(updated);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(letterText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async () => {
    if (!contentRef.current) return;
    setExporting(true);
    try {
      const slug = projectData?.name ? projectData.name.replace(/\s+/g, '_') : 'Draft';
      await exportDraftPDF(contentRef.current, `NeverSignBlind_Draft_${slug}_${new Date().toISOString().split('T')[0]}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Lifecycle renders
  // ---------------------------------------------------------------------------

  const renderIdle = () => {
    if (!analysis) return <NoAnalysis currentStep="draft" />;
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <FileText size={36} className="text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-on-surface">Draft not yet generated</h3>
          <p className="text-sm text-on-surface-variant max-w-sm">
            Generate a client-facing response letter and internal claim strategy from your analysis.
          </p>
        </div>
        <button onClick={handleGenerate}
          className="flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-dim transition-all shadow-lg active:scale-95">
          <Sparkles size={18} /> Generate Draft
        </button>
      </div>
    );
  };

  const renderGenerating = () => (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <Loader2 size={48} className="animate-spin text-primary" />
      <p className="text-on-surface font-bold text-lg">Generating Draft...</p>
      <p className="text-sm text-on-surface-variant max-w-sm">
        Claude is writing your response letter and claim strategy. Usually takes 20–40 seconds.
      </p>
    </div>
  );

  const renderFailed = () => (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
        <AlertTriangle size={28} className="text-rose-500" />
      </div>
      <p className="font-bold text-on-surface">Draft generation failed</p>
      <p className="text-xs text-on-surface-variant max-w-sm">{errorMsg}</p>
      <button onClick={handleGenerate}
        className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-bold hover:bg-primary-dim transition-all">
        <RefreshCw size={16} /> Try Again
      </button>
    </div>
  );

  const renderDraftTab = () => (
    <div className="grid grid-cols-12 gap-8">
      {/* Letter editor */}
      <div className="col-span-8">
        <div className="bg-white rounded-xl shadow-xl min-h-[600px] flex flex-col border border-slate-200">
          {/* Toolbar */}
          <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3">
            <div className="ml-auto text-xs font-medium text-emerald-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              AI-Generated · Editable
            </div>
          </div>
          <textarea
            id="draftTextarea"
            value={letterText}
            onChange={e => setLetterText(e.target.value)}
            className="flex-1 p-10 font-serif text-on-surface leading-relaxed resize-none outline-none bg-transparent text-sm"
            placeholder="Draft letter will appear here after generation..."
          />
        </div>
      </div>

      {/* Sidebar */}
      <div className="col-span-4 space-y-6">
        <section className="bg-slate-50 rounded-xl p-6 border border-slate-200">
          <h3 className="font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
            <Info className="text-primary" size={16} /> About This Draft
          </h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            This letter was generated from your uploaded contract analysis. Review it carefully before sending.
            All claims reference the uploaded documents only.
          </p>
          {projectData?.name && (
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Project</span>
                <span className="font-medium text-on-surface">{projectData.name}</span>
              </div>
              {projectData.contractNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Contract</span>
                  <span className="font-medium text-on-surface">{projectData.contractNumber}</span>
                </div>
              )}
              {projectData.changeRequestId && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Change Request</span>
                  <span className="font-medium text-on-surface">{projectData.changeRequestId}</span>
                </div>
              )}
            </div>
          )}
        </section>

        {draft && (
          <section className="bg-amber-50 rounded-xl p-5 border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                Review all content before sending. This draft is a starting point — verify all clause references and dates against your actual contract.
              </p>
            </div>
          </section>
        )}

        {buildRelevantDraftClauses(projectClauses, analysis, 3).length > 0 && (
          <section className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h3 className="font-headline font-bold text-on-surface mb-4">Clause Support in Use</h3>
            <div className="space-y-3">
              {buildRelevantDraftClauses(projectClauses, analysis, 3).map((clause) => (
                <div key={clause.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                    {getClauseShortSourceRef(clause)}
                  </div>
                  <div className="mt-1 text-xs font-bold text-on-surface">{clause.title}</div>
                  <p className="mt-2 text-xs leading-6 text-on-surface-variant">{clause.whyItMatters}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Page shell
  // ---------------------------------------------------------------------------

  const title = projectData?.name
    ? `${projectData.name}${projectData.changeRequestId ? ` · ${projectData.changeRequestId}` : ''}`
    : 'Commercial Response Management';

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      {/* Header */}
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {projectData?.name && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase rounded">
                {projectData.name}
              </span>
            )}
            {projectData?.changeRequestId && (
              <span className="text-on-surface-variant text-sm">{projectData.changeRequestId}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">
              Commercial Response Management
            </h1>
            {draftStatus === 'ready' && (
              <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded border border-emerald-200">
                <CheckCircle2 size={12} /> Ready
              </span>
            )}
            {draftStatus === 'generating' && (
              <span className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase rounded border border-primary/20">
                <Loader2 size={12} className="animate-spin" /> Generating
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => navigate('/intake')}
            className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary px-3 py-2 rounded hover:bg-slate-50 transition-colors">
            <RotateCcw size={14} /> New Analysis
          </button>
          {draftStatus === 'ready' && (
            <button onClick={handleRegenerate}
              className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary px-3 py-2 rounded hover:bg-slate-50 transition-colors">
              <RefreshCw size={14} /> Regenerate
            </button>
          )}
          <button onClick={handleSave} disabled={draftStatus !== 'ready'}
            className="flex items-center gap-2 px-4 py-2 text-primary font-bold hover:bg-slate-50 transition-colors rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
            <Save size={16} /> Save
          </button>
          <button onClick={handleCopy} disabled={draftStatus !== 'ready'}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-on-surface font-bold hover:bg-slate-200 transition-colors rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
            <Copy size={16} /> {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={handleExport} disabled={draftStatus !== 'ready' || exporting}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white font-bold hover:bg-primary-dim shadow-md transition-all rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Export PDF
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-8">
          {(['draft', 'strategy'] as const).map(tab => (
            <button
              key={tab}
              id={tab === 'strategy' ? 'strategyTabBtn' : undefined}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative flex items-center gap-2",
                activeTab === tab ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
              )}>
            {tab === 'strategy' && <ShieldAlert size={16} />}
            {tab === 'draft' ? 'Draft Response' : 'Claim Strategy & Mitigation'}
            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div ref={contentRef}>
        {draftStatus === 'idle'       && renderIdle()}
        {draftStatus === 'generating' && renderGenerating()}
        {draftStatus === 'failed'     && renderFailed()}
        {draftStatus === 'ready' && draft && (
          activeTab === 'draft'
            ? renderDraftTab()
            : <div id="strategyPanel"><StrategyTab s={draft.strategy} projectData={projectData} /></div>
        )}
      </div>
    </div>
  );
}
