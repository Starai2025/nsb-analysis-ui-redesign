import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Gavel, FileText, PenLine, ArrowRight, CheckCircle2 } from 'lucide-react';

interface NoAnalysisProps {
  currentStep: 'summary' | 'report' | 'sources' | 'draft';
}

const STEPS = [
  { id: 'intake',   label: 'Upload & Analyze',  icon: Upload,    path: '/intake'  },
  { id: 'summary',  label: 'Review Summary',     icon: Gavel,     path: '/summary' },
  { id: 'report',   label: 'Generate Report',    icon: FileText,  path: '/report'  },
  { id: 'draft',    label: 'Draft Response',     icon: PenLine,   path: '/draft'   },
];

const STEP_ORDER = ['intake', 'summary', 'report', 'sources', 'draft'];

const MESSAGES: Record<string, { title: string; body: string }> = {
  summary: {
    title: 'No analysis yet',
    body:  'Upload your contract and correspondence to begin. The analysis takes about 60 seconds.',
  },
  report: {
    title: 'No analysis yet',
    body:  'Run an analysis first, then return here to generate the full 12-section Change Order Report.',
  },
  sources: {
    title: 'No contract loaded',
    body:  'Upload and analyze a contract to view the document text, risk highlights, and citations here.',
  },
  draft: {
    title: 'No analysis yet',
    body:  'Run an analysis first, then return here to generate your client response letter and claim strategy.',
  },
};

export default function NoAnalysis({ currentStep }: NoAnalysisProps) {
  const navigate = useNavigate();
  const msg = MESSAGES[currentStep];
  const currentIdx = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            Action Required
          </div>
          <h2 className="text-2xl font-extrabold text-on-surface font-headline mb-2">{msg.title}</h2>
          <p className="text-on-surface-variant text-sm max-w-xs mx-auto leading-relaxed">{msg.body}</p>
        </div>

        {/* Step journey */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Your workflow</p>
          </div>
          <div className="divide-y divide-slate-100">
            {STEPS.map((step, i) => {
              const stepIdx = STEP_ORDER.indexOf(step.id);
              const isDone    = stepIdx < currentIdx;
              const isCurrent = step.id === currentStep;
              const isNext    = step.id === 'intake';
              return (
                <div key={step.id}
                  className={`flex items-center gap-4 px-5 py-3.5 ${isNext ? 'bg-primary/5' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
                    ${isDone    ? 'bg-emerald-100 text-emerald-600' :
                      isNext    ? 'bg-primary text-white' :
                      isCurrent ? 'bg-amber-100 text-amber-600' :
                                  'bg-slate-100 text-slate-400'}`}>
                    {isDone ? <CheckCircle2 size={14} /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isCurrent || isNext ? 'text-on-surface' : isDone ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {step.label}
                    </p>
                  </div>
                  {isNext && (
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Start here</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <button onClick={() => navigate('/intake')}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-xl font-bold text-sm hover:bg-primary-dim transition-all shadow-lg shadow-primary/20 active:scale-95">
          Start New Analysis
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
