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
    <div className="flex min-h-[70vh] items-center justify-center px-8 py-10">
      <div className="w-full max-w-5xl space-y-6">
        <section className="relative overflow-hidden rounded-[28px] border border-[#f0dfca] bg-[radial-gradient(circle_at_right,#f7e1c7_0%,#fffaf4_14%,#ffffff_42%,#ffffff_100%)] px-8 py-8 shadow-lg shadow-slate-900/5">
          <div className="absolute -left-20 -top-16 h-56 w-56 rounded-full bg-slate-900/4 blur-3xl" />
          <div className="absolute -bottom-20 -right-10 h-60 w-60 rounded-full bg-[#e67e22]/14 blur-3xl" />

          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#e67e22]/20 bg-[#fef9f0] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b4e0e]">
                Analysis Required
              </div>
              <h2 className="font-headline text-3xl font-extrabold tracking-tight text-[#162a55]">
                {msg.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant">
                {msg.body}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/intake')}
              className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#0f2044] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#0f2044]/20 transition-all hover:bg-[#16315f] active:scale-[0.98]"
            >
              Start New Analysis
              <ArrowRight size={16} />
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Before this page unlocks</p>
          </div>

          <div className="divide-y divide-slate-100">
            {STEPS.map((step, i) => {
              const stepIdx = STEP_ORDER.indexOf(step.id);
              const isDone = stepIdx < currentIdx;
              const isCurrent = step.id === currentStep;
              const isNext = step.id === 'intake';
              const Icon = step.icon;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-4 px-6 py-4 ${isNext ? 'bg-[linear-gradient(90deg,#fff8ef_0%,#ffffff_60%)]' : ''}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isDone
                        ? 'bg-emerald-100 text-emerald-600'
                        : isNext
                          ? 'bg-[#0f2044] text-white'
                          : isCurrent
                            ? 'bg-[#fde8cc] text-[#8b4e0e]'
                            : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={14} /> : i + 1}
                  </div>

                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                      isDone
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                        : isNext
                          ? 'border-[#0f2044]/10 bg-[#0f2044]/5 text-[#0f2044]'
                          : isCurrent
                            ? 'border-[#e67e22]/20 bg-[#fef3e3] text-[#c76c13]'
                            : 'border-slate-200 bg-slate-50 text-slate-400'
                    }`}
                  >
                    <Icon size={16} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold ${
                        isDone
                          ? 'text-emerald-700'
                          : isCurrent || isNext
                            ? 'text-on-surface'
                            : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>

                  {isNext && (
                    <span className="rounded-full border border-[#0f2044]/10 bg-[#0f2044]/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0f2044]">
                      Start here
                    </span>
                  )}
                  {isCurrent && !isNext && (
                    <span className="rounded-full border border-[#e67e22]/20 bg-[#fef3e3] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8b4e0e]">
                      Waiting
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
