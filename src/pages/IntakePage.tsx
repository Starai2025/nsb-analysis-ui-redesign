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
    <div className="mx-auto max-w-[1380px] space-y-6 px-8 py-8">
      <input type="file" ref={contractInputRef}       className="hidden" onChange={(e) => handleFileChange(e, 'contract')}       accept=".pdf,.docx" />
      <input type="file" ref={correspondenceInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'correspondence')} accept=".pdf,.docx" />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Current Matter</div>
            <div className="text-base font-bold text-on-surface">Project Alpha · Proposed Variation Review</div>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
            Secure workspace
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
            Awaiting uploads
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400">
          <span>Last analyzed: not started</span>
          <span>Confidence available after review</span>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#ffffff_54%,#f8efe4_100%)] px-8 py-8 shadow-lg shadow-slate-900/5">
        <div className="absolute -left-20 -top-16 h-56 w-56 rounded-full bg-slate-900/5 blur-3xl" />
        <div className="absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-[#e67e22]/15 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#e67e22]">New Analysis</div>
            <h1 className="font-headline text-5xl font-extrabold uppercase leading-none tracking-[0.02em] text-on-surface">
              New Change Analysis
            </h1>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-on-surface-variant">
              Upload project documentation to perform an automated legal and financial risk assessment of the proposed variation.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface">
                Contract + correspondence required
              </div>
              <div className="rounded-full border border-[#e67e22]/20 bg-[#fef9f0] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8b4e0e]">
                AI-assisted legal and financial review
              </div>
            </div>
          </div>
          <div className="rounded-full bg-[#0f2044] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-lg">
            Secure Intake
          </div>
        </div>
      </section>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm"
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

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-8 flex flex-col gap-6">

          <section className="overflow-hidden rounded-[24px] border border-[#e67e22]/15 bg-white shadow-xl shadow-slate-900/5">
            <div className="border-b border-slate-100 p-10">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-on-surface">Project Details</h2>
              <p className="mb-8 max-w-2xl text-sm leading-6 text-on-surface-variant">
                Set the analysis context before uploading the source documents.
              </p>
              <div className="grid grid-cols-3 gap-6">
                <div className="flex flex-col gap-2.5">
                  <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface">Project Name</label>
                  <input
                    className="rounded-md border border-slate-300 bg-white p-3.5 text-sm text-on-surface outline-none transition-all placeholder:text-slate-400 focus:border-[#e67e22] focus:ring-4 focus:ring-[#e67e22]/10"
                    placeholder="e.g., Skyline Tower Phase 2"
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2.5">
                  <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface">Contract Number</label>
                  <input
                    className="rounded-md border border-slate-300 bg-white p-3.5 text-sm text-on-surface outline-none transition-all placeholder:text-slate-400 focus:border-[#e67e22] focus:ring-4 focus:ring-[#e67e22]/10"
                    placeholder="e.g., BC-2024-881"
                    type="text"
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2.5">
                  <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface">Potential Change Request Number</label>
                  <input
                    className="rounded-md border border-slate-300 bg-white p-3.5 text-sm text-on-surface outline-none transition-all placeholder:text-slate-400 focus:border-[#e67e22] focus:ring-4 focus:ring-[#e67e22]/10"
                    placeholder="e.g., CR-012"
                    type="text"
                    value={changeRequestId}
                    onChange={(e) => setChangeRequestId(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50/35 p-10">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-on-surface">Required Documents</h2>
              <p className="mb-8 max-w-2xl text-sm leading-6 text-on-surface-variant">
                Upload the contract package and the communications that triggered the change request.
              </p>
              <div className="grid grid-cols-2 gap-6">

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
                    className="group relative flex min-h-[200px] flex-col justify-end rounded-[20px] border-[1.5px] border-dashed border-slate-300 bg-[linear-gradient(180deg,#ffffff_0%,#f7f8fa_100%)] p-6 text-left transition-all hover:-translate-y-0.5 hover:border-[#e67e22] hover:bg-[linear-gradient(180deg,#ffffff_0%,#fef9f0_100%)] hover:shadow-lg hover:shadow-[#e67e22]/10"
                  >
                    <div className="absolute right-5 top-5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Required
                    </div>
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-all group-hover:border-[#e67e22]/30 group-hover:text-[#e67e22]">
                      <FileUp size={24} />
                    </div>
                    <div>
                      <p className="text-base font-bold text-on-surface">Upload Contract</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">PDF or DOCX up to 50MB</p>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => correspondenceInputRef.current?.click()}
                  className={`group relative flex min-h-[200px] flex-col justify-end rounded-[20px] border-[1.5px] p-6 text-left transition-all ${
                    uploaded.correspondence
                      ? 'border-emerald-300 bg-[linear-gradient(180deg,#ffffff_0%,#f3fbf6_100%)] shadow-lg shadow-emerald-500/5'
                      : 'border-dashed border-slate-300 bg-[linear-gradient(180deg,#ffffff_0%,#fff7ef_100%)] hover:-translate-y-0.5 hover:border-[#e67e22] hover:shadow-lg hover:shadow-[#e67e22]/10'
                  }`}
                >
                  <div className={`absolute right-5 top-5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                    uploaded.correspondence
                      ? 'border-emerald-200 bg-white text-emerald-700'
                      : 'border-[#e67e22]/20 bg-white text-[#8b4e0e]'
                  }`}>
                    {uploaded.correspondence ? 'Uploaded' : analyzing ? 'Processing' : 'Required'}
                  </div>
                  <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border transition-all ${
                    uploaded.correspondence
                      ? 'border-emerald-200 bg-white text-emerald-600'
                      : 'border-[#e67e22]/20 bg-white text-[#e67e22]'
                  }`}>
                    {uploaded.correspondence ? <CheckCircle2 size={24} /> : <Mail size={24} />}
                  </div>
                  <div>
                    <p className="text-base font-bold text-on-surface">
                      {uploaded.correspondence ? correspondenceFile?.name ?? 'Correspondence Uploaded' : 'Upload Correspondence'}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {uploaded.correspondence ? 'Successfully staged' : 'PDF or DOCX (Emails, RFIs, or minutes)'}
                    </p>
                  </div>
                </button>
              </div>

              <div className="mt-10 flex flex-col items-end gap-3">
                <p className="text-[11px] font-medium text-slate-500">Requires contract and correspondence to generate report</p>
                <button
                  onClick={handleAnalyze}
                  disabled={!uploaded.contract || !uploaded.correspondence || analyzing}
                  className={`flex items-center gap-2 rounded-md px-12 py-4 font-bold transition-all shadow-lg ${
                    uploaded.contract && uploaded.correspondence && !analyzing
                      ? 'bg-[#e67e22] text-white hover:opacity-95 active:scale-95'
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

          <div className="flex items-start gap-5 rounded-2xl bg-on-surface p-8 text-white shadow-xl shadow-slate-900/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e67e22]/20 text-[#f39c12]">
              <Info size={20} />
            </div>
            <div>
              <p className="text-sm font-bold mb-1.5">AI-Assisted Contract Analysis</p>
              <p className="text-[13px] text-white/70 leading-relaxed font-medium">
                Your documents are analyzed securely. Files are processed to extract clauses and generate your risk assessment — never stored or shared.
              </p>
            </div>
          </div>
        </div>

        <div className="col-span-4">
          <div className="sticky top-24 flex flex-col gap-6">
            <section className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,#13264f_0%,#0f2044_100%)] shadow-2xl shadow-slate-900/15">
              <div className="border-b border-white/8 p-6">
                <h3 className="text-sm font-bold text-white">Workflow Progress</h3>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">Analysis readiness</p>
              </div>
              <div className="border-b border-white/8 px-8 py-6">
                <div className="flex items-end gap-3">
                  <div className="font-headline text-5xl font-extrabold leading-none text-white">
                    {uploaded.contract ? (uploaded.correspondence ? '2/3' : '1/3') : '0/3'}
                  </div>
                  <div className="max-w-[160px] pb-1 text-xs leading-5 text-white/60">
                    Steps completed before the report can be generated.
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-6 p-8">
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${uploaded.contract ? 'bg-emerald-500 text-white' : 'border-2 border-white/20'}`}>
                    {uploaded.contract && <CheckCircle2 size={14} />}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-white">Contract Uploaded</p>
                    <p className="text-[10px] text-white/55">{uploaded.contract ? contractFile?.name : 'Awaiting file...'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${uploaded.correspondence ? 'bg-emerald-500 text-white' : 'border-2 border-[#e67e22] bg-[#e67e22]/15'}`}>
                    {uploaded.correspondence ? <CheckCircle2 size={14} /> : <div className="h-1.5 w-1.5 rounded-full bg-[#e67e22] animate-pulse" />}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-white">Correspondence</p>
                    <p className="text-[10px] text-white/55">
                      {uploaded.correspondence
                        ? correspondenceFile?.name
                        : analyzing
                          ? 'Parsing attachments and metadata...'
                          : 'Awaiting documentation...'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 border-white/20"></div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-white">Risk Score Generation</p>
                    <p className="text-[10px] text-white/55">{analyzing ? analysisStatus || 'Queued for analysis' : 'Waiting for upload'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 px-8 pb-8">
                <div className="rounded-2xl border border-white/8 bg-white/6 p-4">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">Docs staged</div>
                  <div className="mt-2 text-2xl font-bold text-white">{Number(Boolean(uploaded.contract)) + Number(Boolean(uploaded.correspondence))}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/6 p-4">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">Expected output</div>
                  <div className="mt-2 text-2xl font-bold text-white">5 views</div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
