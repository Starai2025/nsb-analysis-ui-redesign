import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ZoomIn, ZoomOut, FileText,
  AlertTriangle, Info, ArrowRight, List, Bookmark,
  Scale, Loader2, FileSearch
} from 'lucide-react';
import { loadCurrentThread } from '../lib/db';
import { loadCurrentWorkspaceThreadView } from '../lib/projectStore';
import NoAnalysis from '../components/NoAnalysis';
import { Citation, ExtractedPage, ClauseEntry } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePageFromSource(source: string): number | null {
  const m = source.match(/(?:page|pg|p\.?)\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function extractHeading(text: string): string | null {
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 6)) {
    if (/^(\d+\.|\d+\.\d+|article\s+\d+|section\s+\d+)/i.test(line) && line.length < 120) return line;
    if (/^[A-Z][A-Z\s]{4,50}$/.test(line)) return line;
  }
  return null;
}

function confidenceStyle(c: Citation['confidence']) {
  if (c === 'High')   return { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', border: 'border-emerald-300', bg: 'bg-emerald-50/40' };
  if (c === 'Medium') return { badge: 'bg-amber-100 text-amber-700 border-amber-200',     border: 'border-amber-300',   bg: 'bg-amber-50/40'   };
  return               { badge: 'bg-rose-100 text-rose-700 border-rose-200',       border: 'border-rose-300',    bg: 'bg-rose-50/40'    };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SourcesPage() {
  const navigate     = useNavigate();
  const scrollRef    = useRef<HTMLDivElement>(null);
  const iframeRef    = useRef<HTMLIFrameElement>(null);

  const [pages,     setPages]     = useState<ExtractedPage[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [docName,   setDocName]   = useState('');
  const [pdfUrl,    setPdfUrl]    = useState<string | null>(null);
  const [clauses,   setClauses]   = useState<ClauseEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [zoom,      setZoom]      = useState(100);
  const [currentPage, setCurrentPage] = useState(1);

  // Precise load state for accurate empty-state messaging
  const [noThread,         setNoThread]         = useState(false);
  const [contractMissing,  setContractMissing]  = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);

  useEffect(() => {
    let blobUrl: string | null = null;

    const load = async () => {
      try {
        const thread = await loadCurrentWorkspaceThreadView({ includeArtifactBuffers: true }) ?? await loadCurrentThread();

        if (!thread?.analysis) { setNoThread(true); return; }
        if (!thread.contract)  { setContractMissing(true); return; }

        // Store name regardless
        setDocName(thread.contract.name ?? '');

        // PDF blob → iframe viewer (works for scanned AND text PDFs)
        if (thread.contractBlob) {
          const blob = new Blob([thread.contractBlob], { type: 'application/pdf' });
          blobUrl    = URL.createObjectURL(blob);
          setPdfUrl(blobUrl);
        }

        // Text pages → text viewer (fallback / secondary)
        if (thread.contract.pages?.length) {
          setPages(thread.contract.pages);
        } else if (!thread.contractBlob) {
          // No blob AND no pages → genuine extraction failure
          setExtractionFailed(true);
        }

        if (thread.citations?.length) {
          setCitations(thread.citations as Citation[]);
        }
        // Pull Key Contract Clauses from the report if one has been generated
        if (thread.report?.sections?.keyContractClauses?.length) {
          setClauses(thread.report.sections.keyContractClauses);
        }
      } catch (err) {
        console.error('Failed to load sources:', err);
        setNoThread(true);
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, []);

  const citedPageNumbers = new Set(
    citations.map(c => parsePageFromSource(c.source)).filter((n): n is number => n !== null)
  );

  const outline = pdfUrl
    ? Array.from({ length: Math.max(pages.length, 1) }, (_, i) => ({
        pageNumber: i + 1,
        heading:    pages[i] ? (extractHeading(pages[i].text) ?? `Page ${i + 1}`) : `Page ${i + 1}`,
        hasCitation: citedPageNumbers.has(i + 1),
      }))
    : pages.map(p => ({
        pageNumber:  p.pageNumber,
        heading:     extractHeading(p.text) ?? `Page ${p.pageNumber}`,
        hasCitation: citedPageNumbers.has(p.pageNumber),
      }));

  const filteredCitations = search.trim()
    ? citations.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.text.toLowerCase().includes(search.toLowerCase()) ||
        c.source.toLowerCase().includes(search.toLowerCase())
      )
    : citations;

  // Jump to page — iframe uses hash fragment, text viewer uses scrollIntoView
  const scrollToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    if (pdfUrl && iframeRef.current) {
      iframeRef.current.src = `${pdfUrl}#page=${pageNumber}`;
    } else {
      document.getElementById(`page-${pageNumber}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] gap-4">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="text-on-surface-variant font-bold">Loading document...</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Precise empty states
  // ---------------------------------------------------------------------------
  if (noThread || contractMissing || (extractionFailed && !pdfUrl) || (pages.length === 0 && !pdfUrl && citations.length === 0)) {
    let icon   = <FileText size={48} className="text-slate-300" />;
    let title  = 'No document loaded';
    let detail = 'Upload and analyze a contract to view the document and AI-extracted citations here.';
    let hint: string | null = null;

    if (contractMissing) {
      icon   = <AlertTriangle size={48} className="text-amber-400" />;
      title  = 'Contract data missing from thread';
      detail = 'The contract was not saved in this analysis thread. This can happen if the page was saved without full evidence.';
      hint   = 'Return to Intake and run a new analysis to restore the document viewer.';
    } else if (extractionFailed) {
      icon   = <FileSearch size={48} className="text-amber-400" />;
      title  = docName ? `No text extracted from "${docName}"` : 'Document text extraction returned zero pages';
      detail = 'This PDF appears to be scanned or image-only. Text must be selectable for the text viewer, but re-uploading will enable the visual PDF viewer.';
      hint   = 'Run a new analysis to enable the PDF viewer for this document.';
    }

    // noThread = no analysis at all → use the guided NoAnalysis journey card
    if (noThread || (!contractMissing && !extractionFailed)) {
      return <NoAnalysis currentStep="sources" />;
    }
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4 text-center px-8">
        {icon}
        <h2 className="text-xl font-bold text-on-surface">{title}</h2>
        <p className="text-on-surface-variant max-w-sm text-sm">{detail}</p>
        {hint && <p className="text-slate-400 max-w-sm text-xs italic">{hint}</p>}
        <button onClick={() => navigate('/intake')}
          className="mt-2 bg-primary text-white px-6 py-2.5 rounded-lg font-bold hover:bg-primary-dim transition-all">
          Go to Intake
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main layout — full Sources page
  // ---------------------------------------------------------------------------
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

      {/* ── Left: Document Viewer ── */}
      <section className="flex-1 flex flex-col border-r border-slate-200 min-w-0">

        {/* Toolbar */}
        <div className="h-14 flex items-center justify-between px-6 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="text-primary shrink-0" size={18} />
            <h2 id="sourcesFileName" className="font-headline font-bold text-on-surface text-sm truncate">
              {docName || 'Contract Document'}
            </h2>
            {pages.length > 0 && !pdfUrl && (
              <span className="text-[10px] text-slate-400 shrink-0">{pages.length} pages (text)</span>
            )}
            {pdfUrl && (
              <span id="sourcesViewerMode" className="text-[10px] text-emerald-600 shrink-0 font-bold">PDF Viewer</span>
            )}
            {!pdfUrl && (
              <span id="sourcesViewerMode" className="text-[10px] text-slate-400 shrink-0 font-bold">Text Viewer</span>
            )}
          </div>
          <div className="sr-only">
            <span id="viewerCurrentPage">{currentPage}</span>
            <span id="viewerTotalPages">{Math.max(outline.length, pages.length, currentPage)}</span>
          </div>
          {/* Zoom only relevant for text view */}
          {!pdfUrl && (
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1">
                <button onClick={() => setZoom(z => Math.max(70, z - 10))} className="p-1 hover:bg-slate-50 rounded transition-colors"><ZoomOut size={14} /></button>
                <span className="text-xs font-mono px-2 w-12 text-center">{zoom}%</span>
                <button onClick={() => setZoom(z => Math.min(150, z + 10))} className="p-1 hover:bg-slate-50 rounded transition-colors"><ZoomIn size={14} /></button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex overflow-hidden">

          {/* Outline sidebar */}
          <div className="w-56 bg-white border-r border-slate-100 flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-50 flex items-center gap-2">
              <List size={14} className="text-slate-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Outline</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {outline.length === 0 ? (
                <p className="text-[11px] text-slate-400 p-3">No sections detected</p>
              ) : (
                outline.map(item => (
                  <button key={item.pageNumber} onClick={() => scrollToPage(item.pageNumber)}
                    className="thumb-item w-full text-left px-3 py-2 rounded-lg text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-all flex items-center justify-between gap-2">
                    <span className="truncate">{item.heading}</span>
                    {item.hasCitation && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
                  </button>
                ))
              )}
            </div>
            <div className="p-4 bg-slate-50/50 border-t border-slate-100">
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                <Bookmark size={12} />
                <span>{pdfUrl ? 'PDF' : `${pages.length} page${pages.length !== 1 ? 's' : ''}`}</span>
              </div>
            </div>
          </div>

          {/* Main viewer */}
          <div ref={scrollRef} className="flex-1 overflow-hidden bg-slate-100 relative">

            {/* PDF iframe viewer */}
            {pdfUrl && (
              <iframe
                id="sourcesCanvas"
                ref={iframeRef}
                src={pdfUrl}
                className="w-full h-full border-0 bg-white"
                title={docName || 'Contract Document'}
              />
            )}

            {/* Text viewer (when no PDF blob but text pages exist) */}
            {!pdfUrl && pages.length > 0 && (
              <div className="h-full overflow-y-auto p-8 scroll-smooth">
                <div
                  id="sourcesCanvas"
                  className="space-y-6 mx-auto"
                  style={{ maxWidth: `${Math.round(760 * zoom / 100)}px`, fontSize: `${zoom}%` }}
                >
                  {pages.map(page => {
                    const isCited        = citedPageNumbers.has(page.pageNumber);
                    const pageCitations  = citations.filter(c => parsePageFromSource(c.source) === page.pageNumber);
                    return (
                      <div key={page.pageNumber} id={`page-${page.pageNumber}`}
                        className={`bg-white shadow-sm rounded-xl scroll-mt-4 overflow-hidden ${isCited ? 'ring-2 ring-rose-400' : ''}`}>
                        {/* Page header */}
                        <div className={`flex items-center justify-between px-8 py-3 border-b text-[10px] font-bold uppercase tracking-widest ${isCited ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                          <span>{docName || 'Contract'}</span>
                          <div className="flex items-center gap-3">
                            {isCited && (
                              <div className="flex items-center gap-1 text-rose-600">
                                <AlertTriangle size={10} />
                                <span>{pageCitations.length} risk clause{pageCitations.length !== 1 ? 's' : ''}</span>
                              </div>
                            )}
                            <span>Page {page.pageNumber}</span>
                          </div>
                        </div>
                        {/* Page text */}
                        <div className="p-10 font-serif text-[#1e1e1e] leading-relaxed text-sm whitespace-pre-wrap">{page.text}</div>
                        {/* Inline citation badges */}
                        {pageCitations.length > 0 && (
                          <div className="px-10 pb-8 space-y-3">
                            {pageCitations.map(c => {
                              const style = confidenceStyle(c.confidence);
                              return (
                                <div key={c.id} className={`rounded-lg p-4 border ${style.bg} ${style.border}`}>
                                  <div className="flex items-start gap-3">
                                    <AlertTriangle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className="text-xs font-bold text-on-surface">{c.title}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${style.badge}`}>{c.confidence} Confidence</span>
                                      </div>
                                      <p className="text-[11px] text-on-surface-variant leading-relaxed">{c.explanation}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Both empty (shouldn't reach here normally) */}
            {!pdfUrl && pages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <FileText size={40} className="text-slate-300" />
                <p className="text-sm text-slate-500 font-medium">
                  Document not available.<br />Run a new analysis to restore the viewer.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Right: Citations Panel ── */}
      <section id="citationsPanel" className="w-[420px] flex flex-col bg-white overflow-hidden shadow-2xl z-10 shrink-0">

        {/* Panel header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline font-bold text-lg text-on-surface">Citations & Evidence</h2>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
              {citations.length + clauses.length} Finding{citations.length + clauses.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              placeholder="Search citations..." type="text" />
          </div>
        </div>

        {/* Citation list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {citations.length === 0 && (
            <div className="text-center py-8 space-y-3">
              <Scale size={32} className="text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-on-surface">No citations extracted</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                AI citations could not be extracted for this document. Review the Report page for findings, or run a new analysis.
              </p>
            </div>
          )}
          {citations.length > 0 && filteredCitations.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">No citations match "{search}"</p>
          )}
          {filteredCitations.map((cite, i) => {
            const style    = confidenceStyle(cite.confidence);
            const pageNum  = parsePageFromSource(cite.source);
            return (
              <div key={cite.id} className="group">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm shrink-0 ${
                    cite.confidence === 'High' ? 'bg-emerald-500 text-white' :
                    cite.confidence === 'Medium' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                  }`}>{String(i + 1).padStart(2, '0')}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-on-surface leading-tight">{cite.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${style.badge}`}>{cite.confidence}</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">{cite.source}</p>
                  </div>
                </div>
                <div className={`rounded-xl p-5 border shadow-sm group-hover:shadow-md transition-all ${style.bg} ${style.border}`}>
                  <p className="text-xs text-on-surface-variant leading-relaxed mb-4 italic font-medium">"{cite.text}"</p>
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5 text-slate-600">
                        <Scale size={12} /> Analysis
                      </span>
                      <p className="text-xs text-on-surface leading-relaxed">{cite.explanation}</p>
                    </div>
                    {pageNum !== null && (
                      <button onClick={() => scrollToPage(pageNum)}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline mt-1">
                        <ArrowRight size={12} /> Jump to Page {pageNum}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Key Contract Clauses from Report */}
        {clauses.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-4 pt-4 border-t border-slate-200">
              <Scale size={14} className="text-primary shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Key Contract Clauses</span>
              <span className="text-[10px] text-slate-400">from Report</span>
            </div>
            <div className="space-y-4">
              {clauses.map((clause, i) => (
                <div key={i} className="rounded-xl border border-slate-200 overflow-hidden group hover:shadow-md transition-all">
                  {/* Reference header */}
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
                    <FileText size={12} className="text-primary shrink-0" />
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider truncate">{clause.reference}</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Excerpt */}
                    <blockquote className="border-l-4 border-primary/30 pl-3 text-xs italic text-slate-600 leading-relaxed">
                      {clause.excerpt}
                    </blockquote>
                    {/* Meaning */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Meaning</span>
                      <p className="text-xs text-on-surface leading-relaxed">{clause.meaning}</p>
                    </div>
                    {/* Why it matters */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Why It Matters</span>
                      <p className="text-xs text-on-surface-variant leading-relaxed">{clause.whyItMatters}</p>
                    </div>
                    {/* Jump to page if page number in reference */}
                    {(() => {
                      const m = clause.reference.match(/(?:page|pg|p\.?)\s*(\d+)/i);
                      const pg = m ? parseInt(m[1], 10) : null;
                      return pg !== null ? (
                        <button onClick={() => scrollToPage(pg)}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline">
                          <ArrowRight size={12} /> Jump to Page {pg}
                        </button>
                      ) : null;
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


      </section>
    </div>
  );
}
