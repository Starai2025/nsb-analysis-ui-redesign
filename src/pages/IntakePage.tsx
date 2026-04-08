import React, { useState, useRef } from 'react';
import { FileUp, Mail, ArrowRight, CheckCircle2, Info, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { DocumentType } from '../types';

export default function IntakePage() {
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [correspondenceFile, setCorrespondenceFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<Record<string, boolean>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [analysisTimer, setAnalysisTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const contractInputRef = useRef<HTMLInputElement>(null);
  const correspondenceInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = () => {
    setAnalysisTimer(0);
    timerRef.current = setInterval(() => {
      setAnalysisTimer(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: DocumentType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Supported types: PDF and DOCX
    const supportedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!supportedTypes.includes(file.type)) {
      setError("Only PDF and DOCX files are supported for automated analysis.");
      return;
    }

    if (type === 'contract') setContractFile(file);
    else setCorrespondenceFile(file);

    setUploaded(prev => ({ ...prev, [type]: true }));
    setError(null);
  };

  const handleAnalyze = async () => {
    console.log("Analyze button clicked (Backend File API Pattern)");
    if (!contractFile || !correspondenceFile) {
      setError("Please upload both the contract and the correspondence.");
      return;
    }
    
    setAnalyzing(true);
    setAnalysisStatus('Uploading documents to secure server...');
    setError(null);
    startTimer();

    try {
      // 1. Prepare FormData
      const formData = new FormData();
      formData.append('contract', contractFile);
      formData.append('correspondence', correspondenceFile);

      // 2. Call Backend Analysis (which uses File API)
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis failed on server");
      }

      const { analysis } = await response.json();
      
      setAnalysisStatus('Saving analysis to project store...');
      
      // 3. Save to Backend Store
      const saveResponse = await fetch('/api/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis,
          contract: {
            id: `doc-${Date.now()}`,
            name: contractFile.name,
            type: 'contract',
            metadata: { fileSize: contractFile.size, mimeType: contractFile.type, uploadedAt: new Date().toISOString() }
          },
          correspondence: {
            id: `doc-${Date.now()}-corr`,
            name: correspondenceFile.name,
            type: 'correspondence',
            metadata: { fileSize: correspondenceFile.size, mimeType: correspondenceFile.type, uploadedAt: new Date().toISOString() }
          }
        })
      });

      if (!saveResponse.ok) throw new Error("Failed to save analysis to server");

      stopTimer();
      window.location.href = '/summary';
    } catch (err) {
      stopTimer();
      console.error('Analysis failed:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during analysis.';
      setError(message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto">
      <input 
        type="file" 
        ref={contractInputRef} 
        className="hidden" 
        onChange={(e) => handleFileChange(e, 'contract')}
        accept=".pdf,.docx"
      />
      <input 
        type="file" 
        ref={correspondenceInputRef} 
        className="hidden" 
        onChange={(e) => handleFileChange(e, 'correspondence')}
        accept=".pdf,.docx"
      />

      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-extrabold text-on-surface tracking-tight mb-2 font-headline">New Change Analysis</h1>
          <p className="text-on-surface-variant text-lg max-w-2xl font-medium opacity-80">
            Upload project documentation to perform an automated legal and financial risk assessment of the proposed variation.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`px-4 py-2 rounded-full border flex items-center gap-2 text-xs font-bold transition-all ${
            process.env.GEMINI_API_KEY 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${process.env.GEMINI_API_KEY ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {process.env.GEMINI_API_KEY ? 'Gemini API: Connected' : 'Gemini API: Key Missing'}
          </div>
        </div>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 shadow-sm"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold mb-1">Analysis Error</p>
            <p className="font-medium">{error}</p>
            <p className="mt-2 text-xs opacity-70">Tip: Ensure your API key is set in the application settings and your files are not too large (max 4MB for instant analysis).</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-12 gap-10">
        <div className="col-span-8 flex flex-col gap-10">
          <section className="bg-white shadow-xl border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-10 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-on-surface mb-8">Project Details</h2>
              <div className="grid grid-cols-2 gap-x-10 gap-y-8">
                <div className="flex flex-col gap-3">
                  <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface">Project Name</label>
                  <input 
                    className="bg-white border border-slate-300 rounded-md p-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-slate-400" 
                    placeholder="e.g., Skyline Tower Phase 2" 
                    type="text"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface">Contract Number</label>
                  <input 
                    className="bg-white border border-slate-300 rounded-md p-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-slate-400" 
                    placeholder="e.g., BC-2024-881" 
                    type="text"
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-3">
                  <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface">Potential Change Request Number</label>
                  <input 
                    className="bg-white border border-slate-300 rounded-md p-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-slate-400" 
                    placeholder="CR-012" 
                    type="text"
                  />
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-50/30">
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-on-surface mb-8">Required Documents</h2>
              <div className="grid grid-cols-2 gap-6">
                {uploaded.contract ? (
                  <div className="group relative flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-emerald-500 bg-emerald-50/30 rounded-xl transition-all">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-on-surface">{contractFile?.name || 'Contract Uploaded'}</p>
                      <button 
                        onClick={() => contractInputRef.current?.click()}
                        className="text-[11px] font-bold text-primary hover:underline mt-1"
                      >
                        Replace file
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => contractInputRef.current?.click()}
                    className="group flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-slate-300 bg-white hover:bg-primary/5 hover:border-primary rounded-xl transition-all"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary group-hover:text-white transition-all">
                      <FileUp size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-on-surface">Upload Contract</p>
                      <p className="text-[11px] text-slate-500 mt-1">PDF or DOCX up to 50MB</p>
                    </div>
                  </button>
                )}

                <button 
                  onClick={() => correspondenceInputRef.current?.click()}
                  className={`group flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-xl transition-all ${
                    uploaded.correspondence 
                      ? 'border-emerald-500 bg-emerald-50/30' 
                      : 'border-slate-300 bg-white hover:bg-primary/5 hover:border-primary'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    uploaded.correspondence ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500 group-hover:bg-primary group-hover:text-white'
                  }`}>
                    {uploaded.correspondence ? (
                      <CheckCircle2 size={24} />
                    ) : (
                      <Mail size={24} />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-on-surface">
                      {uploaded.correspondence 
                        ? correspondenceFile?.name || 'Correspondence Uploaded' 
                        : 'Upload Correspondence'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {uploaded.correspondence ? 'Successfully Ingested' : 'PDF or DOCX (Emails, RFIs, or minutes)'}
                    </p>
                  </div>
                </button>
              </div>

              <div className="mt-10 flex flex-col items-end gap-3">
                <p className="text-[11px] font-medium text-slate-500">Requires contract and correspondence to generate report</p>
                <button 
                  onClick={handleAnalyze}
                  disabled={!uploaded.contract || !uploaded.correspondence || analyzing}
                  className={`flex items-center gap-2 font-bold px-12 py-4 rounded-md transition-all shadow-lg ${
                    uploaded.contract && uploaded.correspondence && !analyzing
                      ? 'bg-primary text-white hover:bg-primary-dim active:scale-95' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {analyzing ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        <span>Analyzing...</span>
                      </div>
                      <span className="text-[10px] font-medium text-white/70 animate-pulse">
                        {analysisStatus} ({analysisTimer}s)
                      </span>
                      {analysisTimer > 60 && (
                        <span className="text-[10px] text-amber-300 font-bold mt-1 animate-bounce">
                          {analysisTimer > 90 ? 'Complex analysis in progress. Almost there...' : 'Large document detected. Still processing...'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <>
                      Analyze Change
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          <div className="p-8 bg-on-surface text-white rounded-xl flex items-start gap-5">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <Info size={20} />
            </div>
            <div>
              <p className="text-sm font-bold mb-1.5">Automated Clause Matching</p>
              <p className="text-[13px] text-white/70 leading-relaxed font-medium">
                Our engine identifies specific liability shifts and timeline impacts by cross-referencing change orders against your original contract's governing clauses.
              </p>
            </div>
          </div>
        </div>

        <div className="col-span-4">
          <div className="sticky top-24 flex flex-col gap-6">
            <section className="bg-white shadow-xl border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-slate-50">
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-primary rounded-full"></span>
                  Workflow Progress
                </h3>
              </div>
              
              <div className="p-8 flex flex-col gap-6 border-b border-slate-50">
                <div className="flex items-start gap-4">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    uploaded.contract ? 'bg-emerald-500 text-white' : 'border-2 border-slate-200'
                  }`}>
                    {uploaded.contract && <CheckCircle2 size={14} />}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-on-surface uppercase tracking-wider">Contract uploaded</p>
                    <p className="text-[10px] text-slate-500">{uploaded.contract ? contractFile?.name : 'Awaiting file...'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    uploaded.correspondence ? 'bg-emerald-500 text-white' : 'border-2 border-amber-400 bg-amber-50'
                  }`}>
                    {uploaded.correspondence ? <CheckCircle2 size={14} /> : <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-on-surface uppercase tracking-wider">Correspondence</p>
                    <p className="text-[10px] text-slate-500">{uploaded.correspondence ? correspondenceFile?.name : 'Awaiting documentation...'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 opacity-40">
                  <div className="w-6 h-6 rounded-full border-2 border-slate-200 shrink-0"></div>
                  <div>
                    <p className="text-[11px] font-bold text-on-surface uppercase tracking-wider">Risk Score Generation</p>
                    <p className="text-[10px] text-slate-500">Waiting for upload</p>
                  </div>
                </div>
              </div>
            </section>

            <div className="rounded-2xl overflow-hidden h-44 shadow-lg relative group">
              <img 
                alt="Modern blueprint" 
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDV55qa5gNXrcM3HL5-_GAQfrSJxf1Fsf12DnmtXHYZMnEw6p6R-Si1F0IGLOXuF2KZdBeQT_KQ_As4YyBlm_dpQzugK1jn_l8iQief-TZi3BRniAV9mm6pBlnlcsNnzyZwMDIZvuqX8wxXwoLVGXZ2QuUUNa-P4moWf0C-HM4DGa7H55mIXxgm2KJqbG5eMapKJ2MCJiDZV7WkGLWA9L0BlnsjPA0YWynUP38jnYRHpM-ULw4QmNEmcavEIl196bXcoqbIcOmXy9I"
              />
              <div className="absolute inset-0 bg-primary/10 group-hover:bg-transparent transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
