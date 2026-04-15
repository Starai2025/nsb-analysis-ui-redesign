# /regression-check — Full Regression Test

Run the full regression suite. Use this before merging any significant change or closing a phase.

## Instructions

Work through each section. Document results for every check. A single ❌ failure blocks the merge.

---

### Section 1: Build & Type Safety
- [ ] `npm run lint` — zero TypeScript errors
- [ ] `npm run build` — production build completes without warnings
- [ ] No `any` types introduced in files touched by this change
- [ ] All new interfaces added to `src/types.ts`

---

### Section 2: Intake Flow
- [ ] IntakePage loads at `/intake`
- [ ] Contract file upload zone accepts `.pdf` files
- [ ] Contract file upload zone accepts `.docx` files
- [ ] Contract file upload zone rejects `.txt`, `.xlsx`, `.png`
- [ ] Correspondence upload works identically
- [ ] Uploaded filenames display correctly in the upload zones
- [ ] "Replace file" link works for re-upload
- [ ] Analyze button disabled until both files uploaded
- [ ] Analyze button enabled after both uploaded
- [ ] Workflow Progress sidebar panel updates as files are added
- [ ] Analysis timer starts when analyze is clicked
- [ ] Status messages update during analysis
- [ ] Error state displays clearly if analysis fails
- [ ] On success, navigates to `/summary` (not via window.location.href)

---

### Section 3: Decision Summary Flow
- [ ] `/summary` loads
- [ ] Shows loading spinner while fetching from `/api/store`
- [ ] Shows "no analysis" empty state if store is empty (not a crash)
- [ ] All 6 metric cards render with analysis data
- [ ] Executive Conclusion text displays
- [ ] Claimable Amount field is editable
- [ ] Extra Days field is editable
- [ ] Secondary Responsibility field is editable
- [ ] "Save & Generate Full Report" button navigates to `/report`
- [ ] Edits to claimable amount persist to the report
- [ ] Key Risks list renders correctly (>0 items)
- [ ] Strategic Recommendation displays

---

### Section 4: Report Flow
- [ ] `/report` loads
- [ ] Analysis data populates the report (not "Loading...")
- [ ] Executive Summary section renders
- [ ] Financial & Schedule Impact section renders with correct values
- [ ] Risk Assessment section renders
- [ ] "Export PDF" button triggers download
- [ ] PDF file has correct filename format
- [ ] PDF content is not blank

---

### Section 5: Sources Page
- [ ] `/sources` loads without crash
- [ ] Document outline sidebar renders
- [ ] Citations panel renders (hardcoded data is OK for now)
- [ ] "Ask the Contract" input is present

---

### Section 6: Draft Response Page
- [ ] `/draft` loads without crash
- [ ] "Draft Response" tab renders
- [ ] "Claim Strategy & Mitigation" tab renders and switches
- [ ] Both tabs render content without errors

---

### Section 7: Global Components
- [ ] Sidebar renders on all pages
- [ ] All sidebar nav links work
- [ ] TopBar renders on all pages
- [ ] AskTheContract component renders (even if chat is non-functional)
- [ ] No console errors on any page

---

### Section 8: Server Endpoints
- [ ] `GET /api/store` returns `{ analysis: null }` on a fresh server start
- [ ] `POST /api/save-analysis` with a valid body returns 200
- [ ] `GET /api/store` after save returns the saved data
- [ ] `POST /api/save-analysis` with bad JSON returns a useful error

---

## Output Format

```
## Regression Check — [DATE]

### Section 1: Build & Type Safety
- [x] lint passes
- [x] build passes
- [x] no new `any` types
...

### FAILURES (if any)
1. Section 2: Analyze button navigates via window.location.href — must use useNavigate()

### VERDICT: ❌ BLOCKED — 1 failure
```
