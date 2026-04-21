import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSearch,
  FileText,
  History,
  Loader2,
  PenLine,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { clearCurrentThread, loadCurrentThread, saveCurrentThread } from '../lib/db';
import {
  getClausesForProject,
  loadCurrentWorkspaceSnapshot,
  loadCurrentWorkspaceThreadView,
} from '../lib/projectStore';
import { LEGACY_COMPAT_PROJECT_ID } from '../lib/storageAdapter';
import NoAnalysis from '../components/NoAnalysis';
import type { AnalysisResult, ClauseRecord, ProjectData } from '../types';
import {
  deriveSummaryIssues,
  getClauseShortSourceRef,
  rankClausesForIssue,
} from '../lib/clauseSurface';

function safeDate(value: string): string {
  if (!value || value === 'Not specified') return 'Not specified';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

function inferSummaryTitle(analysis: AnalysisResult): string {
  if (analysis.summaryTitle?.trim()) return analysis.summaryTitle.trim();
  if (analysis.scopeStatus === 'Out of Scope' && (analysis.extraMoneyLikely || analysis.extraTimeLikely)) return 'Material Scope Change';
  if (analysis.scopeStatus === 'Out of Scope') return 'Out-of-Scope Review';
  if (analysis.extraMoneyLikely || analysis.extraTimeLikely) return 'Commercial Exposure Review';
  return 'Routine Design Review';
}

function inferSummaryDescription(analysis: AnalysisResult): string {
  if (analysis.summaryDescription?.trim()) return analysis.summaryDescription.trim();
  if (analysis.executiveConclusion?.trim()) return analysis.executiveConclusion.trim();
  return analysis.keyRisks?.[0]?.description?.trim() || 'Review the uploaded documents for the latest commercial position.';
}

function inferQuickRead(analysis: AnalysisResult): string {
  if (analysis.noticeDeadline !== 'Not specified') return 'Notice and pricing review required';
  if (analysis.extraMoneyLikely && analysis.extraTimeLikely) return 'Commercial and schedule review required';
  if (analysis.extraMoneyLikely) return 'Pricing review required';
  if (analysis.extraTimeLikely) return 'Schedule review required';
  if (analysis.scopeStatus === 'In Scope') return 'Routine progression with light monitoring';
  return 'Escalate for internal review';
}

function inferConfidence(analysis: AnalysisResult, citationCount: number, clauseCount: number): 'High' | 'Medium' | 'Low' {
  let score = 0;
  if (citationCount >= 3) score += 2;
  else if (citationCount > 0) score += 1;
  if (clauseCount >= 3) score += 2;
  else if (clauseCount > 0) score += 1;
  if (analysis.noticeDeadline !== 'Not specified') score += 1;
  if ((analysis.keyRisks?.length ?? 0) >= 3) score += 1;
  if (score >= 5) return 'High';
  if (score >= 3) return 'Medium';
  return 'Low';
}

function buildDefaultTags(analysis: AnalysisResult, citationsCount: number, clausesCount: number): string[] {
  const tags: string[] = [];

  if (clausesCount > 0) tags.push(`Backed by ${clausesCount} source clause${clausesCount === 1 ? '' : 's'}`);
  else if (citationsCount > 0) tags.push(`Backed by ${citationsCount} citation${citationsCount === 1 ? '' : 's'}`);
  else tags.push('Manual review advised');

  tags.push(analysis.extraMoneyLikely || analysis.extraTimeLikely ? 'Commercial exposure flagged' : 'No commercial exposure identified');
  tags.push(analysis.noticeDeadline !== 'Not specified' ? 'Deadline-sensitive' : 'Deadline not extracted');

  return tags;
}

function statusBadgeClasses(value: string): string {
  switch (value) {
    case 'Out of Scope':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'In Scope':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'High':
      return 'border-amber-500/40 bg-amber-400/10 text-amber-200';
    case 'Medium':
      return 'border-sky-400/35 bg-sky-400/10 text-sky-200';
    case 'Low':
      return 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200';
    case 'Yes':
    case 'Likely Yes':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'Possible':
    case 'Likely':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'No':
    case 'Unlikely':
    case 'Likely No':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

function metricBadge(value: string) {
  return `inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${statusBadgeClasses(value)}`;
}

function SummaryMetricCard({
  label,
  children,
  onEdit,
}: {
  label: string;
  children: React.ReactNode;
  onEdit?: () => void;
}) {
  return (
    <article className="min-h-[132px] rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface">{label}</div>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-slate-200 bg-white text-on-surface shadow-sm transition-colors hover:border-[#e67e22]/40 hover:text-[#8b4e0e]"
          >
            <PenLine size={13} />
          </button>
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-slate-200 bg-slate-50 text-on-surface shadow-sm">
            <PenLine size={13} />
          </div>
        )}
      </div>
      {children}
    </article>
  );
}

function ActionHubCard({
  label,
  title,
  description,
  statusLabel,
  statusTone,
  icon,
  onClick,
  cta,
}: {
  label: string;
  title: string;
  description: string;
  statusLabel: string;
  statusTone: string;
  icon: React.ReactNode;
  onClick: () => void;
  cta: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[24px] border border-[#e67e22]/15 bg-white p-5 text-left shadow-xl shadow-slate-900/5 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-slate-900/10"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#11244d] text-white">
          {icon}
        </div>
        <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${statusTone}`}>
          {statusLabel}
        </span>
      </div>
      <div className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface">{label}</div>
      <div className="mt-2 text-[24px] font-bold leading-tight text-on-surface">{title}</div>
      <p className="mt-3 text-sm leading-7 text-on-surface-variant">{description}</p>
      <div className="mt-4 flex items-center gap-2 text-sm font-bold text-[#e67e22]">
        {cta} <ArrowRight size={16} />
      </div>
    </button>
  );
}

export default function DecisionSummaryPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [showSlowLoading, setShowSlowLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [claimableAmount, setClaimableAmount] = useState('');
  const [secondaryResp, setSecondaryResp] = useState('');
  const [noticeDeadline, setNoticeDeadline] = useState('');
  const [summaryTitle, setSummaryTitle] = useState('');
  const [summaryText, setSummaryText] = useState('');
  const [summaryTags, setSummaryTags] = useState<string[]>([]);
  const [draftTag, setDraftTag] = useState('');
  const [addingTag, setAddingTag] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clauses, setClauses] = useState<ClauseRecord[]>([]);
  const [citationsCount, setCitationsCount] = useState(0);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [analysisDate, setAnalysisDate] = useState('');
  const [reportReady, setReportReady] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingResponsibility, setEditingResponsibility] = useState(false);
  const [editingNotice, setEditingNotice] = useState(false);
  const [editingAmount, setEditingAmount] = useState(false);

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
          setSecondaryResp(thread.analysis.secondaryResponsibility ?? '');
          setNoticeDeadline(thread.analysis.noticeDeadline && thread.analysis.noticeDeadline !== 'Not specified' ? thread.analysis.noticeDeadline : '');
          setSummaryTitle(inferSummaryTitle(thread.analysis));
          setSummaryText(inferSummaryDescription(thread.analysis));
          setSummaryTags(thread.analysis.summaryTags ?? []);
          setCitationsCount(thread.citations?.length ?? snapshot?.latestAnalysis?.citations?.length ?? 0);
          setAnalysisDate(thread.updatedAt ?? thread.contract?.metadata?.uploadedAt ?? '');
          setReportReady(Boolean(snapshot?.currentReport?.report ?? thread.report));
          setDraftReady(Boolean(snapshot?.currentDraft?.draft ?? thread.draft));

          const snapshotClauses = snapshot?.clauses ?? [];
          if (snapshotClauses.length > 0) setClauses(snapshotClauses);
          else {
            const projectId = thread.projectData?.id ?? LEGACY_COMPAT_PROJECT_ID;
            setClauses(await getClausesForProject(projectId));
          }
          return;
        }

        const response = await fetch('/api/store');
        const data = await response.json();
        if (data.analysis) {
          setAnalysis(data.analysis);
          setProjectData(data.projectData ?? null);
          setClaimableAmount(data.analysis.claimableAmount ?? '');
          setSecondaryResp(data.analysis.secondaryResponsibility ?? '');
          setNoticeDeadline(data.analysis.noticeDeadline && data.analysis.noticeDeadline !== 'Not specified' ? data.analysis.noticeDeadline : '');
          setSummaryTitle(inferSummaryTitle(data.analysis));
          setSummaryText(inferSummaryDescription(data.analysis));
          setSummaryTags(data.analysis.summaryTags ?? []);
          setCitationsCount(data.citations?.length ?? 0);
          setAnalysisDate(new Date().toISOString());
          await saveCurrentThread({
            analysis: data.analysis,
            projectData: data.projectData ?? { name: '', contractNumber: '', changeRequestId: '' },
          });
        }
      } catch (error) {
        console.error('Failed to load analysis:', error);
      } finally {
        setLoading(false);
        clearTimeout(slowTimer);
      }
    };

    void load();
    return () => clearTimeout(slowTimer);
  }, []);

  useEffect(() => {
    const issues = deriveSummaryIssues(analysis);
    if (issues.length === 0) {
      setActiveIssueId(null);
      return;
    }
    setActiveIssueId((current) => (current && issues.some((issue) => issue.id === current) ? current : issues[0].id));
  }, [analysis]);

  const persistSummary = async () => {
    if (!analysis) return null;
    setSaving(true);
    setErrorMessage('');
    try {
      const updatedAnalysis: AnalysisResult = {
        ...analysis,
        claimableAmount: claimableAmount.trim() || 'Not specified',
        secondaryResponsibility: secondaryResp.trim() || 'Not specified',
        noticeDeadline: noticeDeadline.trim() || 'Not specified',
        summaryTitle: summaryTitle.trim() || inferSummaryTitle(analysis),
        summaryDescription: summaryText.trim() || inferSummaryDescription(analysis),
        summaryTags,
      };

      setAnalysis(updatedAnalysis);
      await saveCurrentThread({
        analysis: updatedAnalysis,
        projectData: projectData ?? { name: '', contractNumber: '', changeRequestId: '' },
      });
      await fetch('/api/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: updatedAnalysis, projectData }),
      });
      return updatedAnalysis;
    } catch (error) {
      console.error('Save failed:', error);
      setErrorMessage('Failed to save changes. Please try again.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleNavigateWithSave = async (path: '/report' | '/sources' | '/draft') => {
    const updated = await persistSummary();
    if (updated) navigate(path);
  };

  const handleNewAnalysis = async () => {
    await clearCurrentThread();
    navigate('/intake');
  };

  const addTag = () => {
    const cleaned = draftTag.trim();
    if (!cleaned) return;
    if (summaryTags.some((tag) => tag.toLowerCase() === cleaned.toLowerCase())) {
      setDraftTag('');
      setAddingTag(false);
      return;
    }
    setSummaryTags((current) => [...current, cleaned]);
    setDraftTag('');
    setAddingTag(false);
  };

  const removeTag = (tagToRemove: string) => {
    setSummaryTags((current) => current.filter((tag) => tag !== tagToRemove));
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <Loader2 size={48} className="animate-spin text-primary" />
        <div className="text-center">
          <p className="font-bold text-on-surface-variant animate-pulse">Loading Analysis Results...</p>
          {showSlowLoading && (
            <p className="mt-2 animate-bounce text-xs text-slate-500">
              Still loading... complex documents can take a moment.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!analysis) return <NoAnalysis currentStep="summary" />;

  const summaryIssues = deriveSummaryIssues(analysis);
  const activeIssue = summaryIssues.find((issue) => issue.id === activeIssueId) ?? summaryIssues[0] ?? null;
  const topSupportingClauses = rankClausesForIssue(clauses, activeIssue, 3);
  const confidence = inferConfidence(analysis, citationsCount, topSupportingClauses.length || clauses.length);
  const quickRead = inferQuickRead(analysis);
  const defaultTags = buildDefaultTags(analysis, citationsCount, clauses.length);
  const allTags = [...defaultTags, ...summaryTags];
  const projectLabel = projectData?.name || 'No active analysis';
  const contractLabel = projectData?.contractNumber || 'No contract number';
  const requestLabel = projectData?.changeRequestId || 'No change request';
  const reportStatusLabel = reportReady ? 'Report ready for review' : 'Report not generated';
  const draftStatusLabel = draftReady ? 'Draft ready for review' : 'Draft will generate on open';
  const sourcesStatusLabel = citationsCount > 0 || clauses.length > 0 ? 'Sources available' : 'Sources pending review';
  const extraMoneyLabel = analysis.extraMoneyLikely ? 'Likely yes' : 'Unlikely';
  const extraTimeLabel = analysis.extraTimeLikely ? 'Possible' : 'No';
  const displayTitle = summaryTitle.trim() || inferSummaryTitle(analysis);
  const displaySummaryText = summaryText.trim() || inferSummaryDescription(analysis);
  const displayClaimableAmount = claimableAmount.trim() || analysis.claimableAmount || 'Not specified';
  const displaySecondaryResponsibility = secondaryResp.trim() || analysis.secondaryResponsibility || 'Not specified';
  const displayNoticeDeadline = noticeDeadline ? safeDate(noticeDeadline) : 'Not specified';

  return (
    <div className="mx-auto max-w-[1080px] space-y-6 px-4 py-6 sm:px-6 xl:px-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
          <span
            id="summaryCaseTitle"
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface"
          >
            {projectLabel}
          </span>
          <span className="flex items-center gap-1">
            <History size={14} /> {contractLabel}
          </span>
        </div>
        <button
          onClick={handleNewAnalysis}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-on-surface-variant transition-colors hover:border-[#e67e22]/40 hover:text-[#8b4e0e]"
        >
          <RotateCcw size={14} /> New Analysis
        </button>
      </div>

      <section className="relative overflow-hidden rounded-[24px] border border-[#f0dfca] bg-[radial-gradient(circle_at_right,#f7e1c7_0%,#fffaf4_14%,#ffffff_42%,#ffffff_100%)] px-8 py-6 shadow-lg shadow-slate-900/5">
        <div className="absolute -left-20 -top-16 h-56 w-56 rounded-full bg-slate-900/4 blur-3xl" />
        <div className="absolute -bottom-20 -right-10 h-60 w-60 rounded-full bg-[#e67e22]/14 blur-3xl" />
        <div className="relative space-y-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_132px_172px_minmax(180px,0.9fr)] lg:items-start">
            <div className="rounded-[22px] border border-white/80 bg-white/90 px-5 py-5 shadow-sm backdrop-blur">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface">Matter Status</div>
              <div className="mt-2 text-[17px] font-bold leading-tight text-on-surface sm:text-[18px]">
                {projectLabel} · {contractLabel} · {requestLabel}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="rounded-full border border-[#e67e22]/20 bg-[#fef9f0] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-[#8b4e0e]">
                  Decision Summary
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                  {reportStatusLabel}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-[18px] font-bold leading-none text-on-surface">{Math.max(citationsCount, clauses.length)}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                Clause{Math.max(citationsCount, clauses.length) === 1 ? '' : 's'} cited
              </div>
            </div>
            <div className="rounded-2xl border border-[#e67e22]/20 bg-[#fef9f0] px-4 py-3 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8b4e0e]">Confidence:</div>
              <div className="mt-1 text-[18px] font-bold uppercase tracking-[0.06em] text-[#8b4e0e]">{confidence}</div>
            </div>
            <div className="rounded-[22px] border border-white/80 bg-white/90 px-5 py-5 text-left shadow-sm backdrop-blur lg:text-right">
              <div className="text-sm text-on-surface-variant">
                Analyzed <span className="font-bold text-on-surface">{safeDate(analysisDate || analysis.noticeDeadline)}</span>
              </div>
              <div className="mt-1 text-[18px] font-bold leading-tight text-on-surface">{reportStatusLabel}</div>
              <div className="mt-2 text-sm text-on-surface-variant">{draftStatusLabel}</div>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_260px]">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8b4e0e]">Decision Summary</div>
              {editingTitle ? (
                <div className="mt-4 max-w-[760px]">
                  <textarea
                    value={summaryTitle}
                    onChange={(event) => setSummaryTitle(event.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-[18px] border border-slate-300 bg-white px-5 py-4 font-headline text-[2.7rem] font-black uppercase leading-[0.94] tracking-[-0.025em] text-[#162a55] outline-none focus:border-[#e67e22] focus:ring-4 focus:ring-[#e67e22]/10 sm:text-[3.05rem] xl:text-[3.35rem]"
                    placeholder="Decision title"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingTitle(false)}
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant transition-colors hover:border-[#e67e22]/40 hover:text-[#8b4e0e]"
                  >
                    <CheckCircle2 size={14} /> Done editing title
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="mt-4 max-w-[980px] font-headline text-[2.7rem] font-black uppercase leading-[0.94] tracking-[-0.025em] text-[#162a55] sm:text-[3.05rem] xl:text-[3.35rem]">
                    {displayTitle}
                  </h1>
                  <button
                    type="button"
                    onClick={() => setEditingTitle(true)}
                    className="mt-2 flex items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-[#8b4e0e]"
                  >
                    <PenLine size={14} /> Click to edit title
                  </button>
                </>
              )}

              <p
                id="summaryText"
                className="mt-6 max-w-[760px] text-[14px] font-medium leading-6 text-slate-400"
              >
                {displaySummaryText}
              </p>
              {editingDescription && (
                <textarea
                  value={summaryText}
                  onChange={(event) => setSummaryText(event.target.value)}
                  rows={4}
                  className="mt-4 w-full max-w-[760px] resize-none rounded-[18px] border border-slate-300 bg-white px-4 py-4 text-[14px] font-medium leading-6 text-on-surface outline-none focus:border-[#e67e22] focus:ring-4 focus:ring-[#e67e22]/10"
                  placeholder="Decision summary description"
                />
              )}
              <button
                type="button"
                onClick={() => setEditingDescription((current) => !current)}
                className="mt-3 flex items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-[#8b4e0e]"
              >
                <PenLine size={14} /> {editingDescription ? 'Done editing description' : 'Click to edit description'}
              </button>
            </div>

            <aside className="self-start rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
              <span className={metricBadge(analysis.scopeStatus)}>{analysis.scopeStatus}</span>
              <div className="mt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface">Immediate Read</div>
              <div className="mt-3 text-[15px] font-bold leading-6 text-on-surface">{quickRead}</div>
              <div className="mt-6 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-on-surface-variant">
                {sourcesStatusLabel}
              </div>
            </aside>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {allTags.map((tag) => {
              const removable = summaryTags.includes(tag);
              return (
                <span
                  key={tag}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant"
                >
                  {tag}
                  {removable && (
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="rounded-full bg-white/80 p-0.5 text-on-surface-variant transition-colors hover:text-[#8b4e0e]"
                    >
                      <X size={12} />
                    </button>
                  )}
                </span>
              );
            })}
          </div>

          <div className="mt-4">
            {addingTag ? (
              <div className="flex flex-wrap items-center gap-3">
                <input
                  value={draftTag}
                  onChange={(event) => setDraftTag(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addTag();
                    }
                  }}
                  className="w-full max-w-sm rounded-md border border-slate-300 bg-white p-3 text-[13px] text-on-surface outline-none focus:border-[#e67e22] focus:ring-4 focus:ring-[#e67e22]/10"
                  placeholder="Add a custom summary tag"
                />
                <button type="button" onClick={addTag} className="rounded-full bg-[#0f2044] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-lg transition-opacity hover:opacity-95">
                  Add Tag
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingTag(false);
                    setDraftTag('');
                  }}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant transition-colors hover:border-[#e67e22]/40 hover:text-[#8b4e0e]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingTag(true)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant shadow-sm transition-colors hover:border-[#e67e22]/40 hover:text-[#8b4e0e]"
              >
                <Plus size={14} /> Add Tag
              </button>
            )}
          </div>

          <div className="mt-7 space-y-5">
            <section>
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface">Scope & Financial</div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <SummaryMetricCard label="Scope Status">
                  <div className={metricBadge(analysis.scopeStatus)}>{analysis.scopeStatus}</div>
                </SummaryMetricCard>

                <SummaryMetricCard label="Extra Money?">
                  <div className={metricBadge(extraMoneyLabel)}>{extraMoneyLabel}</div>
                  <div className="mt-2 text-[14px] leading-5 text-on-surface-variant">
                    {displayClaimableAmount}
                  </div>
                </SummaryMetricCard>

                <SummaryMetricCard label="Extra Time?">
                  <div className={metricBadge(extraTimeLabel)}>{extraTimeLabel}</div>
                  <div className="mt-2 text-[14px] leading-5 text-on-surface-variant">{analysis.extraDays || 'Not specified'}</div>
                </SummaryMetricCard>
              </div>
            </section>

            <section>
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface">Responsibility & Deadlines</div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <SummaryMetricCard
                  label="Responsibility"
                  onEdit={() => setEditingResponsibility((current) => !current)}
                >
                  <div className="text-[14px] font-bold text-on-surface sm:text-[16px]">{analysis.primaryResponsibility}</div>
                  <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface">Secondary</div>
                  {editingResponsibility ? (
                    <input
                      type="text"
                      value={secondaryResp}
                      onChange={(event) => setSecondaryResp(event.target.value)}
                      className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 text-[13px] text-on-surface outline-none focus:border-[#e67e22] focus:ring-4 focus:ring-[#e67e22]/10"
                      placeholder="Not specified"
                    />
                  ) : (
                    <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-[14px] italic text-on-surface-variant">
                      {displaySecondaryResponsibility}
                    </div>
                  )}
                </SummaryMetricCard>

                <SummaryMetricCard
                  label="Notice Deadline"
                  onEdit={() => setEditingNotice((current) => !current)}
                >
                  <div className={`text-[14px] sm:text-[16px] ${noticeDeadline ? 'font-bold text-on-surface' : 'italic text-on-surface-variant'}`}>
                    {displayNoticeDeadline}
                  </div>
                  {editingNotice && (
                    <input
                      type="date"
                      value={noticeDeadline}
                      onChange={(event) => setNoticeDeadline(event.target.value)}
                      className="mt-2.5 w-full rounded-md border border-slate-300 bg-white p-3 text-[13px] text-on-surface outline-none focus:border-[#e67e22] focus:ring-4 focus:ring-[#e67e22]/10"
                    />
                  )}
                  {!noticeDeadline && (
                    <div className="mt-2.5 text-sm font-semibold text-[#e67e22]">+ Set deadline date</div>
                  )}
                </SummaryMetricCard>

                <SummaryMetricCard
                  label="Claimable Amount"
                  onEdit={() => setEditingAmount((current) => !current)}
                >
                  {editingAmount ? (
                    <input
                      type="text"
                      value={claimableAmount}
                      onChange={(event) => setClaimableAmount(event.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white p-3 text-[13px] font-semibold text-on-surface outline-none focus:border-[#e67e22] focus:ring-4 focus:ring-[#e67e22]/10"
                      placeholder="Not specified"
                    />
                  ) : (
                    <div className={`rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-[14px] ${displayClaimableAmount === 'Not specified' ? 'italic text-on-surface-variant' : 'font-bold text-on-surface'}`}>
                      {displayClaimableAmount}
                    </div>
                  )}
                  {displayClaimableAmount === 'Not specified' && (
                    <div className="mt-2.5 text-sm font-semibold text-[#e67e22]">+ Enter amount</div>
                  )}
                </SummaryMetricCard>
              </div>
            </section>

            <section className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface">Strategic Recommendation</div>
                  <p className="mt-4 max-w-[720px] text-[16px] leading-7 text-on-surface-variant">{analysis.strategicRecommendation}</p>
                </div>
                <span className="inline-flex items-center self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                  Recommended next move
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {topSupportingClauses.slice(0, 3).map((clause) => (
                  <span
                    key={clause.id}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant"
                  >
                    Source: {getClauseShortSourceRef(clause)}
                  </span>
                ))}
                <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                  Evidence confidence: {confidence}
                </span>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.95fr]">
        <div className="overflow-hidden rounded-[24px] border border-[#e67e22]/15 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface">Supporting Clauses</div>
              <p className="mt-2 text-sm text-on-surface-variant">
                Focused contract support for {activeIssue ? `"${activeIssue.title}"` : 'the current issue'}.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
              {topSupportingClauses.length} highlighted
            </span>
          </div>

          {topSupportingClauses.length > 0 ? (
            <div className="space-y-4">
              {topSupportingClauses.map((clause) => (
                <article key={clause.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface">
                    {getClauseShortSourceRef(clause)}
                  </div>
                  <div className="mt-3 text-lg font-bold text-on-surface">{clause.title}</div>
                  <p className="mt-3 text-sm leading-7 text-on-surface-variant">{clause.whyItMatters}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm leading-7 text-on-surface-variant">
              Clause support will appear here once the current issue has linked clause coverage in the workspace.
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-[24px] border border-[#e67e22]/15 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface">Key Risks</div>
              <p className="mt-2 text-sm text-on-surface-variant">Use these issue cards to shift the supporting-clause focus.</p>
            </div>
            {activeIssue && summaryIssues.length > 1 && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                Active: {activeIssue.title}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {analysis.keyRisks?.map((risk, index) => {
              const issueId = summaryIssues[index]?.id ?? `issue-${index}`;
              const isActive = issueId === activeIssueId;
              const tone =
                index < 2
                  ? 'border-[#e67e22]/40 bg-[#fef7ef]'
                  : index < 4
                    ? 'border-slate-200 bg-slate-50/80'
                    : 'border-slate-200 bg-white';

              return (
                <button
                  key={issueId}
                  type="button"
                  onClick={() => setActiveIssueId(issueId)}
                  className={`w-full rounded-[20px] border p-5 text-left transition-all ${tone} ${isActive ? 'ring-2 ring-[#e67e22]/50' : 'hover:-translate-y-0.5 hover:shadow-sm'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                        {index < 2 ? 'High priority' : index < 4 ? 'Moderate priority' : 'Monitor'}
                      </div>
                      <div className="mt-2 text-lg font-bold text-on-surface">{risk.title}</div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-slate-200 bg-white text-on-surface">
                      <AlertTriangle size={16} />
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-on-surface-variant">{risk.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <ActionHubCard
          label="Report"
          title="Open full analysis memo"
          description="Save the summary and move into the full 12-section report flow."
          statusLabel={reportReady ? 'Ready' : 'Generate'}
          statusTone={reportReady ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-on-surface-variant'}
          icon={<FileText size={20} />}
          onClick={() => void handleNavigateWithSave('/report')}
          cta="Continue to report"
        />
        <ActionHubCard
          label="Sources"
          title="Inspect clauses and citations"
          description="Jump into the document viewer and clause library without losing summary edits."
          statusLabel={citationsCount > 0 || clauses.length > 0 ? 'Loaded' : 'Review'}
          statusTone={citationsCount > 0 || clauses.length > 0 ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-on-surface-variant'}
          icon={<FileSearch size={20} />}
          onClick={() => void handleNavigateWithSave('/sources')}
          cta="Review sources"
        />
        <ActionHubCard
          label="Draft"
          title="Open response strategy"
          description="Save this decision framing and continue into the response letter and strategy workflow."
          statusLabel={draftReady ? 'Ready' : 'Generate'}
          statusTone={draftReady ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-on-surface-variant'}
          icon={<Sparkles size={20} />}
          onClick={() => void handleNavigateWithSave('/draft')}
          cta="Open draft workspace"
        />
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => void persistSummary()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-4 text-sm font-bold text-on-surface-variant transition-colors hover:border-[#e67e22]/40 hover:text-[#8b4e0e] disabled:opacity-60"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
          Save Summary
        </button>
        <button
          type="button"
          onClick={() => void handleNavigateWithSave('/report')}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-[16px] bg-[#e67e22] px-8 py-4 text-sm font-bold text-white shadow-[0_18px_40px_rgba(230,126,34,0.22)] transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-70"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
          Save & Open Report
        </button>
      </div>
    </div>
  );
}
