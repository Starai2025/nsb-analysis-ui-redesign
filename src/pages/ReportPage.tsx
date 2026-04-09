import React, { useState, useRef, useEffect } from 'react';
import {
  FileText, AlertTriangle, Banknote, CalendarClock,
  Loader2, CheckCircle2, Download, RotateCcw,
  ShieldAlert, TrendingUp, Clock, Sparkles, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { loadCurrentThread, saveCurrentThread, clearCurrentThread } from '../lib/db';
import { Report, ReportStatus, AnalysisResult, ProjectData } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeDate(value: string): string {
  if (!value || value === 'Not specified') return 'Not specified';
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

interface RiskScore {
  score:   number;
  label:   'Low' | 'Moderate' | 'High';
  color:   string;
  bg:      string;
  bar:     string;
  factors: string[];
}

function computeRiskScore(analysis: AnalysisResult): RiskScore {
  let score = 0;
  const factors: string[] = [];
  if (analysis.scopeStatus === 'Out of Scope')  { score += 15; factors.push('Change is out of contract scope (+15)'); }
  if (analysis.extraMoneyLikely)                { score += 25; factors.push('Monetary claim likely (+25)'); }
  if (analysis.extraTimeLikely)                 { score += 20; factors.push('Schedule impact likely (+20)'); }
  const rc = analysis.keyRisks?.length ?? 0;
  const rp = Math.min(rc * 8, 40);
  if (rc > 0) { score += rp; factors.push(`${rc} key risk${rc > 1 ? 's' : ''} identified (+${rp})`); }
  score = Math.min(score, 100);
  if (score <= 33) return { score, label: 'Low',      color: 'text-emerald-700', bg: 'bg-emerald-50',  bar: 'bg-emerald-500', factors };
  if (score <= 66) return { score, label: 'Moderate', color: 'text-amber-700',   bg: 'bg-amber-50',    bar: 'bg-amber-500',   factors };
  return              { score, label: 'High',     color: 'text-rose-700',    bg: 'bg-rose-50',     bar: 'bg-rose-500',    factors };
}

// ---------------------------------------------------------------------------
// Multi-page PDF export
// ---------------------------------------------------------------------------

async function exportMultiPagePDF(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2, useCORS: true, logging: false,
    width: element.scrollWidth, windowWidth: element.scrollWidth,
  });
  const imgData  = canvas.toDataURL('image/png');
  const pdf      = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageW    = pdf.internal.pageSize.getWidth();
  const pageH    = pdf.internal.pageSize.getHeight();
  const margin   = 24;
  const contentW = pageW - margin * 2;
  const imgH     = (canvas.height * contentW) / canvas.width;
  const usableH  = pageH - margin * 2;
  let yRemaining = imgH, srcY = 0, isFirstPage = true;

  while (yRemaining > 0) {
    if (!isFirstPage) pdf.addPage();
    isFirstPage = false;
    const sliceH = Math.min(usableH, yRemaining);
    const sliceCanvas        = document.createElement('canvas');
    sliceCanvas.width        = canvas.width;
    sliceCanvas.height       = Math.ceil(sliceH * (canvas.height / imgH));
    sliceCanvas.getContext('2d')!.drawImage(
      canvas, 0, Math.ceil(srcY * (canvas.height / imgH)),
      canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height
    );
    pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, margin, contentW, sliceH);
    pdf.setFontSize(7);
    pdf.setTextColor(160, 160, 160);
    pdf.text('Never Sign Blind — Proprietary AI Analysis — Confidential', pageW / 2, pageH - 10, { align: 'center' });
    srcY += sliceH;
    yRemaining -= sliceH;
  }
  pdf.save(filename);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportPage() {
  const navigate = useNavigate();

  // Report lifecycle — this replaces "analysis exists = ready"
  const [reportStatus,     setReportStatus]     = useState<ReportStatus>('idle');
  const [report,           setReport]           = useState<Report | null>(null);
  const [analysis,         setAnalysis]         = useState<AnalysisResult | null>(null);
  const [projectData,      setProjectData]       = useState<ProjectData | null>(null);
  const [analysisDate,     setAnalysisDate]      = useState('');
  const [errorMsg,         setErrorMsg]          = useState('');
  const [exporting,        setExporting]         = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Load from IndexedDB on mount
  useEffect(() => {
    const load = async () => {
      try {
        const thread = await loadCurrentThread();
        if (!thread) { setReportStatus('idle'); return; }

        if (thread.analysis)    setAnalysis(thread.analysis);
        if (thread.projectData) setProjectData(thread.projectData);
        setAnalysisDate(thread.contract?.metadata?.uploadedAt ?? thread.createdAt ?? '');

        if (thread.report) {
          setReport(thread.report);
          setReportStatus('ready');
        } else if (thread.analysis) {
          // Analysis exists but no report yet — prompt user to generate
          setReportStatus('idle');
        }
      } catch (err) {
        console.error('Failed to load thread:', err);
        setReportStatus('idle');
      }
    };
    load();
  }, []);

  // Generate report from server
  const handleGenerate = async () => {
    setReportStatus('generating');
    setErrorMsg('');
    try {
      const res  = await fetch('/api/generate-report', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Report generation failed.');

      const newReport: Report = data.report;

      // Persist to IndexedDB
      await saveCurrentThread({
        analysis:    analysis!,
        projectData: projectData ?? { name: '', contractNumber: '', changeRequestId: '' },
        report:      newReport,
      });

      setReport(newReport);
      setReportStatus('ready');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMsg(msg);
      setReportStatus('failed');
    }
  };

  const handleRegenerate = async () => {
    setReport(null);
    setReportStatus('idle');
    // Clear report from IndexedDB
    const thread = await loadCurrentThread();
    if (thread) {
      await saveCurrentThread({
        ...thread,
        report: undefined,
      });
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current || reportStatus !== 'ready') return;
    setExporting(true);
    try {
      const slug     = projectData?.name ? projectData.name.replace(/\s+/g, '_') : 'Report';
      const dateStr  = new Date().toISOString().split('T')[0];
      await exportMultiPagePDF(reportRef.current, `NeverSignBlind_${slug}_${dateStr}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const handleNewAnalysis = async () => {
    await clearCurrentThread();
    navigate('/intake');
  };

  const riskScore          = analysis ? computeRiskScore(analysis) : null;
  const formattedAnalysisDate = analysisDate ? safeDate(analysisDate) : '';

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderIdle = () => (
    <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
        <FileText size={36} className="text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-on-surface">
          {analysis ? 'Report not yet generated' : 'No analysis found'}
        </h3>
        <p className="text-on-surface-variant text-sm max-w-sm">
          {analysis
            ? 'Your analysis is ready. Generate the formal report to produce the full written document.'
            : 'Complete an analysis on the Intake page before generating a report.'}
        </p>
      </div>
      {analysis ? (
        <button
          onClick={handleGenerate}
          className="flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-dim transition-all shadow-lg active:scale-95"
        >
          <Sparkles size={18} /> Generate Report
        </button>
      ) : (
        <button
          onClick={() => navigate('/intake')}
          className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold hover:bg-primary-dim transition-all"
        >
          Go to Intake
        </button>
      )}
    </div>
  );

  const renderGenerating = () => (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <Loader2 size={48} className="animate-spin text-primary" />
      <p className="text-on-surface font-bold text-lg">Generating Report...</p>
      <p className="text-on-surface-variant text-sm">Claude is writing your formal analysis report. This usually takes 20–40 seconds.</p>
    </div>
  );

  const renderFailed = () => (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
        <AlertTriangle size={28} className="text-rose-500" />
      </div>
      <div className="space-y-2">
        <p className="text-on-surface font-bold">Report generation failed</p>
        <p className="text-xs text-on-surface-variant max-w-sm">{errorMsg}</p>
      </div>
      <button
        onClick={handleGenerate}
        className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-bold hover:bg-primary-dim transition-all"
      >
        <RefreshCw size={16} /> Try Again
      </button>
    </div>
  );

  const renderReport = (r: Report) => (
    <>
      {/* Background watermark */}
      <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none print:hidden">
        <FileText size={400} />
      </div>

      {/* Report header */}
      <div className="flex items-start justify-between pb-8 border-b border-slate-200">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-1">Never Sign Blind</p>
          <h1 className="text-2xl font-extrabold text-on-surface font-headline">{r.title}</h1>
          {projectData?.contractNumber && (
            <p className="text-sm text-on-surface-variant mt-1">Contract: {projectData.contractNumber}</p>
          )}
          {projectData?.changeRequestId && (
            <p className="text-sm text-on-surface-variant">Change Request: {projectData.changeRequestId}</p>
          )}
        </div>
        <div className="text-right text-xs text-slate-400 shrink-0">
          {formattedAnalysisDate && <p>Analyzed: {formattedAnalysisDate}</p>}
          <p>Generated: {safeDate(r.createdAt)}</p>
        </div>
      </div>

      {/* Risk Scorecard — derived from analysis data */}
      {riskScore && (
        <section>
          <div className="flex items-center gap-4 mb-6">
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-[0.2em]">Contract Risk Scorecard</h3>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <div
            className={`rounded-2xl p-8 border ${riskScore.bg} flex flex-col md:flex-row items-start md:items-center gap-8`}
            style={{ borderColor: riskScore.score > 66 ? '#fecaca' : riskScore.score > 33 ? '#fde68a' : '#a7f3d0' }}
          >
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center ${riskScore.score > 66 ? 'border-rose-500' : riskScore.score > 33 ? 'border-amber-500' : 'border-emerald-500'}`}>
                <span className={`text-3xl font-extrabold ${riskScore.color}`}>{riskScore.score}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${riskScore.color}`}>/ 100</span>
              </div>
              <span className={`text-sm font-extrabold uppercase tracking-widest ${riskScore.color}`}>{riskScore.label} Risk</span>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>Risk Score</span><span>{riskScore.score} / 100</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div className={`h-3 rounded-full ${riskScore.bar}`} style={{ width: `${riskScore.score}%` }} />
                </div>
              </div>
              <div className="space-y-1">
                {riskScore.factors.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                    <div className={`w-1.5 h-1.5 rounded-full ${riskScore.bar} shrink-0`} />{f}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold">
                <TrendingUp size={14} className={riskScore.color} />
                <span className={riskScore.color}>{analysis?.extraMoneyLikely ? 'Money at risk' : 'No monetary risk'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <Clock size={14} className={riskScore.color} />
                <span className={riskScore.color}>{analysis?.extraTimeLikely ? 'Schedule at risk' : 'No schedule risk'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <ShieldAlert size={14} className={riskScore.color} />
                <span className={riskScore.color}>{analysis?.keyRisks?.length ?? 0} key risk{(analysis?.keyRisks?.length ?? 0) !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Report sections — rendered from report.sections, not from analysis */}
      {([
        'executiveSummary',
        'scopeAndResponsibility',
        'commercialAnalysis',
        'scheduleImpact',
        'recommendation',
      ] as const).map((key) => {
        const section = r.sections[key];
        return (
          <section key={key}>
            <div className="flex items-center gap-4 mb-6">
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-[0.2em]">
                {section.heading}
              </h3>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="bg-slate-50 p-8 rounded-xl border border-slate-200">
              <p className="text-on-surface text-sm leading-relaxed whitespace-pre-line">{section.content}</p>
            </div>
          </section>
        );
      })}

      {/* Footer */}
      <div className="pt-8 border-t border-slate-200 flex justify-between items-center text-[10px] text-on-surface-variant uppercase tracking-widest font-medium">
        <span>Never Sign Blind — Confidential</span>
        {formattedAnalysisDate && <span>Analyzed {formattedAnalysisDate}</span>}
        <span>Proprietary AI Analysis</span>
      </div>
    </>
  );

  // ---------------------------------------------------------------------------
  // Page
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-6xl mx-auto py-12 px-12 space-y-12 print:p-0 print:max-w-none">

      {/* Page header */}
      <div className="flex justify-between items-start print:hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-4xl font-extrabold text-on-surface tracking-tight leading-none font-headline">
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
          <p className="text-on-surface-variant font-medium">
            {projectData?.name
              ? `${projectData.name}${projectData.contractNumber ? ` | ${projectData.contractNumber}` : ''}`
              : 'Change Order Analysis'}
            {formattedAnalysisDate && (
              <span className="ml-3 text-slate-400 text-xs">Analyzed {formattedAnalysisDate}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
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
          {/* PDF export — disabled unless report is ready */}
          <button
            onClick={handleExportPDF}
            disabled={reportStatus !== 'ready' || exporting}
            className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded shadow-sm hover:shadow-md transition-all active:scale-95 text-on-surface disabled:opacity-40 disabled:cursor-not-allowed"
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

      {/* Report body */}
      <div
        ref={reportRef}
        className="space-y-16 bg-white p-12 rounded-3xl shadow-2xl border border-slate-100 relative overflow-hidden print:shadow-none print:border-none print:rounded-none print:p-8 min-h-[400px]"
      >
        {reportStatus === 'idle'       && renderIdle()}
        {reportStatus === 'generating' && renderGenerating()}
        {reportStatus === 'failed'     && renderFailed()}
        {reportStatus === 'ready' && report && renderReport(report)}
      </div>
    </div>
  );
}
