import fs from "node:fs/promises";
import path from "node:path";
import type { AnalysisResult, Citation, ProjectData } from "../src/types.ts";

type EvalExpectation = {
  scopeStatus?: string;
  primaryResponsibilityIncludes?: string[];
  secondaryResponsibilityIncludes?: string[];
  extraMoneyLikely?: boolean;
  extraTimeLikely?: boolean;
  noticeDeadline?: string;
  strategicRecommendationIncludes?: string[];
  keyRiskTitlesInclude?: string[];
  citationsMin?: number;
};

type EvalCase = {
  id: string;
  label?: string;
  contractPath: string;
  correspondencePath: string;
  projectData?: Partial<ProjectData>;
  expected: EvalExpectation;
};

type FieldScore = {
  field: string;
  earned: number;
  available: number;
  detail: string;
};

type EvalCaseResult = {
  id: string;
  label: string;
  score: number;
  earned: number;
  available: number;
  fieldScores: FieldScore[];
  analysis: AnalysisResult;
  citations: Citation[];
};

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_THRESHOLD = 85;
const DEFAULT_OUTPUT = path.resolve("output", "evals", "analysis-eval-latest.json");
const FIELD_WEIGHTS = {
  scopeStatus: 20,
  primaryResponsibilityIncludes: 15,
  secondaryResponsibilityIncludes: 5,
  extraMoneyLikely: 10,
  extraTimeLikely: 10,
  noticeDeadline: 15,
  strategicRecommendationIncludes: 10,
  keyRiskTitlesInclude: 10,
  citationsMin: 5,
} as const;

function readArg(flag: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.findIndex((arg) => arg === flag);
  if (index === -1 || index === args.length - 1) return undefined;
  return args[index + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag);
}

function compactText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(haystack: string, needles: string[]): boolean {
  const normalizedHaystack = compactText(haystack);
  return needles.some((needle) => normalizedHaystack.includes(compactText(needle)));
}

function normalizeArray(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => String(value).trim()).filter(Boolean);
}

function scoreTextInclusion(
  field: string,
  haystack: string,
  needles: string[] | undefined,
  weight: number,
): FieldScore | null {
  const normalizedNeedles = normalizeArray(needles);
  if (!normalizedNeedles.length) return null;

  const matched = normalizedNeedles.filter((needle) => compactText(haystack).includes(compactText(needle)));
  const earned = Math.round((matched.length / normalizedNeedles.length) * weight);

  return {
    field,
    earned,
    available: weight,
    detail: matched.length === normalizedNeedles.length
      ? `Matched all expected phrases: ${matched.join(", ")}`
      : `Matched ${matched.length}/${normalizedNeedles.length} expected phrases`,
  };
}

function scoreExact<T>(
  field: string,
  actual: T,
  expected: T | undefined,
  weight: number,
): FieldScore | null {
  if (expected === undefined) return null;
  const pass = actual === expected;
  return {
    field,
    earned: pass ? weight : 0,
    available: weight,
    detail: pass ? `Matched expected value "${String(expected)}"` : `Expected "${String(expected)}", got "${String(actual)}"`,
  };
}

function scoreRiskTitles(
  analysis: AnalysisResult,
  expectedTitles: string[] | undefined,
): FieldScore | null {
  const normalizedTitles = normalizeArray(expectedTitles);
  if (!normalizedTitles.length) return null;

  const actualTitles = analysis.keyRisks.map((risk) => risk.title).join(" | ");
  return scoreTextInclusion(
    "keyRiskTitlesInclude",
    actualTitles,
    normalizedTitles,
    FIELD_WEIGHTS.keyRiskTitlesInclude,
  );
}

function scoreCitations(
  citations: Citation[],
  citationsMin: number | undefined,
): FieldScore | null {
  if (citationsMin === undefined) return null;
  return {
    field: "citationsMin",
    earned: citations.length >= citationsMin ? FIELD_WEIGHTS.citationsMin : 0,
    available: FIELD_WEIGHTS.citationsMin,
    detail: `Expected at least ${citationsMin} citations, got ${citations.length}`,
  };
}

function scoreAnalysisCase(analysis: AnalysisResult, citations: Citation[], expected: EvalExpectation): FieldScore[] {
  const scores: Array<FieldScore | null> = [
    scoreExact("scopeStatus", analysis.scopeStatus, expected.scopeStatus, FIELD_WEIGHTS.scopeStatus),
    scoreTextInclusion(
      "primaryResponsibilityIncludes",
      analysis.primaryResponsibility,
      expected.primaryResponsibilityIncludes,
      FIELD_WEIGHTS.primaryResponsibilityIncludes,
    ),
    scoreTextInclusion(
      "secondaryResponsibilityIncludes",
      analysis.secondaryResponsibility,
      expected.secondaryResponsibilityIncludes,
      FIELD_WEIGHTS.secondaryResponsibilityIncludes,
    ),
    scoreExact("extraMoneyLikely", analysis.extraMoneyLikely, expected.extraMoneyLikely, FIELD_WEIGHTS.extraMoneyLikely),
    scoreExact("extraTimeLikely", analysis.extraTimeLikely, expected.extraTimeLikely, FIELD_WEIGHTS.extraTimeLikely),
    scoreExact("noticeDeadline", analysis.noticeDeadline, expected.noticeDeadline, FIELD_WEIGHTS.noticeDeadline),
    scoreTextInclusion(
      "strategicRecommendationIncludes",
      analysis.strategicRecommendation,
      expected.strategicRecommendationIncludes,
      FIELD_WEIGHTS.strategicRecommendationIncludes,
    ),
    scoreRiskTitles(analysis, expected.keyRiskTitlesInclude),
    scoreCitations(citations, expected.citationsMin),
  ];

  return scores.filter((score): score is FieldScore => Boolean(score));
}

async function fileToBlob(filePath: string): Promise<{ blob: Blob; fileName: string; mimeType: string }> {
  const resolved = path.resolve(filePath);
  const buffer = await fs.readFile(resolved);
  const extension = path.extname(resolved).toLowerCase();
  const mimeType =
    extension === ".pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  return {
    blob: new Blob([buffer], { type: mimeType }),
    fileName: path.basename(resolved),
    mimeType,
  };
}

async function runCase(baseUrl: string, evalCase: EvalCase): Promise<EvalCaseResult> {
  const contract = await fileToBlob(evalCase.contractPath);
  const correspondence = await fileToBlob(evalCase.correspondencePath);
  const formData = new FormData();

  formData.append("contract", contract.blob, contract.fileName);
  formData.append("correspondence", correspondence.blob, correspondence.fileName);
  formData.append("projectName", evalCase.projectData?.name ?? evalCase.label ?? evalCase.id);
  formData.append("contractNumber", evalCase.projectData?.contractNumber ?? "EVAL-CONTRACT");
  formData.append("changeRequestId", evalCase.projectData?.changeRequestId ?? "EVAL-CHANGE");

  const optionalFields: Array<[keyof ProjectData, string | boolean | undefined]> = [
    ["state", evalCase.projectData?.state],
    ["agency", evalCase.projectData?.agency],
    ["deliveryModel", evalCase.projectData?.deliveryModel],
    ["ownerClient", evalCase.projectData?.ownerClient],
    ["userRole", evalCase.projectData?.userRole],
    ["concessionaire", evalCase.projectData?.concessionaire],
    ["builder", evalCase.projectData?.builder],
    ["leadDesigner", evalCase.projectData?.leadDesigner],
    ["demoProfile", evalCase.projectData?.demoProfile],
    ["issueMode", evalCase.projectData?.issueMode],
    ["scenarioSummary", evalCase.projectData?.scenarioSummary],
    ["projectProfileId", evalCase.projectData?.projectProfileId],
    ["primaryRoleId", evalCase.projectData?.primaryRoleId],
    ["workAlreadyProceeding", evalCase.projectData?.workAlreadyProceeding],
    ["noticeAlreadySent", evalCase.projectData?.noticeAlreadySent],
    ["scheduleImpactKnown", evalCase.projectData?.scheduleImpactKnown],
    ["pricingImpactKnown", evalCase.projectData?.pricingImpactKnown],
  ];

  for (const [key, value] of optionalFields) {
    if (value === undefined || value === null || value === "") continue;
    formData.append(String(key), String(value));
  }

  const response = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || `Analysis request failed with ${response.status}`);
  }

  const analysis = payload.analysis as AnalysisResult;
  const citations = (payload.citations ?? []) as Citation[];
  const fieldScores = scoreAnalysisCase(analysis, citations, evalCase.expected);
  const earned = fieldScores.reduce((total, score) => total + score.earned, 0);
  const available = fieldScores.reduce((total, score) => total + score.available, 0);
  const score = available > 0 ? Number(((earned / available) * 100).toFixed(2)) : 0;

  return {
    id: evalCase.id,
    label: evalCase.label ?? evalCase.id,
    score,
    earned,
    available,
    fieldScores,
    analysis,
    citations,
  };
}

async function main() {
  const casesPath = readArg("--cases");
  const baseUrl = readArg("--base-url") ?? DEFAULT_BASE_URL;
  const threshold = Number(readArg("--threshold") ?? DEFAULT_THRESHOLD);
  const outputPath = readArg("--output") ?? DEFAULT_OUTPUT;

  if (hasFlag("--help")) {
    console.log("Usage: npm run eval:analysis -- --cases data/evals/design-build-analysis.template.json [--base-url http://127.0.0.1:3000] [--threshold 85] [--output output/evals/latest.json]");
    process.exit(0);
  }

  if (!casesPath) {
    console.log("Usage: npm run eval:analysis -- --cases data/evals/design-build-analysis.template.json [--base-url http://127.0.0.1:3000] [--threshold 85] [--output output/evals/latest.json]");
    process.exit(1);
  }

  const raw = await fs.readFile(path.resolve(casesPath), "utf8");
  const evalCases = JSON.parse(raw) as EvalCase[];
  if (!Array.isArray(evalCases) || evalCases.length === 0) {
    throw new Error("Evaluation cases file must contain a non-empty array.");
  }

  const startedAt = new Date().toISOString();
  const results: EvalCaseResult[] = [];

  for (const evalCase of evalCases) {
    const result = await runCase(baseUrl, evalCase);
    results.push(result);
    console.log(`${result.id}: ${result.score}% (${result.earned}/${result.available})`);
    for (const fieldScore of result.fieldScores) {
      console.log(`  - ${fieldScore.field}: ${fieldScore.earned}/${fieldScore.available} — ${fieldScore.detail}`);
    }
  }

  const averageScore = results.reduce((total, result) => total + result.score, 0) / results.length;
  const summary = {
    startedAt,
    completedAt: new Date().toISOString(),
    baseUrl,
    threshold,
    averageScore: Number(averageScore.toFixed(2)),
    results,
  };

  await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await fs.writeFile(path.resolve(outputPath), JSON.stringify(summary, null, 2));

  console.log(`Average score: ${summary.averageScore}%`);
  console.log(`Saved report to ${path.resolve(outputPath)}`);

  if (summary.averageScore < threshold) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
