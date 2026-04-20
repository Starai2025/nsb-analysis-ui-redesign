import React, { useState, useRef, useEffect } from 'react';
import {
  FileText, AlertTriangle, Loader2, CheckCircle2,
  Download, RotateCcw, Sparkles, RefreshCw,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import { loadCurrentThread, saveCurrentThread, clearCurrentThread } from '../lib/db';
import {
  loadCurrentWorkspaceSnapshot, loadCurrentWorkspaceThreadView,
  loadCurrentProjectRecord, saveProjectRecord,
  saveReportVersionRecord, listReportVersionRecords,
} from '../lib/projectStore';
import { LEGACY_COMPAT_PROJECT_ID } from '../lib/storageAdapter';
import NoAnalysis from '../components/NoAnalysis';
import {
  Report, ReportStatus, AnalysisResult, ProjectData,
  ArcadisPosition, ClauseEntry, ClauseRecord, ScheduleImpact, NoticeRequirements,
  ReportMetadata, ReportVersionRecord,
} from '../types';
import { buildReportClauseEntries, CLAUSE_FAMILY_LABELS, getClauseShortSourceRef } from '../lib/clauseSurface';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeDate(value: string): string {
  if (!value || value === 'Not specified') return 'Not specified';
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function statusColor(v: string) {
  const map: Record<string, string> = {
    'In Scope': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Out of Scope': 'bg-rose-100 text-rose-800 border-rose-200',
    'Partially Out of Scope': 'bg-amber-100 text-amber-800 border-amber-200',
    'Unclear': 'bg-slate-100 text-slate-700 border-slate-200',
    'Likely Yes': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Possible': 'bg-amber-100 text-amber-800 border-amber-200',
    'Likely No': 'bg-rose-100 text-rose-800 border-rose-200',
    'Yes': 'bg-rose-100 text-rose-800 border-rose-200',
    'Likely': 'bg-amber-100 text-amber-800 border-amber-200',
    'No': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Not Enough Information': 'bg-slate-100 text-slate-700 border-slate-200',
    'Low': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Moderate': 'bg-amber-100 text-amber-800 border-amber-200',
    'High': 'bg-rose-100 text-rose-800 border-rose-200',
    'Critical': 'bg-rose-200 text-rose-900 border-rose-300',
  };
  return map[v] ?? 'bg-slate-100 text-slate-700 border-slate-200';
}

function DecisionBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs font-semibold text-slate-500 w-36 shrink-0">{label}</span>
      <span className={`text-xs font-bold px-2.5 py-1 rounded border ${statusColor(value)}`}>{value}</span>
    </div>
  );
}

function SectionHeading({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-5 pb-2 border-b border-slate-200">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] w-6 shrink-0">{String(n).padStart(2, '0')}</span>
      <h3 className="text-sm font-bold text-on-surface uppercase tracking-[0.12em]">{title}</h3>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PDF export — multi-page
// ---------------------------------------------------------------------------

async function exportMultiPagePDF(element: HTMLElement, filename: string): Promise<void> {
  const pdf      = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageW    = pdf.internal.pageSize.getWidth();
  const pageH    = pdf.internal.pageSize.getHeight();
  const margin   = 28;
  const contentW = pageW - margin * 2;
  const footerY = pageH - 12;
  const lineHeight = 14;
  const maxY = pageH - margin - 20;
  const text = element.innerText.replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  const paragraphs = text.split('\n');
  let cursorY = margin;

  const addFooter = () => {
    pdf.setFontSize(7);
    pdf.setTextColor(160, 160, 160);
    pdf.text('Never Sign Blind — Confidential — Change Order Analysis Report', pageW / 2, footerY, { align: 'center' });
  };

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(30, 41, 59);

  for (const paragraph of paragraphs) {
    const content = paragraph.trim() || ' ';
    const lines = pdf.splitTextToSize(content, contentW);

    for (const line of lines) {
      if (cursorY > maxY) {
        addFooter();
        pdf.addPage();
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(30, 41, 59);
        cursorY = margin;
      }
      pdf.text(line, margin, cursorY);
      cursorY += lineHeight;
    }

    cursorY += 6;
  }

  addFooter();
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function ProseSection({ n, title, content }: { n: number; title: string; content: string }) {
  return (
    <section className="break-inside-avoid">
      <SectionHeading n={n} title={title} />
      <div className="prose-memo">
        {content.split('\n\n').filter(Boolean).map((para, i) => (
          <p key={i} className="text-sm text-on-surface leading-relaxed mb-3 last:mb-0">{para}</p>
        ))}
      </div>
    </section>
  );
}

function PositionSection({ n, pos }: { n: number; pos: ArcadisPosition }) {
  return (
    <section className="break-inside-avoid">
      <SectionHeading n={n} title="Arcadis Position" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
          <DecisionBadge label="Scope Status"    value={pos.scopeStatus} />
          <div className="my-1 border-t border-slate-100" />
          <DecisionBadge label="Responsibility"  value={pos.responsibility} />
          <div className="my-1 border-t border-slate-100" />
          <DecisionBadge label="Fee Position"    value={pos.feePosition} />
          <div className="my-1 border-t border-slate-100" />
          <DecisionBadge label="Time Position"   value={pos.timePosition} />
        </div>
        <div className="flex items-center">
          <p className="text-sm text-on-surface leading-relaxed">{pos.explanation}</p>
        </div>
      </div>
    </section>
  );
}

function ClausesSection({ n, clauses }: { n: number; clauses: ClauseEntry[] }) {
  if (!clauses?.length) {
    return (
      <section className="break-inside-avoid">
        <SectionHeading n={n} title="Key Contract Clauses" />
        <p className="text-sm text-slate-400 italic">The current record does not provide enough support to confirm key clauses. Further contract review is required.</p>
      </section>
    );
  }
  return (
    <section className="break-inside-avoid">
      <SectionHeading n={n} title="Key Contract Clauses" />
      <div className="space-y-6">
        {clauses.map((c, i) => (
          <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-5 py-2.5 flex items-center gap-2 border-b border-slate-200">
              <ChevronRight size={12} className="text-slate-400" />
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{c.reference}</span>
            </div>
            <div className="px-5 py-4 space-y-3">
              <blockquote className="border-l-4 border-primary/30 pl-4 text-sm italic text-slate-600 leading-relaxed">
                {c.excerpt}
              </blockquote>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Meaning</span>
                  <p className="text-xs text-on-surface leading-relaxed">{c.meaning}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Why It Matters</span>
                  <p className="text-xs text-on-surface leading-relaxed">{c.whyItMatters}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ClauseAppendixSection({ clauses }: { clauses: ClauseRecord[] }) {
  if (clauses.length === 0) {
    return null;
  }

  return (
    <section className="break-inside-avoid">
      <div className="flex items-baseline gap-3 mb-5 pb-2 border-b border-slate-200">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] w-16 shrink-0">Appendix A</span>
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-[0.12em]">Full Clause Library</h3>
      </div>
      <div className="space-y-5">
        {clauses.map((clause) => (
          <article key={clause.id} className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  {getClauseShortSourceRef(clause)}
                </div>
                <div className="mt-1 text-sm font-bold text-on-surface">{clause.title}</div>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                {CLAUSE_FAMILY_LABELS[clause.clauseFamily]}
              </span>
            </div>
            <div className="space-y-4 px-5 py-4">
              <blockquote className="border-l-4 border-primary/30 pl-4 text-sm italic text-slate-600 leading-relaxed">
                {clause.excerpt}
              </blockquote>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Plain-English Meaning</span>
                <p className="text-xs text-on-surface leading-relaxed">{clause.plainEnglishMeaning}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Why It Matters</span>
                <p className="text-xs text-on-surface leading-relaxed">{clause.whyItMatters}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ScheduleSection({ n, s }: { n: number; s: ScheduleImpact }) {
  return (
    <section className="break-inside-avoid">
      <SectionHeading n={n} title="Schedule Impact" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
          <DecisionBadge label="Critical Path Impact" value={s.criticalPathImpact} />
          <div className="my-1 border-t border-slate-100" />
          <DecisionBadge label="Delay Risk Level"     value={s.delayRiskLevel} />
        </div>
        <div className="flex items-center">
          <p className="text-sm text-on-surface leading-relaxed">{s.explanation}</p>
        </div>
      </div>
    </section>
  );
}

function NoticeSection({ n, notice }: { n: number; notice: NoticeRequirements }) {
  return (
    <section className="break-inside-avoid">
      <SectionHeading n={n} title="Notice / Procedural Requirements" />
      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-2">
        <DecisionBadge label="Notice Required" value={notice.noticeRequired} />
        <div className="border-t border-slate-100" />
        <div className="flex items-start gap-3 py-1.5">
          <span className="text-xs font-semibold text-slate-500 w-36 shrink-0">Deadline</span>
          <span className="text-xs text-on-surface font-medium">{notice.deadline}</span>
        </div>
        <div className="border-t border-slate-100" />
        <div className="flex items-start gap-3 py-1.5">
          <span className="text-xs font-semibold text-slate-500 w-36 shrink-0">Recipient</span>
          <span className="text-xs text-on-surface font-medium">{notice.recipient}</span>
        </div>
        <div className="border-t border-slate-100" />
        <div className="flex items-start gap-3 py-1.5">
          <span className="text-xs font-semibold text-slate-500 w-36 shrink-0">Risk if Missed</span>
          <span className="text-xs text-on-surface font-medium">{notice.riskIfMissed}</span>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Full memo renderer
// ---------------------------------------------------------------------------

function ReportMemo({
  report,
  analysis,
  analysisDate,
  projectClauses,
}: {
  report: Report;
  analysis: AnalysisResult | null;
  analysisDate: string;
  projectClauses: ClauseRecord[];
}) {
  // Defensive fallback — metadata should always be present after the fix,
  // but guard against any stale cached data reaching this renderer
  const m: Report['metadata'] = report.metadata ?? {
    projectName:     report.title ?? '',
    contractNumber:  '',
    changeRequestId: '',
    ownerClient:     '',
    dateOfAnalysis:  analysisDate,
    reportStatus:    'Draft',
  };
  const s = report.sections;
  const keyClauses = s.keyContractClauses?.length > 0
    ? s.keyContractClauses
    : buildReportClauseEntries(projectClauses, analysis, 3);

  const subtitle = [m.projectName, m.contractNumber, m.changeRequestId]
    .filter(v => v && v !== 'Not specified' && v !== '')
    .join(' | ');

  const statusBadgeColor: Record<string, string> = {
    'Draft':      'bg-slate-100 text-slate-700 border-slate-300',
    'Ready':      'bg-emerald-100 text-emerald-700 border-emerald-300',
    'Updated':    'bg-blue-100 text-blue-700 border-blue-300',
    'Superseded': 'bg-slate-200 text-slate-500 border-slate-300',
  };

  return (
    <>
      {/* Memo header */}
      <div className="pb-8 mb-10 border-b-2 border-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-2">Never Sign Blind</p>
            <h1 className="text-2xl font-extrabold text-on-surface font-headline leading-tight">
              Change Order Analysis Report
            </h1>
            {subtitle && (
              <p className="text-sm text-on-surface-variant mt-1.5">{subtitle}</p>
            )}
          </div>
          <span id="reportStatusChip" className={`text-[10px] font-bold px-3 py-1.5 rounded border uppercase tracking-wider shrink-0 ${statusBadgeColor[m.reportStatus] ?? statusBadgeColor['Draft']}`}>
            {m.reportStatus}
          </span>
        </div>

        {/* Metadata block */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2">
          {[
            ['Project',        m.projectName],
            ['Contract No.',   m.contractNumber],
            ['Change Request', m.changeRequestId],
            ['Owner / Client', m.ownerClient],
            ['Date of Analysis', m.dateOfAnalysis || safeDate(analysisDate)],
          ].filter(([, v]) => v && v !== 'Not specified' && v !== '').map(([label, value]) => (
            <div key={label} className="flex items-baseline gap-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">{label}:</span>
              <span className="text-xs text-on-surface font-medium truncate">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 12 sections in locked order */}
      <div className="space-y-12">
        <ProseSection  n={1}  title="Executive Summary"           content={s.executiveSummary.content} />
        <ProseSection  n={2}  title="Owner / Client Request"      content={s.ownerRequest.content} />
        <PositionSection n={3} pos={s.arcadisPosition} />
        <ClausesSection  n={4} clauses={keyClauses} />
        <ProseSection  n={5}  title="Application"                 content={s.application.content} />
        <ProseSection  n={6}  title="Commercial Analysis"         content={s.commercialAnalysis.content} />
        <ScheduleSection n={7} s={s.scheduleImpact} />
        <NoticeSection   n={8} notice={s.noticeRequirements} />
        <ProseSection  n={9}  title="Risk & Mitigation"           content={s.riskAndMitigation.content} />
        <ProseSection  n={10} title="Recommendation"              content={s.recommendation.content} />
        <ProseSection  n={11} title="Draft Response"              content={s.draftResponse.content} />
        <ProseSection  n={12} title="Source Snapshot"             content={s.sourceSnapshot.content} />
        <ClauseAppendixSection clauses={projectClauses} />
      </div>

      {/* Footer */}
      <div className="mt-14 pt-6 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-medium">
        <span>Never Sign Blind — Confidential</span>
        {(m.dateOfAnalysis || analysisDate) && (
          <span>Analyzed {m.dateOfAnalysis || safeDate(analysisDate)}</span>
        )}
        <span>AI-Assisted Analysis</span>
      </div>

      {/* Legal disclaimer */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-[10px] text-amber-800 leading-relaxed">
          <strong>DISCLAIMER:</strong> This clause analysis is generated by an AI assistant and does not constitute legal advice.
          It is intended as a preliminary review tool to assist in understanding contract structure and content.
          This analysis may contain errors, miss important nuances, or misinterpret legal language.
          All findings should be reviewed by a qualified attorney licensed in the relevant jurisdiction before any decisions are made based on this analysis.
          No attorney-client relationship is created by the use of this tool.
        </p>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReportPage() {
  const navigate = useNavigate();

  const [reportStatus,   setReportStatus]   = useState<ReportStatus>('idle');
  const [report,         setReport]         = useState<Report | null>(null);
  const [analysis,       setAnalysis]       = useState<AnalysisResult | null>(null);
  const [projectData,    setProjectData]    = useState<ProjectData | null>(null);
  const [analysisDate,   setAnalysisDate]   = useState('');
  const [errorMsg,       setErrorMsg]       = useState('');
  const [exporting,      setExporting]      = useState(false);
  const [projectClauses, setProjectClauses] = useState<ClauseRecord[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);
  const autoGenerateAttemptedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const snapshot = await loadCurrentWorkspaceSnapshot();
        const thread = await loadCurrentWorkspaceThreadView() ?? await loadCurrentThread();
        if (!thread) { setReportStatus('idle'); return; }
        if (thread.analysis)    setAnalysis(thread.analysis);
        if (thread.projectData) setProjectData(thread.projectData);
        setProjectClauses(snapshot?.clauses ?? []);
        setAnalysisDate(thread.contract?.metadata?.uploadedAt ?? thread.createdAt ?? '');
        if (thread.report && thread.report.metadata && thread.report.sections?.ownerRequest !== undefined) {
          setReport(thread.report);
          setReportStatus('ready');
        } else {
          // Report exists but is stale/old schema (missing metadata or new sections) — clear it
          if (thread.report) {
            console.warn('Stale report shape detected — clearing for regeneration');
            await saveCurrentThread({ ...thread, report: undefined });
          }
          setReportStatus('idle');
        }
      } catch (err) {
        console.error('Failed to load thread:', err);
        setReportStatus('idle');
      }
    };
    load();
  }, []);

  const handleGenerate = async () => {
    setReportStatus('generating');
    setErrorMsg('');
    try {
      const thread = await loadCurrentWorkspaceThreadView() ?? await loadCurrentThread();
      const res  = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis:    thread?.analysis    ?? analysis,
          projectData: thread?.projectData ?? projectData,
          citations:   thread?.citations   ?? [],
          clauses:     buildReportClauseEntries(projectClauses, (thread?.analysis ?? analysis) ?? null, 5),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Report generation failed.');
      const newReport: Report = data.report;

      // saveCurrentThread preserves all evidence fields (contract, citations, etc.) automatically
      await saveCurrentThread({
        analysis:    analysis!,
        projectData: projectData ?? { name: '', contractNumber: '', changeRequestId: '' },
        report:      newReport,
      });

      // Also save a versioned record to the reports store for persistence across refreshes
      const project = await loadCurrentProjectRecord();
      const projectId = project?.id ?? LEGACY_COMPAT_PROJECT_ID;
      const existingVersions = await listReportVersionRecords(projectId);
      const versionRecord: ReportVersionRecord = {
        id: `${projectId}:report:v${existingVersions.length + 1}:${Date.now()}`,
        projectId,
        analysisId: project?.currentAnalysisId,
        versionNumber: existingVersions.length + 1,
        status: 'current',
        origin: 'generated',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        report: newReport,
      };
      await saveReportVersionRecord(versionRecord);
      if (project) {
        await saveProjectRecord({ ...project, currentReportId: versionRecord.id, updatedAt: versionRecord.createdAt });
      }

      setReport(newReport);
      setReportStatus('ready');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setReportStatus('failed');
    }
  };

  useEffect(() => {
    if (autoGenerateAttemptedRef.current || reportStatus !== 'idle' || !analysis) {
      return;
    }
    autoGenerateAttemptedRef.current = true;
    void handleGenerate();
  }, [analysis, projectClauses, projectData, reportStatus]);

  const handleRegenerate = async () => {
    setReport(null);
    setReportStatus('idle');
    const thread = await loadCurrentWorkspaceThreadView() ?? await loadCurrentThread();
    if (thread) await saveCurrentThread({ ...thread, report: undefined });
  };

  const handleExportPDF = async () => {
    if (!reportRef.current || reportStatus !== 'ready') return;
    setExporting(true);
    try {
      const slug = projectData?.name
        ? projectData.name.trim().replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        : 'report';
      await exportMultiPagePDF(reportRef.current, `${slug || 'report'}-report.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const handleNewAnalysis = async () => {
    await clearCurrentThread();
    navigate('/intake');
  };

  // ---------------------------------------------------------------------------
  // Lifecycle renders
  // ---------------------------------------------------------------------------

  const renderIdle = () => {
    if (!analysis) return <NoAnalysis currentStep="report" />;
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <FileText size={36} className="text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-on-surface">Report not yet generated</h3>
          <p className="text-on-surface-variant text-sm max-w-sm">
            Your analysis is ready. Generate the full Change Order Analysis Report.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          className="flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-dim transition-all shadow-lg active:scale-95"
        >
          <Sparkles size={18} /> Generate Report
        </button>
      </div>
    );
  };

  const renderGenerating = () => (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <Loader2 size={48} className="animate-spin text-primary" />
      <p className="text-on-surface font-bold text-lg">Generating Report...</p>
      <p className="text-on-surface-variant text-sm max-w-sm">
        Claude is writing your 12-section Change Order Analysis Report. This usually takes 30–60 seconds.
      </p>
    </div>
  );

  const renderFailed = () => (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
        <AlertTriangle size={28} className="text-rose-500" />
      </div>
      <p className="text-on-surface font-bold">Report generation failed</p>
      <p className="text-xs text-on-surface-variant max-w-sm">{errorMsg}</p>
      <button
        onClick={handleGenerate}
        className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-bold hover:bg-primary-dim transition-all"
      >
        <RefreshCw size={16} /> Try Again
      </button>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Page shell
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-5xl mx-auto py-12 px-12 space-y-10 print:p-0 print:max-w-none">

      {/* Header toolbar */}
      <div className="flex justify-between items-start print:hidden">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-extrabold text-on-surface tracking-tight font-headline">
              Analysis Report
            </h2>
            {reportStatus === 'ready' && (
              <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded border border-emerald-200">
                <CheckCircle2 size={12} /> Ready
              </span>
            )}
            {reportStatus === 'generating' && (
              <span className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase rounded border border-primary/20">
                <Loader2 size={12} className="animate-spin" /> Generating
              </span>
            )}
          </div>
          <p className="text-on-surface-variant text-sm">
            {projectData?.name
              ? `${projectData.name}${projectData.contractNumber ? ` | ${projectData.contractNumber}` : ''}`
              : 'Change Order Analysis'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleNewAnalysis}
            className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors px-3 py-2 rounded hover:bg-slate-50"
          >
            <RotateCcw size={14} /> New Analysis
          </button>
          {reportStatus === 'ready' && (
            <button
              onClick={handleRegenerate}
              className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors px-3 py-2 rounded hover:bg-slate-50"
            >
              <RefreshCw size={14} /> Regenerate
            </button>
          )}
          {/* PDF gated on ready */}
            <button
              id="exportReportBtn"
              onClick={handleExportPDF}
              disabled={reportStatus !== 'ready' || exporting}
              className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exporting
              ? <Loader2 className="text-primary animate-spin" size={18} />
              : <Download className="text-primary" size={18} />}
            <span className="font-headline font-bold text-xs uppercase tracking-widest">
              {exporting ? 'Exporting...' : 'Export PDF'}
            </span>
          </button>
        </div>
      </div>

      {/* Memo body */}
        <div
          id="reportCard"
          ref={reportRef}
          className="bg-white px-14 py-12 rounded-3xl shadow-xl border border-slate-100 print:shadow-none print:border-none print:rounded-none print:px-8 print:py-8 min-h-[500px]"
        >
        {reportStatus === 'idle'       && renderIdle()}
        {reportStatus === 'generating' && renderGenerating()}
        {reportStatus === 'failed'     && renderFailed()}
        {reportStatus === 'ready' && report && (
          <ReportMemo report={report} analysis={analysis} analysisDate={analysisDate} projectClauses={projectClauses} />
        )}
      </div>
    </div>
  );
}
