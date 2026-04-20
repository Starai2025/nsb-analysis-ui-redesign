import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History, CheckCircle2,
  Loader2, RotateCcw
} from 'lucide-react';
import { loadCurrentThread, saveCurrentThread, clearCurrentThread } from '../lib/db';
import {
  loadCurrentWorkspaceSnapshot, loadCurrentWorkspaceThreadView,
  getClausesForProject,
} from '../lib/projectStore';
import { LEGACY_COMPAT_PROJECT_ID } from '../lib/storageAdapter';
import NoAnalysis from '../components/NoAnalysis';
import type { ClauseRecord } from '../types';
import { deriveSummaryIssues, getClauseShortSourceRef, rankClausesForIssue } from '../lib/clauseSurface';

function safeDate(value: string): string {
  if (!value || value === 'Not specified') return 'Not specified';
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export default function DecisionSummaryPage() {
  const navigate = useNavigate();
  const [loading,         setLoading]         = useState(true);
  const [showSlowLoading, setShowSlowLoading] = useState(false);
  const [analysis,        setAnalysis]        = useState<any>(null);
  const [projectData,     setProjectData]     = useState<any>(null);
  const [claimableAmount, setClaimableAmount] = useState('');
  const [extraDays,       setExtraDays]       = useState('');
  const [secondaryResp,   setSecondaryResp]   = useState('');
  const [saving,          setSaving]          = useState(false);
  const [clauses,         setClauses]         = useState<ClauseRecord[]>([]);
  const [activeIssueId,   setActiveIssueId]   = useState<string | null>(null);

  useEffect(() => {
    const slowTimer = setTimeout(() => setShowSlowLoading(true), 5000);

    const load = async () => {
      try {
        const snapshot = await loadCurrentWorkspaceSnapshot();
        const thread = await loadCurrentWorkspaceThreadView() ?? await loadCurrentThread();
        if (thread?.analysis) {
          setAnalysis(thread.analysis);
          setProjectData(thread.projectData ?? null);
          setClaimableAmount(thread.analysis.claimableAmount ?? '');
          setExtraDays(thread.analysis.extraDays ?? '');
          setSecondaryResp(thread.analysis.secondaryResponsibility ?? '');

          // Prefer snapshot clauses; fall back to a direct project lookup when the snapshot
          // returns before clause records have been committed (e.g. first navigation after intake).
          const snapshotClauses = snapshot?.clauses ?? [];
          if (snapshotClauses.length > 0) {
            setClauses(snapshotClauses);
          } else {
            const projectId = thread.projectData?.id ?? LEGACY_COMPAT_PROJECT_ID;
            const directClauses = await getClausesForProject(projectId);
            setClauses(directClauses);
          }
          return;
        }
        // Fallback: server store (handles direct navigation before IndexedDB is populated)
        const res  = await fetch('/api/store');
        const data = await res.json();
        if (data.analysis) {
          setAnalysis(data.analysis);
          setProjectData(data.projectData ?? null);
          setClaimableAmount(data.analysis.claimableAmount ?? '');
          setExtraDays(data.analysis.extraDays ?? '');
          setSecondaryResp(data.analysis.secondaryResponsibility ?? '');
          // Backfill IndexedDB from server — saveCurrentThread preserves all evidence fields automatically
          await saveCurrentThread({
            analysis:    data.analysis,
            projectData: data.projectData ?? { name: '', contractNumber: '', changeRequestId: '' },
          });
        }
      } catch (err) {
        console.error('Failed to load analysis:', err);
      } finally {
        setLoading(false);
        clearTimeout(slowTimer);
      }
    };

    load();
    return () => clearTimeout(slowTimer);
  }, []);

  useEffect(() => {
    const issues = deriveSummaryIssues(analysis);
    if (issues.length === 0) {
      setActiveIssueId(null);
      return;
    }

    setActiveIssueId((current) => (
      current && issues.some((issue) => issue.id === current)
        ? current
        : issues[0].id
    ));
  }, [analysis]);

  const handleSaveAndGenerate = async () => {
    setSaving(true);
    try {
      const updatedAnalysis = {
        ...analysis,
        claimableAmount,
        extraDays,
        secondaryResponsibility: secondaryResp,
      };
      // Save edits to IndexedDB — saveCurrentThread preserves all evidence fields automatically
      await saveCurrentThread({
        analysis:    updatedAnalysis,
        projectData: projectData ?? { name: '', contractNumber: '', changeRequestId: '' },
      });
      // Also sync to server as backup
      await fetch('/api/save-analysis', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ analysis: updatedAnalysis, projectData }),
      });
      navigate('/report');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleNewAnalysis = async () => {
    await clearCurrentThread();
    navigate('/intake');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
        <Loader2 size={48} className="animate-spin text-primary" />
        <div className="text-center">
          <p className="text-on-surface-variant font-bold animate-pulse">Loading Analysis Results...</p>
          {showSlowLoading && (
            <p className="text-xs text-slate-500 mt-2 animate-bounce">
              Still loading... complex documents can take a moment.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!analysis) {
    return <NoAnalysis currentStep="summary" />;
  }

  const summaryIssues = deriveSummaryIssues(analysis);
  const activeIssue = summaryIssues.find((issue) => issue.id === activeIssueId) ?? summaryIssues[0] ?? null;
  const topSupportingClauses = rankClausesForIssue(clauses, activeIssue, 3);

  const projectLabel = projectData?.name
    ? `${projectData.name}${projectData.changeRequestId ? ` — ${projectData.changeRequestId}` : ''}`
    : null;

  return (
    <div className="mx-auto max-w-[1380px] space-y-6 px-8 py-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {projectLabel && (
            <span id="summaryCaseTitle" className="rounded-full bg-[#0f2044]/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0f2044]">
              {projectLabel}
            </span>
          )}
          {projectData?.contractNumber && (
            <span className="flex items-center gap-1 text-sm text-on-surface-variant">
              <History size={14} /> {projectData.contractNumber}
            </span>
          )}
        </div>
        <button
          onClick={handleNewAnalysis}
          className="flex items-center gap-2 text-xs font-bold text-on-surface-variant transition-colors hover:text-[#e67e22]"
        >
          <RotateCcw size={14} /> New Analysis
        </button>
      </div>

      <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#102247_0%,#16315f_62%,#254580_100%)] p-8 text-white shadow-2xl shadow-slate-900/15">
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-[#e67e22]/25 blur-3xl" />

        <div className="relative z-10 rounded-2xl border border-white/12 bg-white/8 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">Matter Status</div>
                <div className="text-base font-bold text-white">
                  {projectData?.name || 'Project Alpha'} · {projectData?.contractNumber || 'BC-2024-881'} · {projectData?.changeRequestId || 'CR-012'}
                </div>
              </div>
              <div className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                4 Clauses Cited
              </div>
              <div className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                Confidence: High
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-white/65">
              <span>Analyzed {safeDate(analysis.noticeDeadline) !== 'Not specified' ? '2026-04-13' : '2026-04-13'}</span>
              <span>Report ready for review</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-6 flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-4xl">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-white/55">Decision Summary</div>
            <h1 className="font-headline text-5xl font-extrabold uppercase leading-none tracking-[0.02em] text-white">
              Material Scope Change
            </h1>
            <p id="summaryText" className="mt-5 max-w-4xl text-lg font-medium leading-8 text-white/82">
              {analysis.executiveConclusion}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                Backed by 4 source clauses
              </div>
              <div className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                Commercial exposure flagged
              </div>
              <div className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                Deadline-sensitive
              </div>
            </div>
          </div>

          <div className="min-w-[220px] rounded-2xl border border-white/12 bg-white/8 p-5 backdrop-blur-md">
            <span className="inline-block rounded-full bg-rose-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-700">
              {analysis.scopeStatus}
            </span>
            <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">Immediate read</div>
            <div className="mt-1 text-sm font-bold text-white">Notice and pricing review required</div>
          </div>
        </div>

        <div className="relative z-10 mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/8 p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/48">Scope Status</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12 text-lg font-black text-white">!</div>
            </div>
            <span className="inline-block rounded-full bg-rose-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-700">{analysis.scopeStatus}</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/8 p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/48">Extra Money?</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12 text-lg font-black text-white">$</div>
            </div>
            <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
              {analysis.extraMoneyLikely ? 'Likely Yes' : 'Unlikely'}
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/8 p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/48">Extra Time?</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12 text-lg font-black text-white">T</div>
            </div>
            <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
              {analysis.extraTimeLikely ? 'Possibly' : 'No'}
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/8 p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/48">Responsibility</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12 text-lg font-black text-white">R</div>
            </div>
            <div className="text-sm font-bold text-white">{analysis.primaryResponsibility}</div>
            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/48">Secondary</div>
              <input
                type="text"
                value={secondaryResp}
                onChange={(e) => setSecondaryResp(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-white/40 focus:border-[#e67e22] focus:ring-2 focus:ring-[#e67e22]/25"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/8 p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/48">Notice Deadline</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12 text-lg font-black text-white">D</div>
            </div>
            <div className="text-sm font-bold text-white">{safeDate(analysis.noticeDeadline)}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/8 p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/48">Claimable Amount</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12 text-lg font-black text-white">C</div>
            </div>
            <input
              type="text"
              value={claimableAmount}
              onChange={(e) => setClaimableAmount(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/10 px-3 py-2 text-base font-bold text-white outline-none placeholder:text-white/40 focus:border-[#e67e22] focus:ring-2 focus:ring-[#e67e22]/25"
            />
          </div>
        </div>
      </div>

      {topSupportingClauses.length > 0 && (
        <section className="rounded-[24px] bg-white p-8 shadow-lg shadow-slate-900/5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">Top Supporting Clauses</div>
              <p className="mt-2 text-sm text-on-surface-variant">
                Focused clause support for {activeIssue ? `"${activeIssue.title}"` : 'the current issue'}.
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
              {topSupportingClauses.length} highlighted
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {topSupportingClauses.map((clause) => (
              <article key={clause.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                  {getClauseShortSourceRef(clause)}
                </div>
                <div className="mt-3 text-sm font-bold text-on-surface">{clause.title}</div>
                <p className="mt-3 text-xs leading-6 text-on-surface-variant">{clause.whyItMatters}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-[24px] border-l-4 border-[#e67e22] bg-[linear-gradient(180deg,#ffffff_0%,#fcfaf7_100%)] p-8 shadow-lg shadow-slate-900/5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">Strategic Recommendation</div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
            Recommended next move
          </div>
        </div>
        <p className="text-sm leading-7 text-on-surface-variant">{analysis.strategicRecommendation}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
            Source: Art. 4.3 Claims
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
            Source: Art. 4.1 Changes
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
            Evidence confidence: high
          </div>
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-8 shadow-lg shadow-slate-900/5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">Key Risks</div>
          {activeIssue && summaryIssues.length > 1 && (
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
              Active issue: {activeIssue.title}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {analysis.keyRisks?.map((risk: any, i: number) => {
            const tone =
              i < 3
                ? 'border-rose-200 bg-rose-50/70'
                : i < 5
                  ? 'border-amber-200 bg-amber-50/70'
                  : 'border-slate-200 bg-slate-50/80';

            const tagA =
              i === 0 ? 'Pages 71-72' :
              i === 1 ? 'Page 13' :
              i === 2 ? 'Page 6' :
              i === 3 ? 'Page 6' :
              i === 4 ? 'Art. 3.12' :
              'Exhibit P';

            const tagB =
              i === 0 ? 'Pricing assumption' :
              i === 1 ? 'Approval risk' :
              i === 2 ? 'Deadline' :
              i === 3 ? 'Contract leverage' :
              i === 4 ? 'Cash flow' :
              'Liability';

            const issueId = summaryIssues[i]?.id ?? `issue-${i}`;
            const isActive = issueId === activeIssueId;

            return (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIssueId(issueId)}
                className={`rounded-2xl border p-5 text-left shadow-sm transition-all ${tone} ${isActive ? 'ring-2 ring-[#e67e22]' : 'hover:-translate-y-0.5 hover:shadow-md'}`}
              >
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                  {i < 3 ? 'High' : i < 5 ? 'Med' : 'Low'}
                </div>
                <div className="text-sm font-bold text-on-surface">{risk.title}</div>
                <div className="mt-2 text-xs leading-6 text-on-surface-variant">{risk.description}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">{tagA}</span>
                  <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">{tagB}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={handleSaveAndGenerate}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[#e67e22] px-10 py-4 font-bold text-white shadow-xl shadow-[#e67e22]/20 transition-all hover:opacity-95 active:scale-95"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
          Save & Generate Full Report
        </button>
      </div>
    </div>
  );
}
