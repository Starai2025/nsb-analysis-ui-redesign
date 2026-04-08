import React, { useState, useRef } from 'react';
import { FileUp, Mail, ArrowRight, CheckCircle2, Info, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { DocumentType } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

export default function IntakePage() {
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [correspondenceFile, setCorrespondenceFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<Record<string, boolean>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contractInputRef = useRef<HTMLInputElement>(null);
  const correspondenceInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: DocumentType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Gemini inlineData only supports PDF for documents
    if (file.type !== 'application/pdf') {
      setError("Only PDF files are supported for automated analysis. Please convert your document to PDF and try again.");
      return;
    }

    if (type === 'contract') setContractFile(file);
    else setCorrespondenceFile(file);

    setUploaded(prev => ({ ...prev, [type]: true }));
    setError(null);
  };

  const handleAnalyze = async () => {
    console.log("Analyze button clicked (Frontend Refined)");
    if (!contractFile || !correspondenceFile) {
      setError("Please upload both the contract and the correspondence.");
      return;
    }
    
    setAnalyzing(true);
    setError(null);

    try {
      // 1. Check API Key
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API Key is missing. Please add it in the application settings (Settings -> API Keys).");
      }
      if (apiKey.length < 20) {
        throw new Error("The Gemini API Key seems too short. Please ensure you have copied the full key from Google AI Studio.");
      }

      // 2. Check File Sizes (inlineData limit is ~20MB)
      const MAX_INLINE_SIZE = 15 * 1024 * 1024; // 15MB
      if (contractFile.size > MAX_INLINE_SIZE || correspondenceFile.size > MAX_INLINE_SIZE) {
        throw new Error("One of the files is too large for instant analysis (max 15MB). Please try a smaller or compressed PDF.");
      }

      const ai = new GoogleGenAI({ apiKey });

      // 3. Prepare Files
      console.log("Converting files to base64...");
      const [contractBase64, correspondenceBase64] = await Promise.all([
        fileToBase64(contractFile),
        fileToBase64(correspondenceFile)
      ]);

      console.log("Starting Gemini analysis...");
      const prompt = `
        You are a senior construction contract manager. Analyze the following contract and correspondence.
        
        Provide a decision summary in JSON format with the following fields:
        - executiveConclusion (string, max 3 sentences)
        - scopeStatus (string, e.g., "In Scope", "Out of Scope")
        - primaryResponsibility (string)
        - secondaryResponsibility (string)
        - extraMoneyLikely (boolean)
        - extraTimeLikely (boolean)
        - claimableAmount (string)
        - extraDays (string)
        - noticeDeadline (string, ISO date)
        - strategicRecommendation (string)
        - keyRisks (array of { title: string, description: string })
        
        IMPORTANT: Return ONLY the raw JSON object. Do not include markdown formatting.
      `;

      // 4. Call Gemini with fallback
      let result;
      try {
        console.log("Attempting with gemini-3-flash-preview...");
        result = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              { inlineData: { data: contractBase64, mimeType: contractFile.type || 'application/pdf' } },
              { inlineData: { data: correspondenceBase64, mimeType: correspondenceFile.type || 'application/pdf' } },
              { text: prompt }
            ]
          },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                executiveConclusion: { type: Type.STRING },
                scopeStatus: { type: Type.STRING },
                primaryResponsibility: { type: Type.STRING },
                secondaryResponsibility: { type: Type.STRING },
                extraMoneyLikely: { type: Type.BOOLEAN },
                extraTimeLikely: { type: Type.BOOLEAN },
                claimableAmount: { type: Type.STRING },
                extraDays: { type: Type.STRING },
                noticeDeadline: { type: Type.STRING },
                strategicRecommendation: { type: Type.STRING },
                keyRisks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      description: { type: Type.STRING }
                    }
                  }
                }
              },
              required: [
                "executiveConclusion", "scopeStatus", "primaryResponsibility", 
                "secondaryResponsibility", "extraMoneyLikely", "extraTimeLikely", 
                "claimableAmount", "extraDays", "noticeDeadline", 
                "strategicRecommendation", "keyRisks"
              ]
            }
          }
        });
      } catch (firstTryError) {
        console.warn("gemini-3-flash-preview failed, falling back to gemini-flash-latest:", firstTryError);
        try {
          result = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: {
              parts: [
                { inlineData: { data: contractBase64, mimeType: contractFile.type || 'application/pdf' } },
                { inlineData: { data: correspondenceBase64, mimeType: correspondenceFile.type || 'application/pdf' } },
                { text: prompt }
              ]
            },
            config: {
              responseMimeType: 'application/json'
            }
          });
        } catch (secondTryError) {
          console.error("All Gemini models failed:", secondTryError);
          throw new Error(`Gemini API call failed: ${secondTryError instanceof Error ? secondTryError.message : 'Unknown error'}. Please check your internet connection and API key.`);
        }
      }

      console.log("Gemini analysis completed");
      if (!result.text) throw new Error("Empty response from Gemini");

      const cleanJson = result.text.replace(/```json|```/g, "").trim();
      const analysis = JSON.parse(cleanJson);

      // 4. Save to Backend
      console.log("Saving analysis to backend...");
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

      window.location.href = '/summary';
    } catch (err) {
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
        accept=".pdf"
      />
      <input 
        type="file" 
        ref={correspondenceInputRef} 
        className="hidden" 
        onChange={(e) => handleFileChange(e, 'correspondence')}
        accept=".pdf"
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
          {process.env.GEMINI_API_KEY && (
            <button 
              onClick={async () => {
                try {
                  const key = process.env.GEMINI_API_KEY || "";
                  if (key.length < 20) throw new Error("Key is too short");
                  const ai = new GoogleGenAI({ apiKey: key });
                  const res = await ai.models.generateContent({
                    model: 'gemini-flash-latest',
                    contents: "Say 'Connection Successful'"
                  });
                  alert(`Success: ${res.text || "Empty response"}`);
                } catch (e) {
                  const msg = e instanceof Error ? e.message : String(e);
                  console.error("Connection test failed:", e);
                  alert(`Connection failed: ${msg}\n\nCheck if your API key is correct in Settings.`);
                }
              }}
              className="text-[10px] font-bold text-primary hover:underline"
            >
              Test Connection
            </button>
          )}
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
                      <p className="text-[11px] text-slate-500 mt-1">PDF up to 50MB</p>
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
                      {uploaded.correspondence ? 'Successfully Ingested' : 'PDF only (Emails, RFIs, or minutes)'}
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
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Analyzing...
                    </>
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
