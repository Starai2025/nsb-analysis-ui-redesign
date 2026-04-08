import React, { useState, useRef, useEffect } from 'react';
import {
  FileText, AlertTriangle, Banknote, CalendarClock,
  Loader2, CheckCircle2, Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function safeDate(value: string): string {
  if (!value || value === 'Not specified') return 'Not specified';
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export default function ReportPage() {
  const [analysis,        setAnalysis]        = useState<any>(null);
  const [projectData,     setProjectData]     = useState<any>(null);
  const [loading,         setLoading]         = useState(true);
  const [showSlowLoading, setShowSlowLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const slowTimer = setTimeout(() => setShowSlowLoading(true), 5000);
    const fetchAnalysis = async () => {
      try {
        const response = await fetch('/api/store');
        const data = await response.json();
        if (data.analysis) {
          setAnalysis(data.analysis);
          setProjectData(data.projectData ?? null);
        }
      } catch (error) {
        console.error('Failed to fetch analysis:', error);
      } finally {
        setLoading(false);
        clearTimeout(slowTimer);
      }
    };
    fetchAnalysis();
    return () => clearTimeout(slowTimer);
  }, []);

  const exportPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL('image/png');
    const projectSlug = projectData?.name ? projectData.name.replace(/\s+/g, '_') : 'Report';
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`NeverSignBlind_${projectSlug}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-12 space-y-12">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-4xl font-extrabold text-on-surface tracking-tight leading-none font-headline">Detailed Analysis Report</h2>
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
          </p>
        </div>
        <button
          onClick={exportPDF}
          disabled={!analysis}
          className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded shadow-sm hover:shadow-md transition-all active:scale-95 text-on-surface disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="text-primary" size={18} />
          <span className="font-headline font-bold text-xs uppercase tracking-widest">Export PDF</span>
        </button>
      </div>

      <div ref={reportRef} className="space-y-20 bg-white p-12 rounded-3xl shadow-2xl border border-slate-100 relative overflow-hidden">
        {loading || !analysis ? (
          <div className="text-center py-20 flex flex-col items-center gap-4">
            <Loader2 size={48} className="animate-spin text-primary" />
            <p className="text-on-surface-variant font-bold animate-pulse">Loading Report Data...</p>
            {showSlowLoading && (
              <p className="text-xs text-slate-500 animate-bounce">Preparing your detailed report...</p>
            )}
          </div>
        ) : (
          <>
            {/* Watermark */}
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
              <FileText size={400} />
            </div>

            {/* Executive Summary */}
            <section>
              <div className="flex items-center gap-4 mb-8">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-[0.2em]">Executive Summary</h3>
                <span className="h-px flex-1 bg-slate-200"></span>
              </div>
              <div className="bg-slate-50 p-8 rounded-xl border border-slate-200">
                <p className="text-on-surface text-lg leading-relaxed font-medium">{analysis.executiveConclusion}</p>
              </div>
            </section>

            {/* Technical Validity & Risk */}
            <section>
              <div className="flex items-center gap-4 mb-8">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-[0.2em]">Detailed Analysis of Change Request</h3>
                <span className="h-px flex-1 bg-slate-200"></span>
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
                    <p className="text-sm text-on-surface leading-relaxed">{analysis.strategicRecommendation}</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest border-b border-slate-100 pb-2">Risk Assessment</h4>
                  <div className="space-y-4">
                    {analysis.keyRisks?.map((risk: any, index: number) => (
                      <div key={index} className="p-4 bg-rose-50 border border-rose-100 rounded-lg">
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

            {/* Financial & Schedule */}
            <section>
              <div className="flex items-center gap-4 mb-8">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-[0.2em]">Financial & Schedule Impact</h3>
                <span className="h-px flex-1 bg-slate-200"></span>
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
                    <div className="text-xs font-bold">
                      <span className={analysis.extraMoneyLikely ? 'text-rose-500' : 'text-emerald-500'}>
                        {analysis.extraMoneyLikely ? 'Significant Budget Impact Likely' : 'Minimal Budget Impact Expected'}
                      </span>
                    </div>
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
                    <div className="text-xs font-bold">
                      <span className={analysis.extraTimeLikely ? 'text-rose-500' : 'text-emerald-500'}>
                        {analysis.extraTimeLikely ? 'Critical Path Impact Detected' : 'No Critical Path Impact'}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold">
                        <span>Notice Deadline</span>
                        <span>{safeDate(analysis.noticeDeadline)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="pt-16 border-t border-slate-200 text-center">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-medium">Never Sign Blind — Proprietary AI Analysis — Confidential Document</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
