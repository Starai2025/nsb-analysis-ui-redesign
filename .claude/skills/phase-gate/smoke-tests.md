# Smoke Test Scenarios — Never Sign Blind

These are the concrete scenarios to test during phase gates and smoke checks. Each test maps to one or more phases.

---

## ST-01: Fresh Load (All Phases)
**Steps:** Open app, navigate to `/`
**Expected:** Redirects to `/intake`. Page loads with upload zones, workflow progress panel, and API key status badge.
**Failure indicators:** White screen, 404, broken layout, missing upload zones.

---

## ST-02: File Rejection (Phase 3 — Ingestion)
**Steps:** Attempt to upload a `.txt` file to the contract upload zone.
**Expected:** Error message: "Only PDF and DOCX files are supported."
**Failure indicators:** File accepted, no error shown, app crashes.

---

## ST-03: Successful Analysis (Phase 4 — Analysis)
**Steps:** Upload a valid PDF contract + PDF correspondence. Click "Analyze Change."
**Expected:**
- Timer starts
- Status messages update (at least "Consulting Gemini AI")
- After 10–60 seconds, navigates to `/summary`
- Summary page shows populated data (not empty, not "null")
**Failure indicators:** Analysis errors immediately, Gemini model error, navigation fails, summary page is empty.

---

## ST-04: Editable Fields Persist (Phase 4)
**Steps:** On `/summary`, change the Claimable Amount field. Click "Save & Generate Full Report."
**Expected:** Navigates to `/report`. The modified claimable amount appears in the report.
**Failure indicators:** Original value shown in report, field edits lost.

---

## ST-05: PDF Export (Phase 5 — Report)
**Steps:** On `/report`, click "Export PDF."
**Expected:** PDF file downloads. File name matches `NeverSignBlind_Report_[date].pdf`. PDF is not blank.
**Failure indicators:** No download, blank PDF, corrupted file, wrong filename.

---

## ST-06: Sources Page Loads (Phase 6 — Sources)
**Steps:** Navigate to `/sources`.
**Expected:** Left panel shows document viewer. Right panel shows citations. No crash.
**Failure indicators:** White screen, JS error, citations panel empty with no message.

---

## ST-07: AskTheContract Chat (Phase 7 — Chat)
**Steps:** Click the AskTheContract panel (should be visible from any page). Type a question. Submit.
**Expected:** Response appears. Response is relevant to the uploaded contract if one has been analyzed.
**Failure indicators:** Panel doesn't open, submit has no effect, error message, response is generic/unrelated.

---

## ST-08: Draft Response Generation (Phase 8 — Draft)
**Steps:** Navigate to `/draft`. Check that the draft letter reflects the current analysis (not hardcoded "Project Alpha").
**Expected:** Letter references the actual project, contract number, and key claim amounts.
**Failure indicators:** Hardcoded placeholder text, empty letter, page crashes.

---

## ST-09: State Persistence Across Refresh (Phase 2 — Persistence)
**Steps:** Complete an analysis. Refresh the page on `/summary`.
**Expected:** Analysis data is still present after refresh.
**Failure indicators:** Data lost, empty state shown, "No analysis found" error.

---

## ST-10: Error Recovery (All Phases)
**Steps:** Trigger an analysis with an invalid/expired API key.
**Expected:** User-friendly error message appears on the intake page. "Analyze Change" button re-enables. User can try again.
**Failure indicators:** Blank screen, unhandled exception, app freezes, no way to recover.

---

## Test Matrix by Phase

| Test | Ph 1 | Ph 2 | Ph 3 | Ph 4 | Ph 5 | Ph 6 | Ph 7 | Ph 8 | Ph 9 |
|------|------|------|------|------|------|------|------|------|------|
| ST-01 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ST-02 | | | ✓ | | | | | | |
| ST-03 | | | | ✓ | | | | | |
| ST-04 | | | | ✓ | ✓ | | | | |
| ST-05 | | | | | ✓ | | | | |
| ST-06 | | | | | | ✓ | | | |
| ST-07 | | | | | | | ✓ | | |
| ST-08 | | | | | | | | ✓ | |
| ST-09 | | ✓ | | | | | | | |
| ST-10 | | | | ✓ | | | | | |
