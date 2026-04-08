import React, { useState } from 'react';
import { 
  Save, 
  Copy, 
  FileText, 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Link, 
  History, 
  Sparkles,
  ShieldAlert,
  TrendingUp,
  Clock,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function DraftResponsePage() {
  const [activeTab, setActiveTab] = useState<'draft' | 'strategy'>('draft');

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      <header className="flex justify-between items-end mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase rounded">Project Alpha</span>
            <span className="text-on-surface-variant text-sm">CR-4052: Foundation Modification</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Commercial Response Management</h1>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-primary font-bold hover:bg-slate-50 transition-colors rounded-lg">
            <Save size={18} />
            Save Draft
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-on-surface font-bold hover:bg-slate-200 transition-colors rounded-lg">
            <Copy size={18} />
            Copy
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-primary text-white font-bold hover:bg-primary-dim shadow-md transition-all rounded-lg">
            <FileText size={18} />
            Export PDF
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-8">
        <button 
          onClick={() => setActiveTab('draft')}
          className={cn(
            "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative",
            activeTab === 'draft' ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
          )}
        >
          Draft Response
          {activeTab === 'draft' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('strategy')}
          className={cn(
            "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative flex items-center gap-2",
            activeTab === 'strategy' ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
          )}
        >
          <ShieldAlert size={16} />
          Claim Strategy & Mitigation
          {activeTab === 'strategy' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
        </button>
      </div>

      {activeTab === 'draft' ? (
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8">
            <div className="bg-white rounded-xl shadow-xl min-h-[700px] flex flex-col border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4">
                <div className="flex items-center gap-1 border-r border-slate-100 px-2">
                  <button className="p-1.5 hover:bg-slate-50 rounded transition-colors"><Bold size={18} /></button>
                  <button className="p-1.5 hover:bg-slate-50 rounded transition-colors"><Italic size={18} /></button>
                  <button className="p-1.5 hover:bg-slate-50 rounded transition-colors"><Underline size={18} /></button>
                </div>
                <div className="flex items-center gap-1 border-r border-slate-100 px-2">
                  <button className="p-1.5 hover:bg-slate-50 rounded transition-colors"><List size={18} /></button>
                  <button className="p-1.5 hover:bg-slate-50 rounded transition-colors"><ListOrdered size={18} /></button>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1.5 hover:bg-slate-50 rounded transition-colors"><Link size={18} /></button>
                  <button className="p-1.5 hover:bg-slate-50 rounded transition-colors"><History size={18} /></button>
                </div>
                <div className="ml-auto text-xs font-medium text-emerald-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  AI-Optimized Tone: Professional
                </div>
              </div>
              
              <div className="p-12 flex-1 font-serif text-on-surface leading-relaxed">
                <p className="mb-4">DATE: October 24, 2023</p>
                <p className="mb-6">TO: Ms. Elena Richardson, Owner Representative<br/>SUBJECT: Official Response to Proposed Change Order CR-4052 (Foundation Modification)</p>
                <p className="mb-4">Dear Ms. Richardson,</p>
                <p className="mb-4">Following our review of the directive issued regarding the modification of the foundation piers for Building B, we submit the following response in accordance with Section 7.2 of the Prime Contract.</p>
                <p className="mb-4">While we acknowledge the geological findings presented in the geotechnical report dated October 12, the proposed adjustments to the pier depth constitute a Material Change as defined in Clause 12.4. Specifically, the expansion of the scope requires specialized hydraulic drilling equipment not previously allocated to this phase of construction.</p>
                <p className="mb-4 bg-primary/5 border-l-4 border-primary p-4 rounded-r-lg">We formally request a revision of the pricing structure for CR-4052. The current estimate fails to account for the liquidated damages risk associated with the four-day mobilization delay. As per Exhibit D, all subsurface condition changes must be compensated at the agreed-upon unit rate of $450/linear foot, plus overhead.</p>
                <p className="mb-4">We are prepared to proceed with the modifications immediately upon receipt of a signed Change Directive that reflects these updated terms. This will ensure project continuity and maintain our current structural safety milestones.</p>
                <p className="mt-8 mb-4 italic text-on-surface-variant">Sincerely,<br/>Project Management Office<br/>Project Alpha / BuildCorp</p>
              </div>
            </div>
          </div>

          <div className="col-span-4 space-y-6">
            <section className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h3 className="font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
                <Sparkles className="text-primary" size={18} />
                Suggested Improvements
              </h3>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-amber-400">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Impact Alert</p>
                  <p className="text-sm font-medium text-on-surface mb-2">Mention Section 8.3 "Schedule Delays" specifically to strengthen the claim.</p>
                  <button className="text-xs font-bold text-primary hover:underline">Apply Recommendation</button>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-400">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Clarity</p>
                  <p className="text-sm font-medium text-on-surface mb-2">The transition between pier depth and equipment allocation could be smoother.</p>
                  <button className="text-xs font-bold text-primary hover:underline">Rewrite Section</button>
                </div>
              </div>
            </section>

            <section className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h3 className="font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
                <Sparkles className="text-primary" size={18} />
                Legal Tone Checks
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-on-surface-variant">Assertiveness</span>
                  <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-[85%]"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-on-surface-variant">Compliance Risk</span>
                  <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[15%]"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-on-surface-variant">Formality</span>
                  <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-[95%]"></div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-primary/5 rounded text-xs text-primary font-medium">
                "This draft maintains a highly formal posture which minimizes adversarial friction while clearly asserting contractual rights."
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8 space-y-8">
            {/* 1. What Changed */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface">1. What Changed</h3>
              </div>
              <div className="p-6">
                <p className="text-on-surface leading-relaxed">
                  Owner Representative (Ms. Richardson) has formally denied the additional mobilization fee but directed Arcadis to proceed with the foundation pier modifications immediately to avoid downstream schedule impacts. The owner has partially accepted the technical necessity of the change but challenged the "Material Change" classification for the equipment allocation.
                </p>
              </div>
            </section>

            {/* 2. Updated Arcadis Position */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface">2. Updated Arcadis Position</h3>
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase rounded border border-amber-200">Shifted to Mitigation</span>
              </div>
              <div className="p-6">
                <p className="text-on-surface leading-relaxed">
                  Arcadis' position has shifted from active negotiation to <span className="font-bold">mitigation mode</span>. While our entitlement to cost recovery remains strong under Clause 12.4, the owner's "proceed" directive creates an immediate risk of unrecoverable effort if mobilization costs are not ring-fenced before full performance.
                </p>
              </div>
            </section>

            {/* 3. Critical Path Impact */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface">3. Critical Path Impact</h3>
                <span className="px-2 py-1 bg-rose-100 text-rose-700 text-[10px] font-bold uppercase rounded border border-rose-200">Yes</span>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface mb-1">Reason</p>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      Foundation pier completion is the primary controlling activity for Building B structural steel. Any delay in pier approval or equipment mobilization directly pushes the "Steel Erection Start" milestone, which has zero float.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. Schedule Delay Risk */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface">4. Schedule Delay Risk</h3>
                <span className="px-2 py-1 bg-rose-100 text-rose-700 text-[10px] font-bold uppercase rounded border border-rose-200">High</span>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface mb-1">Why</p>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      The owner's direction to proceed without commercial resolution compounds the impact by forcing Arcadis to commit resources while the fee remains disputed, potentially leading to a "constructive acceleration" claim if the schedule is held fixed.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 5. Mitigation Strategy */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface">5. Mitigation Strategy</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Zap size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface mb-1">Isolate Changed Work</p>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      Separate the base-scope pier drilling from the "modified depth" work. Track all specialized hydraulic equipment hours on a dedicated daily site log signed by the owner's inspector to ensure no dispute over factual effort.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Zap size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface mb-1">Request Limited Written Direction</p>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      Seek a "Partial Authorization to Proceed" specifically for the mobilization phase while the unit rate for additional depth remains under review. This preserves the right to stop work if the commercial gap widens.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Zap size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface mb-1">Resequence Unaffected Work</p>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      Accelerate the procurement of structural steel embeds for unaffected sectors to create a "buffer" in the downstream schedule, reducing the pressure on the disputed pier completion.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 6. Alternative Paths */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface">6. Alternative Paths</h3>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm text-on-surface font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Propose a phased approval: authorize mobilization now, settle unit rates after the first 5 piers are completed.
                  </li>
                  <li className="flex items-center gap-3 text-sm text-on-surface font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Seek time relief first: request a 4-day non-compensable extension to de-risk the liquidated damages while fee is negotiated.
                  </li>
                  <li className="flex items-center gap-3 text-sm text-on-surface font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Narrow the disputed work: proceed with standard drilling rigs where possible and only use hydraulic rigs for the deepest 20%.
                  </li>
                </ul>
              </div>
            </section>

            {/* 7. Recommended Mitigation Path */}
            <section className="bg-primary text-white rounded-xl shadow-lg p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldAlert size={120} />
              </div>
              <div className="relative z-10">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4 text-white/80">7. Recommended Mitigation Path</h3>
                <p className="text-xl font-bold leading-relaxed">
                  Proceed with mobilization only under a formal "Reservation of Rights" letter. Prioritize schedule protection for the critical path while isolating all "Material Change" costs into a separate, daily-verified tracking package to minimize unrecoverable exposure.
                </p>
                <button className="mt-6 flex items-center gap-2 bg-white text-primary px-6 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors">
                  Generate Reservation of Rights Letter
                  <ArrowRight size={16} />
                </button>
              </div>
            </section>
          </div>

          <div className="col-span-4 space-y-6">
            <div className="sticky top-24 space-y-6">
              <section className="bg-slate-900 text-white rounded-xl p-6 shadow-xl border border-white/10">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                  <Info size={16} />
                  Commercial Context
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Current Claim Status</p>
                    <p className="text-sm font-bold">Disputed / Unresolved</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Entitlement Support</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full w-[65%]"></div>
                      </div>
                      <span className="text-xs font-bold">Mixed</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs text-slate-400 leading-relaxed italic">
                      "Owner's direction to proceed without commercial agreement is a high-risk event. Strategy focuses on cost isolation and schedule de-risking."
                    </p>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-on-surface mb-4">Strategic Reminders</h3>
                <ul className="space-y-3">
                  <li className="flex gap-3 text-xs text-on-surface-variant">
                    <CheckCircle2 className="text-emerald-500 shrink-0" size={14} />
                    <span>Always reference Clause 12.4 in all correspondence.</span>
                  </li>
                  <li className="flex gap-3 text-xs text-on-surface-variant">
                    <CheckCircle2 className="text-emerald-500 shrink-0" size={14} />
                    <span>Ensure daily logs are signed by Owner Rep.</span>
                  </li>
                  <li className="flex gap-3 text-xs text-on-surface-variant">
                    <AlertTriangle className="text-amber-500 shrink-0" size={14} />
                    <span>Avoid "Constructive Acceleration" by documenting all owner-driven pace.</span>
                  </li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
