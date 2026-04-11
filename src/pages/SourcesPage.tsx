import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Download, ZoomIn, ZoomOut, FileText,
  AlertTriangle, Info, ArrowRight, List, Bookmark,
  Scale, Loader2, Send
} from 'lucide-react';
import { loadCurrentThread } from '../lib/db';
import { Citation, ExtractedPage } from '../types';

// Inline chat for the Sources page bottom panel
function SourcesChat({ contractName }: { contractName: string }) {
  const [input,   setInput]   = useState('');
  const [answer,  setAnswer]  = useState('');
  const [chunks,  setChunks]  = useState<any[]>([]);

  useEffect(() => {
    loadCurrentThread().then(thread => {
      const c = [...(thread?.contract?.chunks ?? []), ...(thread?.correspondence?.chunks ?? [])];
      setChunks(c);
    });
  }, []);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleAsk = async () => {
    const question = input.trim();
    if (!question || loading) return;
    setLoading(true);
    setAnswer('');
    setError('');
    try {
      const res  = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ question, chunks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat failed.');
      setAnswer(data.answer);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAsk()}
          disabled={loading}
          className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm outline-none placeholder:text-slate-400 disabled:opacity-50"
          placeholder={contractName ? `Ask about ${contractName}…` : 'Ask a question about these clauses...'}
          type="text"
        />
        <button
          onClick={handleAsk}
          disabled={!input.trim() || loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
      {answer && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-on-surface leading-relaxed">
          {answer}
        </div>
      )}
      {error && (
        <p className="text-xs text-rose-600">{error}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the first page number mentioned in a citation source string.
 *  e.g. "Section 7.2, Page 14" → 14,  "Page 3" → 3,  "p. 5" → 5
 */
function parsePageFromSource(source: string): number | null {
  const m = source.match(/(?:page|pg|p\.?)\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

/** Pull a heading from the start of a page's text for the outline.
 *  Looks for numbered headings (1., 1.1, Article 1) or ALL-CAPS lines.
 */
function extractHeading(text: string): string | null {
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 6)) {
    if (/^(\d+\.|\d+\.\d+|article\s+\d+|section\s+\d+)/i.test(line) && line.length < 120) return line;
    if (/^[A-Z][A-Z\s]{4,50}$/.test(line)) return line;
  }
  return null;
}

/** Confidence badge color */
function confidenceStyle(c: Citation['confidence']) {
  if (c === 'High')   return { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', border: 'border-emerald-300', bg: 'bg-emerald-50/40' };
  if (c === 'Medium') return { badge: 'bg-amber-100 text-amber-700 border-amber-200',     border: 'border-amber-300',   bg: 'bg-amber-50/40'   };
  return               { badge: 'bg-rose-100 text-rose-700 border-rose-200',       border: 'border-rose-300',    bg: 'bg-rose-50/40'    };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SourcesPage() {
  const navigate = useNavigate();
  const scrollRef  = useRef<HTMLDivElement>(null);
  const [pages,     setPages]     = useState<ExtractedPage[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [docName,   setDocName]   = useState('');
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [zoom,      setZoom]      = useState(100);

  useEffect(() => {
    const load = async () => {
      try {
        const thread = await loadCurrentThread();
        if (thread?.contract?.pages?.length) {
          setPages(thread.contract.pages);
          setDocName(thread.contract.name);
        }
        if (thread?.citations?.length) {
          setCitations(thread.citations as Citation[]);
        }
      } catch (err) {
        console.error('Failed to load sources:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Pages that have at least one citation referencing them
  const citedPageNumbers = new Set(
    citations.map(c => parsePageFromSource(c.source)).filter((n): n is number => n !== null)
  );

  // Auto-detected outline from page headings
  const outline = pages.map(p => ({
    pageNumber: p.pageNumber,
    heading:    extractHeading(p.text) ?? `Page ${p.pageNumber}`,
    hasCitation: citedPageNumbers.has(p.pageNumber),
  }));

  // Filtered citations based on search
  const filteredCitations = search.trim()
    ? citations.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.text.toLowerCase().includes(search.toLowerCase()) ||
        c.source.toLowerCase().includes(search.toLowerCase())
      )
    : citations;

  const scrollToPage = (pageNumber: number) => {
    const el = document.getElementById(`page-${pageNumber}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ---------------------------------------------------------------------------
  // Loading state
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
  // No analysis yet
  // ---------------------------------------------------------------------------
  if (pages.length === 0 && citations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4 text-center px-8">
        <FileText size={48} className="text-slate-300" />
        <h2 className="text-xl font-bold text-on-surface">No document loaded</h2>
        <p className="text-on-surface-variant max-w-sm text-sm">
          Upload and analyze a contract to view the document text and AI-extracted citations here.
        </p>
        <button
          onClick={() => navigate('/intake')}
          className="mt-2 bg-primary text-white px-6 py-2.5 rounded-lg font-bold hover:bg-primary-dim transition-all"
        >
          Go to Intake
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main layout
  // ---------------------------------------------------------------------------
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

      {/* ── Left: Document Viewer ── */}
      <section className="flex-1 flex flex-col border-r border-slate-200 min-w-0">

        {/* Toolbar */}
        <div className="h-14 flex items-center justify-between px-6 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="text-primary shrink-0" size={18} />
            <h2 className="font-headline font-bold text-on-surface text-sm truncate">
              {docName || 'Contract Document'}
            </h2>
            {pages.length > 0 && (
              <span className="text-[10px] text-slate-400 shrink-0">{pages.length} pages</span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1">
              <button
                onClick={() => setZoom(z => Math.max(70, z - 10))}
                className="p-1 hover:bg-slate-50 rounded transition-colors"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-xs font-mono px-2 w-12 text-center">{zoom}%</span>
              <button
                onClick={() => setZoom(z => Math.min(150, z + 10))}
                className="p-1 hover:bg-slate-50 rounded transition-colors"
              >
                <ZoomIn size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">

          {/* Document Outline */}
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
                  <button
                    key={item.pageNumber}
                    onClick={() => scrollToPage(item.pageNumber)}
                    className="w-full text-left px-3 py-2 rounded-lg text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-all flex items-center justify-between gap-2 group"
                  >
                    <span className="truncate">{item.heading}</span>
                    {item.hasCitation && (
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
            <div className="p-4 bg-slate-50/50 border-t border-slate-100">
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                <Bookmark size={12} />
                <span>{pages.length} page{pages.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Page Text Viewer */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-100 p-8 scroll-smooth">
            {pages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <FileText size={40} className="text-slate-300" />
                <p className="text-sm text-slate-500 font-medium">
                  Document text could not be extracted.<br />
                  This may be a scanned or image-only PDF.
                </p>
              </div>
            ) : (
              <div
                className="space-y-6 mx-auto"
                style={{ maxWidth: `${Math.round(760 * zoom / 100)}px`, fontSize: `${zoom}%` }}
              >
                {pages.map(page => {
                  const isCited = citedPageNumbers.has(page.pageNumber);
                  const pageCitations = citations.filter(c => parsePageFromSource(c.source) === page.pageNumber);

                  return (
                    <div
                      key={page.pageNumber}
                      id={`page-${page.pageNumber}`}
                      className={`bg-white shadow-sm rounded-xl scroll-mt-4 overflow-hidden ${isCited ? 'ring-2 ring-rose-400' : ''}`}
                    >
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
                      <div className="p-10 font-serif text-[#1e1e1e] leading-relaxed text-sm whitespace-pre-wrap">
                        {page.text}
                      </div>

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
            )}
          </div>
        </div>
      </section>

      {/* ── Right: Citations Panel ── */}
      <section className="w-[420px] flex flex-col bg-white overflow-hidden shadow-2xl z-10 shrink-0">

        {/* Panel header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline font-bold text-lg text-on-surface">Citations & Evidence</h2>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
              {citations.length} Finding{citations.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              placeholder="Search citations..."
              type="text"
            />
          </div>
        </div>

        {/* Citation list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* No analysis at all */}
          {citations.length === 0 && (
            <div className="text-center py-8 space-y-3">
              <Scale size={32} className="text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-on-surface">No citations extracted</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                AI citations could not be extracted for this document. Review the Report page for findings, or run a new analysis.
              </p>
            </div>
          )}

          {/* Search returned nothing */}
          {citations.length > 0 && filteredCitations.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">No citations match "{search}"</p>
          )}

          {filteredCitations.map((cite, i) => {
            const style = confidenceStyle(cite.confidence);
            const pageNum = parsePageFromSource(cite.source);

            return (
              <div key={cite.id} className="group">
                {/* Citation header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm shrink-0 ${
                    cite.confidence === 'High'   ? 'bg-emerald-500 text-white' :
                    cite.confidence === 'Medium' ? 'bg-amber-500 text-white' :
                                                   'bg-rose-500 text-white'
                  }`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-on-surface leading-tight">{cite.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${style.badge}`}>
                        {cite.confidence}
                      </span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">{cite.source}</p>
                  </div>
                </div>

                {/* Citation body */}
                <div className={`rounded-xl p-5 border shadow-sm group-hover:shadow-md transition-all ${style.bg} ${style.border}`}>
                  {/* Quoted text */}
                  <p className="text-xs text-on-surface-variant leading-relaxed mb-4 italic font-medium">
                    "{cite.text}"
                  </p>

                  <div className="space-y-4">
                    {/* Explanation */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5 text-slate-600">
                        <Scale size={12} /> Analysis
                      </span>
                      <p className="text-xs text-on-surface leading-relaxed">{cite.explanation}</p>
                    </div>

                    {/* Scroll to page button */}
                    {pageNum !== null && (
                      <button
                        onClick={() => scrollToPage(pageNum)}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline mt-1"
                      >
                        <ArrowRight size={12} />
                        Jump to Page {pageNum}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Ask the Contract footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Info className="text-primary" size={14} />
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Ask the Contract</span>
            </div>
            <SourcesChat contractName={docName} />
          </div>
        </div>
      </section>
    </div>
  );
}
