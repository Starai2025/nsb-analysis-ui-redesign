import type { KnowledgeBundle } from "./knowledge.ts";
import type { ClauseRecord, ExtractedDocument, ProjectData } from "./src/types.ts";
import { buildLadotDemoClauses } from "./src/lib/ladotDemoClauses.ts";

export type FingerprintSignal = {
  id: string;
  title: string;
  severity: string;
  plainEnglish: string;
  whyItMatters: string;
  matchedPages: number[];
  matchedTerms: string[];
  retrievalTerms: string[];
  supportScore: number;
};

export type LadotClauseSignal = {
  id: string;
  title: string;
  clauseFamily: ClauseRecord["clauseFamily"];
  sectionRef: string;
  pageRef: string;
  plainEnglishMeaning: string;
  whyItMatters: string;
  matchedTerms: string[];
  retrievalTerms: string[];
  supportScore: number;
};

export type AnalysisKnowledgeSignals = {
  isLadotContext: boolean;
  queryTerms: string[];
  contractRetrievalTerms: string[];
  fingerprintSignals: FingerprintSignal[];
  ladotSignals: LadotClauseSignal[];
};

const MAX_FINGERPRINT_SIGNALS = 6;
const MAX_LADOT_SIGNALS = 5;
const MAX_RETRIEVAL_TERMS = 24;
const MAX_MATCHED_TERMS = 6;
const MAX_MATCHED_PAGES = 4;
const LADOT_FALLBACK_KEYS = new Set([
  "document-precedence",
  "higher-standard-control",
  "review-nonreliance",
  "delay-event-notice",
  "compensation-event-notice",
  "directive-letter",
]);

function compactText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = compactText(String(value ?? ""));
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function uniqueNumbers(values: Array<number | undefined | null>): number[] {
  return [...new Set(values.filter((value): value is number => Number.isFinite(value)))];
}

function buildDocPageLookup(doc: ExtractedDocument): Array<{ pageNumber: number; text: string }> {
  return (doc.pages ?? []).map((page) => ({
    pageNumber: page.pageNumber,
    text: compactText(page.text),
  }));
}

function pageMatchesForPhrases(
  pages: Array<{ pageNumber: number; text: string }>,
  phrases: string[],
): number[] {
  if (!phrases.length) return [];

  const pageNumbers: number[] = [];
  for (const page of pages) {
    if (phrases.some((phrase) => phrase && page.text.includes(phrase))) {
      pageNumbers.push(page.pageNumber);
    }
  }

  return uniqueNumbers(pageNumbers).slice(0, MAX_MATCHED_PAGES);
}

function termMatchesInText(terms: string[], text: string): string[] {
  return uniqueStrings(terms.filter((term) => term && text.includes(term))).slice(0, MAX_MATCHED_TERMS);
}

function severityBonus(severity: string): number {
  switch (severity.toUpperCase()) {
    case "CRITICAL":
      return 6;
    case "HIGH":
      return 4;
    case "MED":
    case "MEDIUM":
      return 2;
    default:
      return 1;
  }
}

function clauseKey(clause: ClauseRecord): string {
  return clause.id.split(":").pop() ?? clause.id;
}

function buildFingerprintSignals(
  knowledge: KnowledgeBundle,
  contractDoc: ExtractedDocument,
  corrDoc: ExtractedDocument,
  queryTerms: string[],
): FingerprintSignal[] {
  const contractPages = buildDocPageLookup(contractDoc);
  const contractText = compactText(
    (contractDoc.pages ?? []).map((page) => page.text).join("\n\n")
  );
  const corrText = compactText(
    (corrDoc.pages ?? []).map((page) => page.text).join("\n\n")
  );

  return knowledge.clauseFingerprints.records
    .map((record) => {
      const retrievalTerms = uniqueStrings([
        ...record.fingerprints,
        ...record.trigger_phrases,
      ]).slice(0, MAX_MATCHED_TERMS);
      const recordText = compactText([
        record.title,
        record.plain_english,
        record.why_it_matters,
        ...record.fingerprints,
        ...record.trigger_phrases,
      ].join(" "));

      const contractPhraseHits = retrievalTerms.filter((phrase) => contractText.includes(phrase));
      const corrPhraseHits = retrievalTerms.filter((phrase) => corrText.includes(phrase));
      const matchedTerms = uniqueStrings([
        ...contractPhraseHits,
        ...corrPhraseHits,
        ...termMatchesInText(queryTerms, recordText),
      ]).slice(0, MAX_MATCHED_TERMS);
      const matchedPages = pageMatchesForPhrases(contractPages, retrievalTerms);

      const supportScore =
        severityBonus(record.severity)
        + (contractPhraseHits.length * 9)
        + (corrPhraseHits.length * 7)
        + (matchedPages.length * 5)
        + (termMatchesInText(queryTerms, recordText).length * 3);

      return {
        id: record.id,
        title: record.title,
        severity: record.severity,
        plainEnglish: record.plain_english,
        whyItMatters: record.why_it_matters,
        matchedPages,
        matchedTerms,
        retrievalTerms,
        supportScore,
      };
    })
    .filter((signal) => signal.supportScore > 6)
    .sort((left, right) => right.supportScore - left.supportScore || left.title.localeCompare(right.title))
    .slice(0, MAX_FINGERPRINT_SIGNALS);
}

function isLadotContext(
  projectData: Partial<ProjectData> | undefined,
  contractDoc: ExtractedDocument,
  corrDoc: ExtractedDocument,
): boolean {
  const projectText = compactText([
    projectData?.projectProfileId,
    projectData?.demoProfile,
    projectData?.name,
    projectData?.state,
    projectData?.agency,
    projectData?.deliveryModel,
    projectData?.ownerClient,
  ].join(" "));

  if (
    projectText.includes("ladot-calcasieu")
    || projectText.includes("la dotd")
    || projectText.includes("calcasieu")
  ) {
    return true;
  }

  const documentText = compactText([
    (contractDoc.pages ?? []).slice(0, 20).map((page) => page.text).join(" "),
    (corrDoc.pages ?? []).slice(0, 20).map((page) => page.text).join(" "),
  ].join(" "));

  return documentText.includes("la dotd") || documentText.includes("calcasieu");
}

function buildLadotSignals(
  contractDoc: ExtractedDocument,
  corrDoc: ExtractedDocument,
  queryTerms: string[],
): LadotClauseSignal[] {
  const contractText = compactText(
    (contractDoc.pages ?? []).map((page) => page.text).join("\n\n")
  );
  const corrText = compactText(
    (corrDoc.pages ?? []).map((page) => page.text).join("\n\n")
  );
  const clauses = buildLadotDemoClauses("knowledge", contractDoc.id || "contract");

  return clauses
    .map((clause) => {
      const key = clauseKey(clause);
      const retrievalTerms = uniqueStrings([
        clause.title,
        ...clause.tags,
        ...clause.triggerConditions,
        ...clause.linkedIssueTypes,
        ...clause.linkedDeadlineTypes,
      ]).slice(0, MAX_MATCHED_TERMS);
      const clauseText = compactText([
        clause.title,
        clause.sectionRef,
        clause.pageRef,
        clause.plainEnglishMeaning,
        clause.whyItMatters,
        ...clause.triggerConditions,
        ...clause.tags,
        ...clause.linkedIssueTypes,
        ...clause.linkedDeadlineTypes,
      ].join(" "));

      const matchedTerms = uniqueStrings([
        ...retrievalTerms.filter((term) => contractText.includes(term) || corrText.includes(term)),
        ...termMatchesInText(queryTerms, clauseText),
      ]).slice(0, MAX_MATCHED_TERMS);

      let supportScore =
        matchedTerms.length * 3
        + termMatchesInText(queryTerms, clauseText).length * 2;

      if (LADOT_FALLBACK_KEYS.has(key)) {
        supportScore += 1;
      }

      return {
        id: clause.id,
        title: clause.title,
        clauseFamily: clause.clauseFamily,
        sectionRef: clause.sectionRef,
        pageRef: clause.pageRef,
        plainEnglishMeaning: clause.plainEnglishMeaning,
        whyItMatters: clause.whyItMatters,
        matchedTerms,
        retrievalTerms,
        supportScore,
      };
    })
    .filter((signal) => signal.supportScore > 2 || LADOT_FALLBACK_KEYS.has(signal.id.split(":").pop() ?? signal.id))
    .sort((left, right) => right.supportScore - left.supportScore || left.title.localeCompare(right.title))
    .slice(0, MAX_LADOT_SIGNALS);
}

function buildRetrievalTerms(
  queryTerms: string[],
  fingerprintSignals: FingerprintSignal[],
  ladotSignals: LadotClauseSignal[],
): string[] {
  return uniqueStrings([
    ...queryTerms,
    ...fingerprintSignals.flatMap((signal) => signal.retrievalTerms.slice(0, 3)),
    ...ladotSignals.flatMap((signal) => signal.retrievalTerms.slice(0, 2)),
  ]).slice(0, MAX_RETRIEVAL_TERMS);
}

export function buildAnalysisKnowledgeSignals(
  knowledge: KnowledgeBundle,
  contractDoc: ExtractedDocument,
  corrDoc: ExtractedDocument,
  projectData: Partial<ProjectData> | undefined,
  queryTerms: string[],
): AnalysisKnowledgeSignals {
  const fingerprintSignals = buildFingerprintSignals(knowledge, contractDoc, corrDoc, queryTerms);
  const ladotContext = isLadotContext(projectData, contractDoc, corrDoc);
  const ladotSignals = ladotContext
    ? buildLadotSignals(contractDoc, corrDoc, queryTerms)
    : [];

  return {
    isLadotContext: ladotContext,
    queryTerms,
    contractRetrievalTerms: buildRetrievalTerms(queryTerms, fingerprintSignals, ladotSignals),
    fingerprintSignals,
    ladotSignals,
  };
}

export function buildAnalysisSignalsPrompt(signals: AnalysisKnowledgeSignals): string {
  if (!signals.fingerprintSignals.length && !signals.ladotSignals.length) {
    return "";
  }

  const sections: string[] = [
    "Use the following retrieval cues as search guidance only.",
    "Do not treat any cue as proof unless the uploaded documents support it.",
  ];

  if (signals.fingerprintSignals.length) {
    sections.push(
      "Relevant construction/design-build clause families to inspect:",
      ...signals.fingerprintSignals.map((signal) => {
        const pageRef = signal.matchedPages.length
          ? ` Pages ${signal.matchedPages.join(", ")}.`
          : "";
        const matched = signal.matchedTerms.length
          ? ` Matched cues: ${signal.matchedTerms.join(", ")}.`
          : "";
        return `- [${signal.severity}] ${signal.title}: ${signal.plainEnglish}.${pageRef}${matched}`;
      }),
    );
  }

  if (signals.ladotSignals.length) {
    sections.push(
      "Potential LA DOTD / Calcasieu clauses to inspect if the uploaded documents align:",
      ...signals.ladotSignals.map((signal) => {
        const matched = signal.matchedTerms.length
          ? ` Matched cues: ${signal.matchedTerms.join(", ")}.`
          : "";
        return `- ${signal.sectionRef} (${signal.pageRef}) ${signal.title}: ${signal.plainEnglishMeaning}.${matched}`;
      }),
    );
  }

  return sections.join("\n");
}
