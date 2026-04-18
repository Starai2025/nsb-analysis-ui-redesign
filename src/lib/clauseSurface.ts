import type {
  AnalysisResult,
  ClauseEntry,
  ClauseFamily,
  ClauseLinkedDeadlineType,
  ClauseLinkedIssueType,
  ClauseLinkedOutputType,
  ClauseRecord,
  IssueTaxonomy,
} from '../types';

export type SummaryIssue = {
  id: string;
  title: string;
  description: string;
  issueType: IssueTaxonomy;
};

export const CLAUSE_FAMILY_LABELS: Record<ClauseFamily, string> = {
  hierarchy: 'Hierarchy',
  submittal_review: 'Submittal Review',
  anti_reliance: 'Anti-Reliance',
  delay_events: 'Delay Events',
  compensation_events: 'Compensation Events',
  ladot_changes: 'LA DOTD Changes',
  directive: 'Directive',
  pricing_support: 'Pricing Support',
};

export const CLAUSE_ISSUE_LABELS: Record<ClauseLinkedIssueType, string> = {
  'design-correction': 'Design Correction',
  'incomplete-submittal': 'Incomplete Submittal',
  'conflict-in-criteria': 'Conflict in Criteria',
  'stricter-standard-enforcement': 'Stricter Standard',
  'owner-driven-change': 'Owner-Driven Change',
  'agency-interpretation-shift': 'Interpretation Shift',
  'delay-risk': 'Delay Risk',
  'compensation-risk': 'Compensation Risk',
  'directive-candidate': 'Directive Candidate',
  'mixed-issue': 'Mixed Issue',
  'unclear': 'Unclear',
};

export const CLAUSE_DEADLINE_LABELS: Record<ClauseLinkedDeadlineType, string> = {
  submittal_review_followup: 'Submittal Review Follow-up',
  delay_event_notice_review: 'Delay Notice Review',
  delay_claim_due: 'Delay Claim Due',
  compensation_notice_review: 'Compensation Notice Review',
  compensation_claim_due: 'Compensation Claim Due',
  directive_followup: 'Directive Follow-up',
  dispute_escalation_review: 'Dispute Escalation Review',
  pricing_support_request_due: 'Pricing Support Request Due',
};

export const CLAUSE_OUTPUT_LABELS: Record<ClauseLinkedOutputType, string> = {
  summary_support: 'Summary',
  sources_library: 'Sources',
  report_body: 'Report Body',
  report_appendix: 'Report Appendix',
  draft_context: 'Draft',
};

const ISSUE_KEYWORDS: Array<{ issueType: IssueTaxonomy; keywords: string[] }> = [
  { issueType: 'design-correction', keywords: ['design', 'redesign', 'correct', 'revision'] },
  { issueType: 'incomplete-submittal', keywords: ['incomplete', 'missing', 'resubmit', 'submittal'] },
  { issueType: 'conflict-in-criteria', keywords: ['conflict', 'criteria', 'standard', 'specification'] },
  { issueType: 'stricter-standard-enforcement', keywords: ['higher standard', 'stricter', 'more stringent'] },
  { issueType: 'owner-driven-change', keywords: ['change', 'owner', 'ladot', 'scope shift'] },
  { issueType: 'agency-interpretation-shift', keywords: ['interpretation', 'comment', 'reviewer', 'position'] },
  { issueType: 'delay-risk', keywords: ['delay', 'schedule', 'critical path', 'time'] },
  { issueType: 'compensation-risk', keywords: ['cost', 'pricing', 'money', 'compensation', 'damages'] },
  { issueType: 'directive-candidate', keywords: ['directive', 'proceed', 'direction', 'instruction'] },
];

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2);
}

export function inferIssueTaxonomyFromText(text: string): IssueTaxonomy {
  const haystack = text.toLowerCase();
  let bestMatch: IssueTaxonomy = 'unclear';
  let bestScore = 0;

  for (const candidate of ISSUE_KEYWORDS) {
    const score = candidate.keywords.reduce((total, keyword) => total + (haystack.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate.issueType;
    }
  }

  return bestScore > 0 ? bestMatch : 'unclear';
}

export function deriveSummaryIssues(analysis: AnalysisResult | null): SummaryIssue[] {
  const risks = analysis?.keyRisks ?? [];
  if (risks.length === 0) {
    return [{
      id: 'overall',
      title: 'Overall Position',
      description: analysis?.executiveConclusion || 'Overall project posture',
      issueType: inferIssueTaxonomyFromText(`${analysis?.executiveConclusion ?? ''} ${analysis?.strategicRecommendation ?? ''}`),
    }];
  }

  return risks.map((risk, index) => ({
    id: `issue-${index}`,
    title: risk.title,
    description: risk.description,
    issueType: inferIssueTaxonomyFromText(`${risk.title} ${risk.description}`),
  }));
}

export function getClauseShortSourceRef(clause: ClauseRecord): string {
  return `${clause.sectionRef} · ${clause.pageRef}`;
}

function getConfidenceWeight(confidence: ClauseRecord['confidence']): number {
  if (confidence === 'High') return 3;
  if (confidence === 'Medium') return 2;
  return 1;
}

export function rankClausesForIssue(
  clauses: ClauseRecord[],
  issue: SummaryIssue | null,
  limit = 3,
): ClauseRecord[] {
  const issueText = `${issue?.title ?? ''} ${issue?.description ?? ''}`.toLowerCase();
  const tokens = new Set(tokenize(issueText));

  return [...clauses]
    .sort((left, right) => {
      const leftHaystack = `${left.title} ${left.excerpt} ${left.whyItMatters} ${left.tags.join(' ')}`.toLowerCase();
      const rightHaystack = `${right.title} ${right.excerpt} ${right.whyItMatters} ${right.tags.join(' ')}`.toLowerCase();

      const score = (clause: ClauseRecord, haystack: string) => {
        let total = getConfidenceWeight(clause.confidence);
        if (issue && clause.linkedIssueTypes.includes(issue.issueType)) total += 8;
        for (const token of tokens) {
          if (haystack.includes(token)) total += 1;
        }
        if (clause.linkedOutputTypes.includes('summary_support')) total += 2;
        return total;
      };

      return score(right, rightHaystack) - score(left, leftHaystack);
    })
    .slice(0, limit);
}

export function buildReportClauseEntries(
  clauses: ClauseRecord[],
  analysis: AnalysisResult | null,
  limit = 3,
): ClauseEntry[] {
  const primaryIssue = deriveSummaryIssues(analysis)[0] ?? null;
  return rankClausesForIssue(clauses, primaryIssue, limit).map((clause) => ({
    reference: getClauseShortSourceRef(clause),
    excerpt: clause.excerpt,
    meaning: clause.plainEnglishMeaning,
    whyItMatters: clause.whyItMatters,
  }));
}

export function buildRelevantDraftClauses(
  clauses: ClauseRecord[],
  analysis: AnalysisResult | null,
  limit = 4,
): ClauseRecord[] {
  const issues = deriveSummaryIssues(analysis);
  const seen = new Set<string>();
  const ranked: ClauseRecord[] = [];

  for (const issue of issues) {
    for (const clause of rankClausesForIssue(clauses, issue, limit)) {
      if (seen.has(clause.id) || !clause.linkedOutputTypes.includes('draft_context')) continue;
      seen.add(clause.id);
      ranked.push(clause);
      if (ranked.length >= limit) return ranked;
    }
  }

  return ranked;
}

export function matchesClauseSearch(clause: ClauseRecord, query: string): boolean {
  if (!query.trim()) return true;
  const haystack = [
    clause.title,
    clause.sectionRef,
    clause.pageRef,
    clause.clauseFamily,
    clause.clauseSubtype,
    clause.tags.join(' '),
  ].join(' ').toLowerCase();

  return haystack.includes(query.trim().toLowerCase());
}

export function groupClausesByFamily(clauses: ClauseRecord[]): Array<[ClauseFamily, ClauseRecord[]]> {
  const grouped = new Map<ClauseFamily, ClauseRecord[]>();
  for (const clause of clauses) {
    const current = grouped.get(clause.clauseFamily) ?? [];
    current.push(clause);
    grouped.set(clause.clauseFamily, current);
  }

  return Array.from(grouped.entries()).sort(([left], [right]) => CLAUSE_FAMILY_LABELS[left].localeCompare(CLAUSE_FAMILY_LABELS[right]));
}
