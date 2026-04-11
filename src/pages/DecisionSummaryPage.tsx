import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ShieldCheck, Banknote, Clock,
  CalendarClock, Calculator, History, CheckCircle2,
  Loader2, RotateCcw
} from 'lucide-react';
import { loadCurrentThread, saveCurrentThread, clearCurrentThread } from '../lib/db';

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

  useEffect(() => {
    const slowTimer = setTimeout(() => setShowSlowLoading(true), 5000);

    const load = async () => {
      try {
        // Primary: IndexedDB
        const thread = await loadCurrentThread();
        if (thread?.analysis) {
          setAnalysis(thread.analysis);
          setProjectData(thread.projectData ?? null);
          setClaimableAmount(thread.analysis.claimableAmount ?? '');
          setExtraDays(thread.analysis.extraDays ?? '');
          setSecondaryResp(thread.analysis.secondaryResponsibility ?? '');
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
          // Backfill IndexedDB from server — spread existing to preserve contract/citations/report
          const existing = await loadCurrentThread();
          await saveCurrentThread({
            ...(existing ?? {}),
            analysis:    data.analysis,
            projectData: data.projectData ?? { name: '', contractNumber: '', changeRequestId: '' },
          } as any);
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

  const handleSaveAndGenerate = async () => {
    setSaving(true);
    try {
      const updatedAnalysis = {
        ...analysis,
        claimableAmount,
        extraDays,
        secondaryResponsibility: secondaryResp,
      };
      // Save edits to IndexedDB — spread existing thread to preserve contract/citations/report/draft
      const existingThread = await loadCurrentThread();
      await saveCurrentThread({
        ...(existingThread ?? {}),
        analysis:    updatedAnalysis,
        projectData: projectData ?? { name: '', contractNumber: '', changeRequestId: '' },
      } as any);
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
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
        <AlertTriangle size={48} className="text-amber-500" />
        <p className="text-on-surface-variant font-bold">No analysis found. Please run an analysis first.</p>
        <button
          onClick={() => navigate('/intake')}
          className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-dim transition-all"
        >
          Go to Intake
        </button>
      </div>
    );
  }

  const projectLabel = projectData?.name
    ? `${projectData.name}${projectData.changeRequestId ? ` — ${projectData.changeRequestId}` : ''}`
    : null;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      {/* Header */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {projectLabel && (
              <span className="bg-primary/10 text-primary px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">
                {projectLabel}
              </span>
            )}
            {projectData?.contractNumber && (
              <span className="text-on-surface-variant text-sm flex items-center gap-1">
                <History size={14} /> {projectData.contractNumber}
              </span>
            )}
          </div>
          <button
            onClick={handleNewAnalysis}
            className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors"
          >
            <RotateCcw size={14} /> New Analysis
          </button>
        </div>
        <h1 className="text-4xl font-extrabold text-on-surface leading-tight font-headline">Decision Summary</h1>
        <p className="text-on-surface-variant max-w-2xl text-lg">Automated assessment for the uploaded documentation.</p>
      </section>

      {/* Executive Conclusion */}
      <section className="bg-primary/5 border border-primary/10 rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
          <ShieldCheck className="text-primary/20" size={48} />
        </div>
        <div className="relative z-10 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Executive Conclusion</h2>
          <p className="text-on-surface text-xl font-medium leading-relaxed max-w-4xl">{analysis.executiveConclusion}</p>
        </div>
      </section>

      {/* Metric Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-rose-500 hover:-translate-y-1 transition-all">
          <div className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-4">Scope Status</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-on-surface leading-tight">{analysis.scopeStatus}</div>
            <AlertTriangle className="text-rose-500 opacity-80" size={32} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-primary hover:-translate-y-1 transition-all">
          <div className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-4">Responsibility</div>
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Primary</div>
                <div className="text-2xl font-bold text-on-surface leading-tight">{analysis.primaryResponsibility}</div>
              </div>
              <ShieldCheck className="text-primary opacity-80" size={32} />
            </div>
            <div className="pt-3 border-t border-slate-100">
              <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Secondary</div>
              <input
                type="text"
                value={secondaryResp}
                onChange={(e) => setSecondaryResp(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm font-bold text-on-surface focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-emerald-500 hover:-translate-y-1 transition-all">
          <div className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-4">Extra Money?</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-on-surface leading-tight">{analysis.extraMoneyLikely ? 'Likely Yes' : 'Unlikely'}</div>
            <Banknote className="text-emerald-500 opacity-80" size={32} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-amber-500 hover:-translate-y-1 transition-all">
          <div className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-4">Extra Time?</div>
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold text-on-surface leading-tight">{analysis.extraTimeLikely ? 'Possibly' : 'No'}</div>
              <Clock className="text-amber-500 opacity-80" size={32} />
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Days:</div>
              <input
                type="text"
                value={extraDays}
                onChange={(e) => setExtraDays(e.target.value)}
                className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm font-bold text-on-surface focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-rose-500 hover:-translate-y-1 transition-all">
          <div className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-4">Notice Deadline</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-on-surface leading-tight">{safeDate(analysis.noticeDeadline)}</div>
            <CalendarClock className="text-rose-500 opacity-80" size={32} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-primary hover:-translate-y-1 transition-all">
          <div className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-4">Claimable Amount</div>
          <div className="space-y-3">
            <input
              type="text"
              value={claimableAmount}
              onChange={(e) => setClaimableAmount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xl font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none"
            />
            <div className="flex items-center justify-end">
              <Calculator className="text-primary opacity-80" size={24} />
            </div>
          </div>
        </div>
      </section>

      {/* Strategic Recommendation + Key Risks */}
      <section className="bg-slate-900 text-white rounded-2xl p-10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[120px] -mr-48 -mt-48" />
        <div className="relative z-10 grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold flex items-center gap-2 font-headline">
                <ShieldCheck className="text-primary" /> Strategic Recommendation
              </h2>
              <p className="text-slate-300">{analysis.strategicRecommendation}</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold flex items-center gap-2 font-headline">
                <AlertTriangle className="text-rose-500" /> Key Risks
              </h2>
            </div>
            <div className="space-y-4">
              {analysis.keyRisks?.map((risk: any, i: number) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-white/5 hover:bg-white/10 transition-colors rounded-xl border border-white/10">
                  <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="text-rose-500" size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold">{risk.title}</div>
                    <div className="text-xs text-slate-400 mt-1">{risk.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex justify-center gap-6">
        <button
          onClick={handleSaveAndGenerate}
          disabled={saving}
          className="bg-primary text-white px-10 py-4 rounded-xl font-bold shadow-xl hover:bg-primary-dim transition-all active:scale-95 flex items-center gap-2"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
          Save & Generate Full Report
        </button>
      </div>
    </div>
  );
}
