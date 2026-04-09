import React, { useState, useRef, useEffect } from 'react';
import {
  FileText, AlertTriangle, Banknote, CalendarClock,
  Loader2, CheckCircle2, Download, RotateCcw,
  ShieldAlert, TrendingUp, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { loadCurrentThread, saveCurrentThread, clearCurrentThread } from '../lib/db';

function safeDate(value: string): string {
  if (!value || value === 'Not specified') return 'Not specified';
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Risk Scorecard
// ---------------------------------------------------------------------------

interface RiskScore {
  score:  number;          // 0–100
  label:  'Low' | 'Moderate' | 'High';
  color:  string;          // Tailwind text color
  bg:     string;          // Tailwind bg color
  bar:    string;          // Tailwind bar fill color
  factors: string[];       // Human-readable contributing factors
}

function computeRiskScore(analysis: any): RiskScore {
  let score = 0;
  const factors: string[] = [];

  if (analysis.scopeStatus === 'Out of Scope') {
    score += 15;
    factors.push('Change is out of contract scope (+15)');
  }
  if (analysis.extraMoneyLikely) {
    score += 25;
    factors.push('Monetary claim likely (+25)');
  }
  if (analysis.extraTimeLikely) {
    score += 20;
    factors.push('Schedule impact likely (+20)');
  }
  const riskCount = analysis.keyRisks?.length ?? 0;
  const riskPoints = Math.min(riskCount * 8, 40);
  if (riskCount > 0) {
    score += riskPoints;
    factors.push(`${riskCount} key risk${riskCount > 1 ? 's' : ''} identified (+${riskPoints})`);
  }

  score = Math.min(score, 100);

  if (score <= 33) return { score, label: 'Low',      color: 'text-emerald-700', bg: 'bg-emerald-50',  bar: 'bg-emerald-500', factors };
  if (score <= 66) return { score, label: 'Moderate', color: 'text-amber-700',   bg: 'bg-amber-50',    bar: 'bg-amber-500',   factors };
  return              { score, label: 'High',     color: 'text-rose-700',    bg: 'bg-rose-50',     bar: 'bg-rose-500',    factors };
}

// ---------------------------------------------------------------------------
// PDF export — multi-page via image tiling
// ---------------------------------------------------------------------------

async function exportMultiPagePDF(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale:      2,
    useCORS:    true,
    logging:    false,
    width:      element.scrollWidth,
    windowWidth: element.scrollWidth,
  });

  const imgData    = canvas.toDataURL('image/png');
  const pdf        = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageW      = pdf.internal.pageSize.getWidth();
  const pageH      = pdf.internal.pageSize.getHeight();
  const margin     = 24; // pt
  const contentW   = pageW - margin * 2;
  const imgH       = (canvas.height * contentW) / canvas.width;
  const usableH    = pageH - margin * 2;

  let yRemaining   = imgH;
  let srcY         = 0;
  let isFirstPage  = true;

  while (yRemaining > 0) {
    if (!isFirstPage) pdf.addPage();
    isFirstPage = false;

    const sliceH    = Math.min(usableH, yRemaining);
    const srcRatio  = canvas.height / imgH;

    // Clip just the slice of the image for this page
    const sliceCanvas       = document.createElement('canvas');
    sliceCanvas.width       = canvas.width;
    sliceCanvas.height      = Math.ceil(sliceH * srcRatio);
    const ctx = sliceCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, Math.ceil(srcY * srcRatio), canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);

    pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, margin, contentW, sliceH);

    // Footer on every page
    pdf.setFontSize(7);
    pdf.setTextColor(160, 160, 160);
    pdf.text(
      'Never Sign Blind — Proprietary AI Analysis — Confidential',
      pageW / 2,
      pageH - 10,
      { align: 'center' }
    );

    srcY       += sliceH;
    yRemaining -= sliceH;
  }

  pdf.save(filename);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportPage() {
  const navigate = useNavigate();
  const [analysis,         setAnalysis]         = useState<any>(null);
  const [projectData,      setProjectData]       = useState<any>(null);
  const [analysisDate,     setAnalysisDate]      = useState<string>('');
  const [loading,          setLoading]           = useState(true);
  const [showSlowLoading,  setShowSlowLoading]   = useState(false);
  const [exporting,        setExporting]         = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const slowTimer = setTimeout(() => setShowSlowLoading(true), 5000);
    const load = async () => {
      try {
        const thread = await loadCurrentThread();
        if (thread?.analysis) {
          setAnalysis(thread.analysis);
          setProjectData(thread.projectData ?? null);
          setAnalysisDate(thread.contract?.metadata?.uploadedAt ?? thread.createdAt ?? '');
          return;
        }
        const res  = await fetch('/api/store');
        const data = await res.json();
        if (data.analysis) {
          setAnalysis(data.analysis);
          setProjectData(data.projectData ?? null);
          setAnalysisDate(data.contract?.metadata?.uploadedAt ?? '');
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

  const handleExportPDF = async () => {
    if (!reportRef.current || !analysis) return;
    setExporting(true);
    try {
      const slug     = projectData?.name ? projectData.name.replace(/\s+/g, '_') : 'Report';
      const dateStr  = new Date().toISOString().split('T')[0];
      const filename = `NeverSignBlind_${slug}_${dateStr}.pdf`;
      await exportMultiPagePDF(reportRef.current, filename);
    } finally {
      setExporting(false);
    }
  };

  const handleNewAnalysis = async () => {
    await clearCurrentThread();
    navigate('/intake');
  };

  const riskScore = analysis ? computeRiskScore(analysis) : null;
  const formattedAnalysisDate = analysisDate ? safeDate(analysisDate) : '';

  return (
    <div className="max-w-6xl mx-auto py-12 px-12 space-y-12 print:p-0 print:max-w-none">

      {/* Page header — hidden in print */}
      <div className="flex justify-between items-start print:hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-4xl font-extrabold text-on-surface tracking-tight leading-none font-headline">
              Detailed Analysis Report
            </h2>
            {!loading && analysis && (
              <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded border border-emerald-200">
                <CheckCircle2 size={12} /> Ready
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
          <button
            onClick={handleExportPDF}
            disabled={!analysis || exporting}
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
        className="space-y-16 bg-white p-12 rounded-3xl shadow-2xl border border-slate-100 relative overflow-hidden print:shadow-none print:border-none print:rounded-none print:p-8"
      >
        {loading || !analysis ? (
          <div className="text-center py-20 flex flex-col items-center gap-4 print:hidden">
            <Loader2 size={48} className="animate-spin text-primary" />
            <p className="text-on-surface-variant font-bold animate-pulse">Loading Report Data...</p>
            {showSlowLoading && (
              <p className="text-xs text-slate-500 animate-bounce">Preparing your detailed report...</p>
            )}
          </div>
        ) : (
          <>
            {/* Background watermark */}
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none print:hidden">
              <FileText size={400} />
            </div>

            {/* Report header (visible in PDF) */}
            <div className="flex items-start justify-between pb-8 border-b border-slate-200">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-1">Never Sign Blind</p>
                <h1 className="text-2xl font-extrabold text-on-surface font-headline">
                  {projectData?.name || 'Change Order Analysis Report'}
                </h1>
                {projectData?.contractNumber && (
                  <p className="text-sm text-on-surface-variant mt-1">Contract: {projectData.contractNumber}</p>
                )}
                {projectData?.changeRequestId && (
                  <p className="text-sm text-on-surface-variant">Change Request: {projectData.changeRequestId}</p>
                )}
              </div>
              <div className="text-right text-xs text-slate-400">
                {formattedAnalysisDate && <p>Analyzed: {formattedAnalysisDate}</p>}
                <p>Prepared by: Never Sign Blind AI</p>
              </div>
            </div>

            {/* ── Risk Scorecard ── */}
            {riskScore && (
              <section>
                <div className="flex items-center gap-4 mb-6">
                  <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-[0.2em]">Contract Risk Scorecard</h3>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
                <div className={`rounded-2xl p-8 border ${riskScore.bg} border-opacity-50 flex flex-col md:flex-row items-start md:items-center gap-8`}
                  style={{ borderColor: riskScore.score > 66 ? '#fecaca' : riskScore.score > 33 ? '#fde68a' : '#a7f3d0' }}>
                  {/* Score circle */}
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center ${riskScore.score > 66 ? 'border-rose-500' : riskScore.score > 33 ? 'border-amber-500' : 'border-emerald-500'}`}>
                      <span className={`text-3xl font-extrabold ${riskScore.color}`}>{riskScore.score}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${riskScore.color}`}>/ 100</span>
                    </div>
                    <span className={`text-sm font-extrabold uppercase tracking-widest ${riskScore.color}`}>{riskScore.label} Risk</span>
                  </div>

                  {/* Score bar + factors */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                        <span>Risk Score</span>
                        <span>{riskScore.score} / 100</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${riskScore.bar}`}
                          style={{ width: `${riskScore.score}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      {riskScore.factors.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                          <div className={`w-1.5 h-1.5 rounded-full ${riskScore.bar} shrink-0`} />
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick summary */}
                  <div className="flex flex-col gap-3 shrink-0">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <TrendingUp size={14} className={riskScore.color} />
                      <span className={riskScore.color}>
                        {analysis.extraMoneyLikely ? 'Money at risk' : 'No monetary risk'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Clock size={14} className={riskScore.color} />
                      <span className={riskScore.color}>
                        {analysis.extraTimeLikely ? 'Schedule at risk' : 'No schedule risk'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <ShieldAlert size={14} className={riskScore.color} />
                      <span className={riskScore.color}>
                        {analysis.keyRisks?.length ?? 0} key risk{(analysis.keyRisks?.length ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── Executive Summary ── */}
            <section>
              <div className="flex items-center gap-4 mb-6">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-[0.2em]">Executive Summary</h3>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="bg-slate-50 p-8 rounded-xl border border-slate-200">
                <p className="text-on-surface text-lg leading-relaxed font-medium">{analysis.executiveConclusion}</p>
              </div>
            </section>

            {/* ── Technical Validity & Risk ── */}
            <section>
              <div className="flex items-center gap-4 mb-6">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-[0.2em]">Detailed Analysis of Change Request</h3>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest border-b border-slate-100 pb-2">Technical Validity & Scope</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg">
                      <span className="text-sm font-bold text-on-surface-variant">Scope Status</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${analysis.scopeStatus === 'In Scope' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {analysis.scopeStatus}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg">
                      <span className="text-sm font-bold text-on-surface-variant">Primary Responsibility</span>
                      <span className="text-sm font-bold text-on-surface">{analysis.primaryResponsibility}</span>
                    </div>
                    <p className="text-sm text-on-surface leading-relaxed">{analysis.strategicRecommendation}</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest border-b border-slate-100 pb-2">Risk Assessment</h4>
                  <div className="space-y-4">
                    {analysis.keyRisks?.map((risk: any, i: number) => (
                      <div key={i} className="p-4 bg-rose-50 border border-rose-100 rounded-lg">
                        <div className="text-sm font-bold text-rose-700 flex items-center gap-2">
                          <AlertTriangle size={14} /> {risk.title}
                        </div>
                        <p className="text-xs text-rose-600 mt-1">{risk.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ── Financial & Schedule ── */}
            <section>
              <div className="flex items-center gap-4 mb-6">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-[0.2em]">Financial & Schedule Impact</h3>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="font-headline font-bold text-sm mb-6 flex items-center gap-2">
                    <Banknote className="text-primary" size={18} /> Budget Exposure
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-sm text-on-surface-variant">Claimable Amount</span>
                      <span className="text-2xl font-extrabold text-on-surface">{analysis.claimableAmount}</span>
                    </div>
                    <span className={`text-xs font-bold ${analysis.extraMoneyLikely ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {analysis.extraMoneyLikely ? 'Significant Budget Impact Likely' : 'Minimal Budget Impact Expected'}
                    </span>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="font-headline font-bold text-sm mb-6 flex items-center gap-2">
                    <CalendarClock className="text-primary" size={18} /> Timeline Variance
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-sm text-on-surface-variant">Estimated Delay</span>
                      <span className="text-2xl font-extrabold text-on-surface">{analysis.extraDays}</span>
                    </div>
                    <span className={`text-xs font-bold ${analysis.extraTimeLikely ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {analysis.extraTimeLikely ? 'Critical Path Impact Detected' : 'No Critical Path Impact'}
                    </span>
                    <div className="pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-400 uppercase font-bold">
                      <span>Notice Deadline</span>
                      <span>{safeDate(analysis.noticeDeadline)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Footer */}
            <div className="pt-8 border-t border-slate-200 flex justify-between items-center text-[10px] text-on-surface-variant uppercase tracking-widest font-medium">
              <span>Never Sign Blind — Confidential</span>
              {formattedAnalysisDate && <span>Analyzed {formattedAnalysisDate}</span>}
              <span>Proprietary AI Analysis</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
