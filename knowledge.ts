import fs from "fs/promises";
import path from "path";

type Severity = "LOW" | "MED" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ClauseLibraryPattern = {
  fingerprint: string;
  category: string;
  severity: Severity;
  plain_english: string;
  what_it_means: string;
  pushback_template: string;
  statutes?: Record<string, string>;
};

export type ClauseFingerprintRecord = {
  id: string;
  title: string;
  severity: Severity;
  fingerprints: string[];
  trigger_phrases: string[];
  plain_english: string;
  why_it_matters: string;
  pushback_one_liner: string;
};

type ClauseLibraryFile = {
  version: string;
  updated: string;
  description?: string;
  patterns: ClauseLibraryPattern[];
};

type ClauseFingerprintsFile = {
  version: string;
  record_count: number;
  records: ClauseFingerprintRecord[];
};

export type KnowledgeBundle = {
  clauseLibrary: ClauseLibraryFile;
  clauseFingerprints: ClauseFingerprintsFile;
  reportTemplate: string;
  reportTemplateSummary: string;
  chatBoostTerms: Set<string>;
  versionInfo: {
    clauseLibraryVersion: string;
    clauseLibraryUpdated: string;
    clauseFingerprintVersion: string;
    clauseFingerprintRecordCount: number;
    reportTemplateVersion: string;
  };
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Knowledge load failed: ${message}`);
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function tokenizeForBoost(input: string): string[] {
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9/\- ]+/g, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2);
}

function summarizeReportTemplate(template: string): string {
  const sectionLines = template
    .split(/\r?\n/)
    .filter((line) => /^\d+\.\s+/.test(line.trim()))
    .map((line) => line.trim());

  return [
    "Template rules:",
    "Follow the master report template exactly.",
    "Always produce every required section in order.",
    ...sectionLines,
  ].join("\n");
}

function buildChatBoostTerms(records: ClauseFingerprintRecord[]): Set<string> {
  const terms = new Set<string>();
  for (const record of records) {
    const sources = [
      record.id,
      record.title,
      record.plain_english,
      ...(record.fingerprints ?? []),
      ...(record.trigger_phrases ?? []),
    ];

    for (const source of sources) {
      for (const term of tokenizeForBoost(source)) terms.add(term);
    }
  }
  return terms;
}

function validateClauseLibrary(data: ClauseLibraryFile) {
  assert(Array.isArray(data.patterns), "clause-library.json is missing patterns[]");
  for (const pattern of data.patterns) {
    assert(pattern.category, "clause-library.json has a pattern without category");
    assert(pattern.fingerprint, "clause-library.json has a pattern without fingerprint");
    assert(pattern.plain_english, `clause-library.json pattern "${pattern.category}" is missing plain_english`);
    assert(pattern.what_it_means, `clause-library.json pattern "${pattern.category}" is missing what_it_means`);
    assert(pattern.pushback_template, `clause-library.json pattern "${pattern.category}" is missing pushback_template`);
  }
}

function validateClauseFingerprints(data: ClauseFingerprintsFile) {
  assert(Array.isArray(data.records), "clause-fingerprints.json is missing records[]");
  for (const record of data.records) {
    assert(record.id, "clause-fingerprints.json has a record without id");
    assert(record.title, "clause-fingerprints.json has a record without title");
    assert(Array.isArray(record.fingerprints), `clause-fingerprints.json record "${record.id}" is missing fingerprints[]`);
    assert(Array.isArray(record.trigger_phrases), `clause-fingerprints.json record "${record.id}" is missing trigger_phrases[]`);
  }
}

export async function loadKnowledge(baseDir: string): Promise<KnowledgeBundle> {
  const knowledgeDir = path.join(baseDir, "data", "knowledge");
  const [clauseLibrary, clauseFingerprints, reportTemplate] = await Promise.all([
    readJson<ClauseLibraryFile>(path.join(knowledgeDir, "clause-library.json")),
    readJson<ClauseFingerprintsFile>(path.join(knowledgeDir, "clause-fingerprints.json")),
    fs.readFile(path.join(knowledgeDir, "final-report-template.md"), "utf8"),
  ]);

  validateClauseLibrary(clauseLibrary);
  validateClauseFingerprints(clauseFingerprints);
  assert(reportTemplate.includes("Change Order Analysis Report"), "final-report-template.md does not look like a report template");

  return {
    clauseLibrary,
    clauseFingerprints,
    reportTemplate,
    reportTemplateSummary: summarizeReportTemplate(reportTemplate),
    chatBoostTerms: buildChatBoostTerms(clauseFingerprints.records),
    versionInfo: {
      clauseLibraryVersion: clauseLibrary.version,
      clauseLibraryUpdated: clauseLibrary.updated,
      clauseFingerprintVersion: clauseFingerprints.version,
      clauseFingerprintRecordCount: clauseFingerprints.record_count,
      reportTemplateVersion: "final-report-template.md",
    },
  };
}

export function buildAnalysisSystemPrompt(knowledge: KnowledgeBundle): string {
  const patternBlock = knowledge.clauseLibrary.patterns
    .map((pattern) => {
      const statutes = pattern.statutes && Object.keys(pattern.statutes).length
        ? ` [Statutes: ${Object.keys(pattern.statutes).join(", ")}]`
        : "";
      return `- ${pattern.category.toUpperCase()} (severity=${pattern.severity}): ${pattern.plain_english} | Commercial risk: ${pattern.what_it_means}${statutes}`;
    })
    .join("\n");

  return `You are a senior construction contract manager with deep expertise in AIA A201, DBIA 540, ConsensusDocs, and standard heavy civil contract forms.

Your task: analyze the provided contract and correspondence to determine the legal and financial impact of a proposed change.

Known high-risk clause patterns to actively look for:
${patternBlock}

Analysis guidelines:
1. Identify the relevant contract clauses governing scope, changes, notice, and payment — cite page numbers when available (e.g., "per Section 7.2, Page 14").
2. Determine whether the proposed work is within or outside the original contract scope.
3. Identify the responsible party for the cost and time impact under the contract terms.
4. Detect any notice requirements: find the specific clause that requires written notice of claims, and extract the deadline date if stated or calculable.
5. Flag adversarial or non-standard clauses from the known patterns above that shift unusual risk to the contractor.
6. If a value cannot be determined from the documents, use "Not specified" — never hallucinate figures or dates.
7. scopeStatus must be exactly "In Scope" or "Out of Scope".
8. noticeDeadline must be YYYY-MM-DD format or "Not specified".
9. Always call the submit_analysis tool — do not respond with plain text.`;
}

export function buildReportSystemPrompt(knowledge: KnowledgeBundle): string {
  return `You are a senior construction commercial/change manager writing a formal Change Order Analysis Report.

Use the following master template specification as the source of truth:
${knowledge.reportTemplate}

Additional output rules:
- Stay concise. Keep paragraphs short. Avoid repetition
- If support is weak, use grounded fallback language instead of guessing
- Separate contract language from inference
- Do not fabricate figures, dates, or clause references
- keyContractClauses: rank by commercial importance, not contract order; keep excerpts short
- draftResponse: professional, usable by a commercial manager, no aggressive legal theatrics
- Call submit_report with all 12 sections completed`;
}

export function buildDraftSystemPrompt(knowledge: KnowledgeBundle): string {
  const negotiationPatterns = knowledge.clauseLibrary.patterns
    .slice(0, 8)
    .map(
      (pattern) =>
        `- ${pattern.category.toUpperCase()} (${pattern.severity}): ${pattern.plain_english} | Pushback: ${pattern.pushback_template}`,
    )
    .join("\n");

  return `You are a senior construction commercial manager drafting a formal change order response and internal claim strategy.

Use the report template tone and structure rules as your writing standard:
${knowledge.reportTemplateSummary}

Use the following clause pattern guidance when shaping mitigation language, fallback language, and negotiation posture:
${negotiationPatterns}

Draft rules:
- Stay source-grounded and commercially realistic
- Do not fabricate facts, law, dates, or entitlement certainty
- Letter tone must be professional, firm, and usable by a commercial manager
- No aggressive legal theatrics
- No placeholder names or fake parties
- Strategy must be practical, sequence-aware, and action-oriented
- If support is weak, say so conservatively instead of guessing
- Call submit_draft with the completed letter and strategy`;
}
