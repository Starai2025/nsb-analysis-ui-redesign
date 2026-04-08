import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  ShieldCheck, 
  Banknote, 
  Clock, 
  CalendarClock, 
  Calculator,
  ArrowRight,
  History,
  CheckCircle2,
  User,
  Loader2
} from 'lucide-react';

export default function DecisionSummaryPage() {
  const [loading, setLoading] = useState(true);
  const [showSlowLoading, setShowSlowLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [claimableAmount, setClaimableAmount] = useState('');
  const [extraDays, setExtraDays] = useState('');
  const [secondaryResponsibility, setSecondaryResponsibility] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const slowTimer = setTimeout(() => {
      setShowSlowLoading(true);
    }, 5000);

    const fetchAnalysis = async () => {
      try {
        const response = await fetch('/api/store');
        const data = await response.json();
        if (data.analysis) {
          setAnalysis(data.analysis);
          setClaimableAmount(data.analysis.claimableAmount);
          setExtraDays(data.analysis.extraDays);
          setSecondaryResponsibility(data.analysis.secondaryResponsibility);
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

  const handleSaveAndGenerate = async () => {
    setSaving(true);
    try {
      const updatedAnalysis = {
        ...analysis,
        claimableAmount,
        extraDays,
        secondaryResponsibility
      };

      const response = await fetch('/api/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: updatedAnalysis })
      });

      if (!response.ok) throw new Error('Failed to save changes');

      window.location.href = '/report';
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
        <Loader2 size={48} className="animate-spin text-primary" />
        <div className="text-center">
          <p className="text-on-surface-variant font-bold animate-pulse">Loading Analysis Results...</p>
          {showSlowLoading && (
            <p className="text-xs text-slate-500 mt-2 animate-bounce">
              Still working... complex documents can take up to a minute.
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
        <p className="text-on-surface-variant font-bold">No analysis found. It might still be processing or failed to save.</p>
        <div className="flex gap-4">
          <button 
            onClick={() => window.location.reload()}
            className="bg-slate-100 text-on-surface px-6 py-2 rounded-lg font-bold hover:bg-slate-200 transition-all"
          >
            Refresh Page
          </button>
          <button 
            onClick={() => window.location.href = '/intake'}
            className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-dim transition-all"
          >
            Go to Intake
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">Project ID: NSB-2024-082</span>
          <span className="text-on-surface-variant text-sm flex items-center gap-1">
            <History size={14} />
            Last updated just now
          </span>
        </div>
        <h1 className="text-4xl font-extrabold text-on-surface leading-tight font-headline">Decision Summary</h1>
        <p className="text-on-surface-variant max-w-2xl text-lg">
          Automated assessment for the uploaded documentation.
        </p>
      </section>

      <section className="bg-primary/5 border border-primary/10 rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
          <ShieldCheck className="text-primary/20" size={48} />
        </div>
        <div className="relative z-10 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Executive Conclusion</h2>
          <p className="text-on-surface text-xl font-medium leading-relaxed max-w-4xl">
            {analysis.executiveConclusion}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Scope Status */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-rose-500 hover:-translate-y-1 transition-all">
          <div className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-4">Scope Status</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-on-surface leading-tight">{analysis.scopeStatus}</div>
            <AlertTriangle className="text-rose-500 opacity-80" size={32} />
          </div>
          <div className="mt-4 text-sm font-medium text-rose-500 flex items-center gap-1">
            Verified Analysis
          </div>
        </div>

        {/* Responsibility */}
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
                value={secondaryResponsibility}
                onChange={(e) => setSecondaryResponsibility(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm font-bold text-on-surface focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>
        </div>

        {/* Extra Money */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-emerald-500 hover:-translate-y-1 transition-all">
          <div className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-4">Extra Money?</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-on-surface leading-tight">{analysis.extraMoneyLikely ? 'Likely Yes' : 'Unlikely'}</div>
            <Banknote className="text-emerald-500 opacity-80" size={32} />
          </div>
        </div>

        {/* Extra Time */}
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

        {/* Notice Deadline */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-rose-500 hover:-translate-y-1 transition-all">
          <div className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-4">Notice Deadline</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-on-surface leading-tight">
              {new Date(analysis.noticeDeadline).toLocaleDateString()}
            </div>
            <CalendarClock className="text-rose-500 opacity-80" size={32} />
          </div>
        </div>

        {/* Claimable Amount */}
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

      <section className="bg-slate-900 text-white rounded-2xl p-10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[120px] -mr-48 -mt-48"></div>
        <div className="relative z-10 grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold flex items-center gap-2 font-headline">
                <ShieldCheck className="text-primary" />
                Strategic Recommendation
              </h2>
              <p className="text-slate-300">{analysis.strategicRecommendation}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold flex items-center gap-2 font-headline">
                <AlertTriangle className="text-rose-500" />
                Key Risks
              </h2>
              <p className="text-slate-300">Potential hurdles identified by AI analysis.</p>
            </div>
            <div className="space-y-4">
              {analysis.keyRisks.map((risk: any, index: number) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-white/5 hover:bg-white/10 transition-colors rounded-xl border border-white/10">
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

      <div className="flex justify-center gap-6">
        <button className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant hover:text-primary transition-colors">Compare with AIA A201</button>
        <button className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant hover:text-primary transition-colors">Export Legal Memo</button>
        <button className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant hover:text-primary transition-colors">Email to Counsel</button>
      </div>
    </div>
  );
}
