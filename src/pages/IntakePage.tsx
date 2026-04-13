import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, Mail, ArrowRight, CheckCircle2, Info, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { DocumentType } from '../types';
import { saveCurrentThread, clearCurrentThread } from '../lib/db';

export default function IntakePage() {
  const navigate = useNavigate();

  const [contractFile,      setContractFile]      = useState<File | null>(null);
  const [correspondenceFile,setCorrespondenceFile] = useState<File | null>(null);
  const [uploaded,          setUploaded]           = useState<Record<string, boolean>>({});
  const [analyzing,         setAnalyzing]          = useState(false);
  const [analysisStatus,    setAnalysisStatus]     = useState('');
  const [analysisTimer,     setAnalysisTimer]      = useState(0);
  const [error,             setError]              = useState<string | null>(null);

  // Project detail fields
  const [projectName,       setProjectName]        = useState('');
  const [contractNumber,    setContractNumber]     = useState('');
  const [changeRequestId,   setChangeRequestId]    = useState('');

  const contractInputRef       = useRef<HTMLInputElement>(null);
  const correspondenceInputRef = useRef<HTMLInputElement>(null);
  const timerRef               = useRef<NodeJS.Timeout | null>(null);

  const startTimer = () => {
    setAnalysisTimer(0);
    timerRef.current = setInterval(() => setAnalysisTimer((p) => p + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: DocumentType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const supported = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!supported.includes(file.type)) {
      setError('Only PDF and DOCX files are supported.');
      return;
    }
    if (type === 'contract')      setContractFile(file);
    else                          setCorrespondenceFile(file);
    setUploaded((prev) => ({ ...prev, [type]: true }));
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!contractFile || !correspondenceFile) {
      setError('Please upload both the contract and the correspondence.');
      return;
    }

    setAnalyzing(true);
    setAnalysisStatus('Uploading documents to server...');
    setError(null);
    startTimer();

    try {
      const formData = new FormData();
      formData.append('contract',       contractFile);
      formData.append('correspondence', correspondenceFile);
      formData.append('projectName',       projectName);
      formData.append('contractNumber',    contractNumber);
      formData.append('changeRequestId',   changeRequestId);

      setAnalysisStatus('Extracting document text (page-by-page)...');

      const response = await fetch('/api/analyze', { method: 'POST', body: formData });

      setAnalysisStatus('Consulting Claude AI (this may take up to a minute)...');

      const data     = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed on the server.');
      }

      setAnalysisStatus('Saving results to local storage...');

      // Read PDF blob for in-browser viewing (PDF only; DOCX has no blob viewer)
      const contractBuffer = contractFile.type === 'application/pdf'
        ? await contractFile.arrayBuffer()
        : undefined;

      // Clear any previous thread so stale report/draft/citations never bleed into this run
      await clearCurrentThread();

      // Persist full ingested documents + analysis + citations + PDF blob to IndexedDB
      await saveCurrentThread({
        analysis:       data.analysis,
        projectData:    data.projectData,
        contract:       data.contract,
        correspondence: data.correspondence,
        citations:      data.citations ?? [],
        contractBlob:   contractBuffer,
      });

      stopTimer();
      navigate('/summary');
    } catch (err) {
      stopTimer();
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto">
      <input type="file" ref={contractInputRef}       className="hidden" onChange={(e) => handleFileChange(e, 'contract')}       accept=".pdf,.docx" />
      <input type="file" ref={correspondenceInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'correspondence')} accept=".pdf,.docx" />

      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-extrabold text-on-surface tracking-tight mb-2 font-headline">New Change Analysis</h1>
          <p className="text-on-surface-variant text-lg max-w-2xl font-medium opacity-80">
            Upload project documentation to perform an automated legal and financial risk assessment of the proposed variation.
          </p>
        </div>
      </div>

      {/* Error banner */}
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
            {(error.toLowerCase().includes('api key') || error.toLowerCase().includes('connect') || error.toLowerCase().includes('network') || error.toLowerCase().includes('econnrefused')) && (
              <p className="mt-2 text-xs opacity-70">Ensure your server is running with ANTHROPIC_API_KEY set in your .env file.</p>
            )}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-12 gap-10">
        <div className="col-span-8 flex flex-col gap-10">

          {/* Project details */}
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
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface">Contract Number</label>
                  <input
                    className="bg-white border border-slate-300 rounded-md p-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-slate-400"
                    placeholder="e.g., BC-2024-881"
                    type="text"
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-3">
                  <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface">Potential Change Request Number</label>
                  <input
                    className="bg-white border border-slate-300 rounded-md p-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-slate-400"
                    placeholder="e.g., CR-012"
                    type="text"
                    value={changeRequestId}
                    onChange={(e) => setChangeRequestId(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Document upload */}
            <div className="p-10 bg-slate-50/30">
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-on-surface mb-8">Required Documents</h2>
              <div className="grid grid-cols-2 gap-6">

                {/* Contract upload zone */}
                {uploaded.contract ? (
                  <div className="group relative flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-emerald-500 bg-emerald-50/30 rounded-xl transition-all">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-on-surface">{contractFile?.name}</p>
                      <button onClick={() => contractInputRef.current?.click()} className="text-[11px] font-bold text-primary hover:underline mt-1">
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

                {/* Correspondence upload zone */}
                <button
                  onClick={() => correspondenceInputRef.current?.click()}
                  className={`group flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-xl transition-all ${
                    uploaded.correspondence
                      ? 'border-emerald-500 bg-emerald-50/30'
                      : 'border-slate-300 bg-white hover:bg-primary/5 hover:border-primary'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    uploaded.correspondence
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-primary group-hover:text-white'
                  }`}>
                    {uploaded.correspondence ? <CheckCircle2 size={24} /> : <Mail size={24} />}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-on-surface">
                      {uploaded.correspondence ? correspondenceFile?.name ?? 'Correspondence Uploaded' : 'Upload Correspondence'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {uploaded.correspondence ? 'Successfully staged' : 'PDF or DOCX (Emails, RFIs, or minutes)'}
                    </p>
                  </div>
                </button>
              </div>

              {/* Analyze button */}
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
                    <>Analyze Change <ArrowRight size={18} /></>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* Info banner */}
          <div className="p-8 bg-on-surface text-white rounded-xl flex items-start gap-5">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <Info size={20} />
            </div>
            <div>
              <p className="text-sm font-bold mb-1.5">Powered by Claude AI</p>
              <p className="text-[13px] text-white/70 leading-relaxed font-medium">
                Your documents are analyzed securely. Files are processed to extract clauses and generate your risk assessment — never stored or shared.
              </p>
            </div>
          </div>
        </div>

        {/* Workflow sidebar */}
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
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${uploaded.contract ? 'bg-emerald-500 text-white' : 'border-2 border-slate-200'}`}>
                    {uploaded.contract && <CheckCircle2 size={14} />}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-on-surface uppercase tracking-wider">Contract uploaded</p>
                    <p className="text-[10px] text-slate-500">{uploaded.contract ? contractFile?.name : 'Awaiting file...'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${uploaded.correspondence ? 'bg-emerald-500 text-white' : 'border-2 border-amber-400 bg-amber-50'}`}>
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
          </div>
        </div>
      </div>
    </div>
  );
}
