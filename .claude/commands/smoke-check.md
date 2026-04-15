# /smoke-check — Quick Smoke Test

Run a fast smoke test of the core app flow. Use this after any change before committing.

## Instructions

Run these checks in order. Stop and report the first failure.

### 1. Build Check
```bash
npm run lint
npm run build
```
Both must succeed with no errors.

### 2. Dev Server Start
```bash
npm run dev
```
Server must start without errors. Check for port conflicts or missing env vars.

### 3. Route Load Check
Verify each route loads without a white screen or console error:
- `/intake` — Intake page renders with upload zones visible
- `/summary` — Summary page renders (may show "no analysis" state — that's OK)
- `/report` — Report page renders
- `/sources` — Sources page renders
- `/draft` — Draft response page renders

### 4. Upload Zone Check (IntakePage)
- File input refs are attached (clicking "Upload Contract" opens file picker)
- File type validation works (reject `.txt`, accept `.pdf` and `.docx`)
- Analyze button is disabled when files are missing
- Analyze button enables when both files are uploaded

### 5. API Key Status Indicator
On IntakePage, the API key status badge should show:
- ✅ Green "Claude API: Connected" if `VITE_ANTHROPIC_API_KEY` is set
- ⚠️ Amber "Claude API: Key Missing" if not set

### 6. Navigation Check
- Sidebar links navigate correctly to all routes
- No broken links, 404s, or "Page under construction" fallbacks

## Output Format

```
## Smoke Check — [DATE]

1. Build: ✅ PASS
2. Dev server: ✅ PASS  
3. Route load:
   - /intake: ✅
   - /summary: ✅
   - /report: ✅
   - /sources: ✅
   - /draft: ✅
4. Upload zones: ✅ PASS
5. API key indicator: ✅ PASS
6. Navigation: ✅ PASS

### RESULT: ✅ ALL CLEAR
```
