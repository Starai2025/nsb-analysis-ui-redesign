# Never Sign Blind Final Report Template Spec

## Purpose

This is the locked master template for the in-app **Change Order Analysis Report**.

It is designed for a design engineering or construction change-management workflow.
It must read like a professional internal commercial memorandum, not a dashboard and not a legal brief.

The report should be:

- concise
- source-grounded
- commercially useful
- easy to scan
- formal but readable
- free of fluff
- structured for real project use

---

## Report Title

**Change Order Analysis Report**

### Subtitle format

`[Project Name] | [Contract Number] | [Potential Change Request ID]`

If a field is missing, omit it instead of showing placeholders.

---

## Report Metadata Block

Place directly under the title.

### Fields

- Project Name
- Contract Number
- Potential Change Request ID
- Owner / Client
- Date of Analysis
- Report Status

### Report Status values

- Draft
- Ready
- Updated
- Superseded

---

## Section Order

The report must always render sections in this order:

1. Executive Summary
2. Owner / Client Request
3. Arcadis Position
4. Key Contract Clauses 
5. Application
6. Commercial Analysis
7. Schedule Impact
8. Notice / Procedural Requirements
9. Risk & Mitigation
10. Recommendation
11. Draft Response
12. Source Snapshot

If the app does not have enough support for a section, the section should still appear, but with a short grounded fallback statement.

---

## 1. Executive Summary

### Purpose

Give leadership a fast understanding of the issue.

### Length

1 to 2 short paragraphs.

### Must include

- what the requested change is
- whether it appears in scope, out of scope, partially out of scope, or unclear and the percentage 
- whether additional fee and/or time appear supportable
- the most important commercial takeaway

### Do not include

- long clause quotes
- repetitive detail
- generic filler

### Fallback text

`Based on the currently available contract and correspondence record, the requested change requires further review before a final commercial position can be confirmed.`

---

## 2. Owner / Client Request

### Purpose

State what the owner or client is asking Arcadis to do.

### Format

Short narrative paragraph.

### Must include

- what was requested and the question asked
- what changed from the baseline understanding
- whether the request appears to expand, revise, accelerate, defer, resequence, or clarify the work and how

### Good output style

`The owner has requested that Arcadis expand the clearing limits to include an additional 5 acres beyond the originally defined work area. Based on the correspondence reviewed, this request increases the physical work area and may require additional field effort, coordination, and schedule adjustment.`

---

## 3. Arcadis Position

### Purpose

State Arcadis' current commercial position clearly.

### Format

Use a compact decision block followed by one short explanatory paragraph.

### Required fields

- Scope Status
- Responsibility
- Fee Position
- Time Position

### Allowed Scope Status values

- In Scope
- Out of Scope
- Partially Out of Scope
- Unclear

### Allowed Fee Position values

- Likely Yes
- Possible
- Unclear
- Likely No

### Allowed Time Position values

- Likely Yes
- Possible
- Unclear
- Likely No

### Example format

- Scope Status: Out of Scope 
- Responsibility: Owner
- Fee Position: Likely Yes
- Time Position: Likely Yes

Then one short paragraph explaining why.

---

## 4. Key Contract Clauses

### Purpose

Show the clauses that matter most.

### Format

List all clauses related to the real issue. Search contract deeply. Dont just search by key words.

### Each clause entry must include

- Document / Section / Page
- Clause Text or Excerpt
- Meaning
- Why it matters and how it effects time and money

### Rules

- Keep excerpts short
- Prefer exact clause language when supported
- Do not include irrelevant clauses just to fill space
- Rank by commercial importance, not by order in the contract

### Entry format

**Document / Section / Page:** [value]

> [clause excerpt]

**Meaning:** [plain-English explanation]

**Why it matters:** [commercial relevance]

---

## 5. Application

### Purpose

Apply the contract language to the actual change request.

### Format

1 to 3 short paragraphs.

### Must do

- connect the request to the controlling clauses
- explain why the issue appears in scope, out of scope, partial, or unclear
- separate contract language from inference

### Good output style

`The contract ties clearing obligations to the original issued limits. The owner's current request appears to expand those limits. Because the change affects the defined work boundary rather than merely clarifying performance of the original work, the issue appears to be changed work rather than included work.`

---

## 6. Commercial Analysis

### Purpose

Explain money and time entitlement clearly.&#x20;

### Format

Use two subparts:

- Fee
- Time

### Fee must address

- whether additional compensation appears supportable and why
- what cost categories are likely implicated
- whether pricing support is complete or still TBD

### Time must address

- whether additional time appears supportable
- whether resequencing or delay is likely
- whether schedule support is complete or still TBD

### Good output style

**Fee:** Likely Yes. The requested change appears to increase labor, equipment, coordination, and field effort beyond the original baseline. Final pricing support is still TBD.

**Time:** Likely Yes. The requested change may affect the planned sequence and duration of the impacted work. Final schedule quantification is still TBD.

---

## 7. Schedule Impact

### Purpose

Address schedule consequences in a disciplined way.

### Required fields

- Critical Path Impact
- Delay Risk Level

### Allowed Critical Path Impact values

- Yes
- Likely
- Possible
- No
- Not Enough Information

### Allowed Delay Risk Level values

- Low
- Moderate
- High
- Critical

### Format

Decision block plus one explanatory paragraph.

### Must include

- whether the impacted activity appears critical or near-critical
- whether float may be consumed
- whether more schedule evidence is needed

### Good output style

- Critical Path Impact: Possible
- Delay Risk Level: High

`The current record suggests that the requested change may affect a gating activity for downstream work. A fuller schedule review is still needed to confirm whether the impact falls directly on the critical path.`

---

## 8. Notice / Procedural Requirements

### Purpose

State any contract-based notice or procedural risk.

### Required fields

- Notice Required
- Deadline
- Recipient
- Risk if Missed

### Allowed Notice Required values

- Yes
- Likely
- Unclear
- No

### Rules

- do not invent a deadline
- if unsupported, say TBD or Not specified
- tie the requirement to a contract clause when possible

### Good output style

- Notice Required: Likely
- Deadline: TBD based on contract notice period
- Recipient: Owner Representative / Project Manager
- Risk if Missed: Arcadis may weaken its entitlement position

---

## 9. Risk & Mitigation

### Purpose

Turn analysis into action.

### Format

Short narrative plus 3 to 6 practical mitigation bullets.

### Must include

- biggest commercial risk
- biggest schedule risk
- what Arcadis should do now to reduce exposure

### Good mitigation bullet themes

- isolate changed work
- proceed only on undisputed work
- request limited written direction
- preserve rights in writing
- track labor/equipment separately
- resequence unaffected work where possible

### Rule

Keep this practical, not theoretical.

---

## 10. Recommendation

### Purpose

Give one clear next-step recommendation if the client accepts the proposed change. Give three recommendations for if the client says no to time and money.

### Format

One short paragraph.

### Must answer

What should Arcadis do next?

### Good output style

`Arcadis should issue written notice, preserve its right to seek fee and time adjustment, and request formal written direction or change order treatment before the expanded work proceeds.`

---

## 11. Draft Response

### Purpose

Provide ready-to-edit response language.

### Format

2 to 4 short paragraphs.

### Must include

- acknowledgement of the request
- reference to contract review
- current Arcadis position
- reservation of rights where appropriate
- request for direction / change order / clarification as appropriate

### Rules

- professional tone
- no aggressive legal theatrics
- usable by a commercial manager
- no fake statutory language unless supported by uploaded materials

---

## 12. Source Snapshot

### Purpose

Show the most important supporting sources used for the report.

### Format

2 to 4 short source entries.

### Each entry must include

- document name
- section / page
- short excerpt or paraphrased support line
- why it mattered

### Rules

- this is not the full evidence appendix
- only include the most load-bearing sources

---

## Fallback Rules

If support is weak, the report must say so clearly.

### Approved fallback language

- `The current record does not provide enough support to confirm this conclusion.`
- `Further contract review is required before a final position can be confirmed.`
- `Pricing support is still TBD.`
- `Schedule support is still TBD.`
- `No specific deadline was identified in the current record.`

Do not fabricate missing facts.

---

## Writing Rules

### Must do

- write like a senior commercial/change manager
- stay concise
- use plain English
- keep paragraphs short
- avoid repetition
- connect analysis to action

### Must not do

- no fluff
- no legal grandstanding
- no generic filler
- no unnecessary bullets except in mitigation or metadata blocks
- no fake certainty
- no dashboard language inside the memo

---

## UI Rendering Rules

### The report page should visually feel like

- a memo
- a professional internal commercial document
- clean and high-trust

### The report page should not feel like

- a dashboard
- a legal research portal
- a generic AI summary card stack

### Rendering notes

- section headings should be strong and consistent
- metadata should be compact
- clause excerpts should be visually distinct
- long content should remain readable in PDF export

---

## Minimum Data Needed to Generate a Report

At minimum, the app should have:

- project metadata
- analysis result
- owner/client request summary
- at least some contract support

If citations are not yet fully live, the app may still generate the report, but the Source Snapshot should remain conservative and clearly limited.

---

## Future Extensions

These are allowed later, but are not required in the locked v1 template:

- evidence strength labels
- assumptions register
- disputed vs undisputed work splitter
- updated position comparison for threaded claims
- internal vs external memo mode

---

## Final Rule

This template is the source of truth for the report structure.
The app should not improvise new major sections unless we intentionally revise this spec.

