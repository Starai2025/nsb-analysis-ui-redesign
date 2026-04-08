import React, { useRef } from 'react';
import { Search, Download, ZoomIn, ZoomOut, FileText, ShieldCheck, AlertTriangle, Info, ArrowRight, Gavel, Scale, List, Bookmark } from 'lucide-react';

export default function SourcesPage() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const citations = [
    { 
      id: '01', 
      title: 'Broad Indemnification Loophole', 
      ref: 'Page 1 • Paragraph 4 • Section 2', 
      text: '"The Contractor agrees to indemnify, defend, and hold harmless BuildCorp... regardless of whether such claims are caused by the negligence of BuildCorp."', 
      reasoning: 'This is a "Broad Form" indemnity clause. In many jurisdictions (like Texas or California), anti-indemnity statutes for construction may limit the enforceability of indemnifying a party for its own sole negligence. However, as written, it shifts 100% of the risk to the contractor, even for owner-caused accidents.',
      impact: 'Extreme liability exposure. Standard industry practice (AIA A201) requires "Limited Form" or "Intermediate Form" indemnification where each party is responsible for their own proportional negligence.', 
      type: 'error' 
    },
    { 
      id: '02', 
      title: 'Aggressive Termination for Convenience', 
      ref: 'Page 1 • Paragraph 7 • Section 4', 
      text: '"BuildCorp may terminate this Agreement at any time, for any reason or no reason, upon five (5) days\' written notice to Contractor."', 
      reasoning: 'A 5-day notice period for convenience is highly irregular in heavy civil or commercial construction. It does not allow sufficient time for demobilization of heavy equipment or orderly transition of subcontractors.',
      impact: 'High operational risk. Contractor could be left with significant unrecoverable costs for specialized equipment leases and labor commitments that cannot be cancelled on 5 days\' notice.', 
      type: 'primary' 
    },
    { 
      id: '03', 
      title: 'Non-Standard Payment Terms', 
      ref: 'Page 1 • Paragraph 5 • Section 3', 
      text: '"Net 60 days following receipt of a valid invoice."', 
      reasoning: 'Most commercial contracts follow a Net 30 or "Pay-when-Paid" cycle. Net 60 significantly strains the contractor\'s cash flow, effectively forcing the contractor to finance the owner\'s project for an additional 30 days.',
      impact: 'Cash flow strain. This will likely require the use of a line of credit to cover payroll and material costs, increasing the effective cost of the project by the interest rate incurred.', 
      type: 'variant' 
    },
  ];

  const sections = [
    { id: 'section-1', title: '1. Scope of Work' },
    { id: 'section-2', title: '2. Indemnification', risk: 'critical' },
    { id: 'section-3', title: '3. Payment Terms' },
    { id: 'section-4', title: '4. Termination', risk: 'primary' },
    { id: 'section-5', title: '5. Intellectual Property' },
    { id: 'section-6', title: '6. Dispute Resolution' },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left: Document Viewer */}
      <section className="flex-1 flex flex-col border-r border-slate-200">
        <div className="h-14 flex items-center justify-between px-6 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <FileText className="text-primary" size={18} />
            <h2 className="font-headline font-bold text-on-surface text-sm">BuildCorp_Prime_Contract_v4.pdf</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1">
              <button className="p-1 hover:bg-slate-50 rounded transition-colors"><ZoomOut size={14} /></button>
              <span className="text-xs font-mono px-2">100%</span>
              <button className="p-1 hover:bg-slate-50 rounded transition-colors"><ZoomIn size={14} /></button>
            </div>
            <button className="text-on-surface-variant hover:text-primary transition-colors">
              <Download size={18} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Document Outline Sidebar */}
          <div className="w-56 bg-white border-r border-slate-100 flex flex-col">
            <div className="p-4 border-b border-slate-50 flex items-center gap-2">
              <List size={14} className="text-slate-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Document Outline</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className="w-full text-left px-3 py-2 rounded-lg text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-all flex items-center justify-between group"
                >
                  <span className="truncate">{section.title}</span>
                  {section.risk && (
                    <div className={`w-1.5 h-1.5 rounded-full ${section.risk === 'critical' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                  )}
                </button>
              ))}
            </div>
            <div className="p-4 bg-slate-50/50 border-t border-slate-100">
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                <Bookmark size={12} />
                <span>Page 1 of 24</span>
              </div>
            </div>
          </div>

          {/* Main Viewer Area */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-slate-100 p-8 flex justify-center scroll-smooth">
            <div className="w-full max-w-3xl bg-white shadow-lg p-16 min-h-[1500px] relative font-serif text-[#1e1e1e] leading-relaxed">
              <h1 className="text-2xl font-bold text-center mb-12 uppercase tracking-widest border-b-2 border-on-surface pb-6">Master Services Agreement</h1>
              
              <div className="space-y-10 text-sm">
                <section id="section-1" className="scroll-mt-10">
                  <h3 className="font-bold mb-2">1. SCOPE OF WORK</h3>
                  <p>Contractor shall perform the services described in Exhibit A. All services shall be performed in a professional and workmanlike manner in accordance with the highest industry standards. Contractor is responsible for providing all labor, materials, equipment, and supervision necessary to complete the Work.</p>
                </section>
                
                {/* Critical Risk Highlight */}
                <section id="section-2" className="bg-rose-50 border-2 border-rose-500 p-8 -mx-8 rounded-xl relative group shadow-md scroll-mt-10">
                  <div className="absolute -top-3 left-4 bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                    <AlertTriangle size={10} />
                    CRITICAL RISK ITEM
                  </div>
                  <h3 className="font-bold mb-2">2. INDEMNIFICATION</h3>
                  <p className="font-medium italic">
                    "The Contractor agrees to indemnify, defend, and hold harmless BuildCorp, its officers, directors, and employees from and against any and all claims, damages, losses, and expenses, including but not limited to attorney's fees, arising out of or resulting from the performance of the Work, <span className="underline decoration-rose-500 decoration-2 underline-offset-2">regardless of whether such claims are caused in part or in whole by the negligence of BuildCorp</span>."
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-rose-700 text-[11px] font-bold">
                      <Scale size={14} />
                      Legal Reasoning: Unfair Risk Allocation
                    </div>
                  </div>
                </section>

                <section id="section-3" className="scroll-mt-10">
                  <h3 className="font-bold mb-2">3. PAYMENT TERMS</h3>
                  <p>Invoices shall be submitted monthly for Work completed during the preceding month. <span className="bg-slate-100 px-1 rounded">Payment shall be made within sixty (60) days following receipt of a valid and undisputed invoice.</span> BuildCorp reserves the right to withhold retainage of ten percent (10%) from each progress payment until Final Completion.</p>
                </section>
                
                {/* Primary Risk Highlight */}
                <section id="section-4" className="bg-amber-50 border-2 border-amber-500 p-8 -mx-8 rounded-xl relative group shadow-md scroll-mt-10">
                  <div className="absolute -top-3 left-4 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                    <Gavel size={10} />
                    PRIMARY RISK
                  </div>
                  <h3 className="font-bold mb-2">4. TERMINATION FOR CONVENIENCE</h3>
                  <p className="font-medium italic">
                    "BuildCorp may, at its sole discretion and without cause, <span className="underline decoration-amber-500 decoration-2 underline-offset-2">terminate this Agreement at any time, for any reason or no reason, upon five (5) days' written notice to Contractor</span>. In the event of such termination, Contractor shall be entitled to receive payment only for Work properly performed through the date of termination."
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-amber-700 text-[11px] font-bold">
                    <Info size={14} />
                    Legal Reasoning: Insufficient Notice Period
                  </div>
                </section>

                <section id="section-5" className="scroll-mt-10">
                  <h3 className="font-bold mb-2">5. INTELLECTUAL PROPERTY</h3>
                  <p>Any and all work product, including but not limited to designs, blueprints, technical drawings, and data generated by Contractor in the performance of the Work, shall be the sole and exclusive property of BuildCorp. Contractor hereby assigns all right, title, and interest in such work product to BuildCorp.</p>
                </section>

                <section id="section-6" className="scroll-mt-10">
                  <h3 className="font-bold mb-2">6. DISPUTE RESOLUTION</h3>
                  <p>Any dispute, controversy, or claim arising out of or relating to this Agreement shall be settled by binding arbitration in accordance with the Construction Industry Arbitration Rules of the American Arbitration Association. The venue for such arbitration shall be Wilmington, Delaware.</p>
                </section>
                
                <p className="text-on-surface-variant/40 italic mt-20 text-center text-xs">... [End of Page 1] ...</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Right: Citations & Analysis */}
      <section className="w-[420px] flex flex-col bg-white overflow-hidden shadow-2xl z-10">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline font-bold text-lg text-on-surface">Citations & Evidence</h2>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">3 Key Findings</span>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm group-focus-within:text-primary transition-colors" size={16} />
            <input 
              className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none" 
              placeholder="Search terms in analysis..." 
              type="text" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {citations.map((cite) => (
            <div key={cite.id} className="group">
              <div className="flex items-center gap-3 mb-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                  cite.type === 'error' ? 'bg-rose-500 text-white' : 
                  cite.type === 'primary' ? 'bg-amber-500 text-white' : 'bg-primary text-white'
                }`}>
                  {cite.id}
                </span>
                <div>
                  <h4 className="font-bold text-sm text-on-surface leading-tight">{cite.title}</h4>
                  <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">{cite.ref}</p>
                </div>
              </div>
              
              <div className={`rounded-xl p-5 border shadow-sm group-hover:shadow-md transition-all ${
                cite.type === 'error' ? 'bg-rose-50/50 border-rose-200' : 
                cite.type === 'primary' ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-4 italic font-medium">
                  {cite.text}
                </p>
                
                <div className="space-y-4">
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5 ${
                      cite.type === 'error' ? 'text-rose-600' : 
                      cite.type === 'primary' ? 'text-amber-600' : 'text-primary'
                    }`}>
                      <Scale size={12} />
                      Legal Reasoning
                    </span>
                    <p className="text-xs text-on-surface leading-relaxed">
                      {cite.reasoning}
                    </p>
                  </div>
                  
                  <div className="pt-3 border-t border-slate-200/50">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Impact Analysis</span>
                    <p className="text-xs text-on-surface leading-relaxed font-medium">
                      {cite.impact}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Info className="text-primary" size={14} />
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Ask the Contract</span>
            </div>
            <div className="relative">
              <input 
                className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm outline-none placeholder:text-slate-400" 
                placeholder="Ask a question about these clauses..." 
                type="text" 
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary-dim transition-colors">
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
