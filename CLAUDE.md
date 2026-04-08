# Never Sign Blind — Claude Working Instructions

## What This App Does
Never Sign Blind (NSB) is an AI-powered construction contract analysis tool. Users upload a contract (PDF/DOCX) and correspondence (PDF/DOCX), and the app uses Gemini AI to produce a structured risk and financial analysis — including scope status, claimable amounts, notice deadlines, key risks, and a strategic recommendation. The output flows through: Intake → Decision Summary → Report → Sources → Draft Response.

## Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **AI**: Google Gemini via `@google/genai` (client-side)
- **Routing**: React Router v7
- **Document parsing**: pdfjs-dist (PDF), mammoth (DOCX)
- **PDF export**: jsPDF + html2canvas
- **Server**: Express (minimal — static host + in-memory store only)
- **Animation**: motion (Framer Motion v12)

## Project Structure
```
src/
  pages/          ← One file per route (IntakePage, DecisionSummaryPage, etc.)
  components/     ← Shared UI (Sidebar, TopBar, AskTheContract)
  lib/            ← Utilities (utils.ts with cn())
  types.ts        ← All shared TypeScript interfaces
server.ts         ← Express server (dev only)
vite.config.ts    ← Vite config with proxy to Express
```

## Critical Rules for Claude

### 1. Never Break the Analysis Flow
The core loop is: `IntakePage → /api/save-analysis → DecisionSummaryPage → /api/store → ReportPage`. Do not refactor the API surface of these endpoints without updating all consumers simultaneously.

### 2. API Key Safety
The Gemini API key MUST stay server-side or be properly injected via Vite env (`VITE_` prefix). Never hardcode it. Never log it. The correct env var is `VITE_GEMINI_API_KEY` in `.env.local`.

### 3. Correct Gemini Model Names
Use only these model names:
- Flash: `gemini-2.0-flash`
- Pro fallback: `gemini-1.5-pro`
Do NOT invent model names. Verify against `@google/genai` docs before using any new model string.

### 4. Type Safety
All AI response shapes must match the `AnalysisResult` interface in `src/types.ts`. Do not use `any` for analysis data in new code.

### 5. Navigation
Use `useNavigate()` from `react-router-dom` for all programmatic navigation. Never use `window.location.href`.

### 6. State Persistence
Analysis state currently lives in the Express in-memory store. Phase 2 will migrate this to `localStorage`. Until then, do not rely on state surviving a server restart.

### 7. Phase Discipline
All work is organized into phases (see `docs/rebuild/roadmap.md`). Before starting work on any phase:
1. Run `/repo-audit` to verify current state
2. Check the phase doc in `docs/rebuild/`
3. Complete all checklist items in `.claude/skills/phase-gate/checklist.md`
4. Run `/smoke-check` before marking a phase complete

### 8. Formatting
- Tailwind only — no inline styles, no CSS modules
- Use the existing design tokens (`bg-surface`, `text-on-surface`, `text-primary`, etc.)
- All new pages follow the `max-w-[1400px] mx-auto p-8` container pattern

## Custom Commands (Claude Code)
| Command | Purpose |
|---|---|
| `/repo-audit` | Full audit of current repo state vs. roadmap |
| `/phase-plan` | Plan work items for a specific phase |
| `/phase-gate` | Run gate checks before closing a phase |
| `/smoke-check` | Quick functional smoke test |
| `/regression-check` | Full regression test suite |
| `/ship-check` | Pre-deployment checklist |

## Known Issues (as of last audit)
- Gemini model names are wrong in IntakePage — use `gemini-2.0-flash` / `gemini-1.5-pro`
- SourcesPage citations are hardcoded demo data, not wired to analysis
- DraftResponsePage is static placeholder content
- Project detail fields (name, contract #, CR #) are uncontrolled inputs — not saved
- `window.location.href` used in IntakePage instead of `useNavigate()`
- In-memory server store will be replaced in Phase 2

## Contacts
- Repo owner: Starai2025
- App branding: Never Sign Blind
