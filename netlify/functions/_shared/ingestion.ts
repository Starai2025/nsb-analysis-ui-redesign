import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import type { ExtractedDocument, ExtractedChunk, ExtractedPage, DocumentType } from "../../../src/types.js";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = "";

const CHUNK_SIZE    = 2000;
const CHUNK_OVERLAP = 400;
const MAX_CHUNKS    = 200;

function chunkText(text: string, sourceId: string, pageNumber?: number): ExtractedChunk[] {
  const chunks: ExtractedChunk[] = [];
  let index = 0, pos = 0;
  while (pos < text.length && chunks.length < MAX_CHUNKS) {
    const end   = Math.min(pos + CHUNK_SIZE, text.length);
    const slice = text.slice(pos, end).trim();
    if (slice.length > 50) {
      chunks.push({ id: `${sourceId}-chunk-${index}`, text: slice, pageNumber, sourceId, charStart: pos, charEnd: end });
      index++;
    }
    if (end === text.length) break;
    pos += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

async function ingestPDF(buffer: Buffer, docId: string): Promise<{ pages: ExtractedPage[]; chunks: ExtractedChunk[] }> {
  const pages: ExtractedPage[] = [], chunks: ExtractedChunk[] = [];
  try {
    const pdf = await (pdfjsLib as any).getDocument({ data: new Uint8Array(buffer), disableFontFace: true, verbosity: 0 }).promise;
    for (let p = 1; p <= pdf.numPages; p++) {
      try {
        const content = await (await pdf.getPage(p)).getTextContent();
        const text = content.items.map((i: any) => ("str" in i ? i.str : "")).join(" ").replace(/\s+/g, " ").trim();
        if (text.length > 0) {
          pages.push({ pageNumber: p, text });
          for (const c of chunkText(text, docId, p)) { if (chunks.length < MAX_CHUNKS) chunks.push(c); }
        }
      } catch { /* skip unreadable page */ }
    }
  } catch (e) {
    console.warn("PDF extraction failed (possibly encrypted/image-only):", e);
  }
  return { pages, chunks };
}

async function ingestDOCX(buffer: Buffer, docId: string): Promise<{ pages: ExtractedPage[]; chunks: ExtractedChunk[] }> {
  const pages: ExtractedPage[] = [], chunks: ExtractedChunk[] = [];
  try {
    const fullText  = (await mammoth.extractRawText({ buffer })).value;
    const PAGE_SIZE = 3000;
    let pageNumber = 1, pos = 0;
    while (pos < fullText.length) {
      const text = fullText.slice(pos, Math.min(pos + PAGE_SIZE, fullText.length)).trim();
      if (text.length > 0) {
        pages.push({ pageNumber, text });
        for (const c of chunkText(text, docId, pageNumber)) { if (chunks.length < MAX_CHUNKS) chunks.push(c); }
        pageNumber++;
      }
      pos += PAGE_SIZE;
    }
  } catch (e) { console.warn("DOCX extraction failed:", e); }
  return { pages, chunks };
}

export async function ingestDocument(
  buffer: Buffer, mimetype: string, originalname: string,
  type: DocumentType, fileSize: number
): Promise<ExtractedDocument> {
  const id  = `doc-${Date.now()}-${type}`;
  const now = new Date().toISOString();
  const { pages, chunks } = mimetype === "application/pdf"
    ? await ingestPDF(buffer, id)
    : await ingestDOCX(buffer, id);
  console.log(`Ingested "${originalname}": ${pages.length} pages, ${chunks.length} chunks`);
  return { id, name: originalname, type, pages, chunks, metadata: { fileSize, mimeType: mimetype, uploadedAt: now } };
}
