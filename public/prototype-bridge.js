const STORAGE_KEY = "nsb-prototype-state-v1";
const navMap = { s1: 0, s2: 1, s3: 2, s4: 3, s5: 4 };
const state = {
  projectData: { name: "", contractNumber: "", changeRequestId: "" },
  contractFile: null,
  contractBlob: null,
  correspondenceFile: null,
  contractObjectUrl: "",
  contractMeta: null,
  correspondenceMeta: null,
  analysis: null,
  citations: [],
  report: null,
  draft: null,
  draftTab: "draft",
  lastAnalyzedAt: "",
  sourceSearch: "",
  loading: false,
  reportLoading: false,
  draftLoading: false,
};
let reportRequest = null;
let threadRequest = null;
let pdfjsPromise = null;
const sourceViewer = {
  pdfDoc: null,
  currentPage: 1,
  totalPages: 0,
  zoom: 1,
  loadingTask: null,
  documentKey: "",
  thumbRenderToken: 0,
};

const el = {
  sidebarProjectName: document.getElementById("sidebarProjectName"),
  sidebarProjectMeta: document.getElementById("sidebarProjectMeta"),
  topbarProjectChip: document.getElementById("topbarProjectChip"),
  topbarChangeChip: document.getElementById("topbarChangeChip"),
  topbarCitationChip: document.getElementById("topbarCitationChip"),
  intakeCaseTitle: document.getElementById("intakeCaseTitle"),
  contractInput: document.getElementById("contractInput"),
  correspondenceInput: document.getElementById("correspondenceInput"),
  projectNameInput: document.getElementById("projectNameInput"),
  contractNumberInput: document.getElementById("contractNumberInput"),
  changeRequestInput: document.getElementById("changeRequestInput"),
  contractCard: document.getElementById("contractCard"),
  contractBadge: document.getElementById("contractBadge"),
  contractTitle: document.getElementById("contractTitle"),
  contractSub: document.getElementById("contractSub"),
  contractFileLine: document.getElementById("contractFileLine"),
  contractFileGlyph: document.getElementById("contractFileGlyph"),
  contractFileName: document.getElementById("contractFileName"),
  correspondenceCard: document.getElementById("correspondenceCard"),
  correspondenceBadge: document.getElementById("correspondenceBadge"),
  correspondenceTitle: document.getElementById("correspondenceTitle"),
  correspondenceSub: document.getElementById("correspondenceSub"),
  correspondenceFileLine: document.getElementById("correspondenceFileLine"),
  correspondenceFileGlyph: document.getElementById("correspondenceFileGlyph"),
  correspondenceFileName: document.getElementById("correspondenceFileName"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  analyzeStatus: document.getElementById("analyzeStatus"),
  intakeNoticeText: document.getElementById("intakeNoticeText"),
  progressCount: document.getElementById("progressCount"),
  progressDotContract: document.getElementById("progressDotContract"),
  progressTextContract: document.getElementById("progressTextContract"),
  progressDotCorrespondence: document.getElementById("progressDotCorrespondence"),
  progressTextCorrespondence: document.getElementById("progressTextCorrespondence"),
  progressDotAnalysis: document.getElementById("progressDotAnalysis"),
  progressTextAnalysis: document.getElementById("progressTextAnalysis"),
  docsStaged: document.getElementById("docsStaged"),
  expectedOutput: document.getElementById("expectedOutput"),
  summaryCaseTitle: document.getElementById("summaryCaseTitle"),
  summaryClauseChip: document.getElementById("summaryClauseChip"),
  summaryConfidenceChip: document.getElementById("summaryConfidenceChip"),
  summaryAnalyzed: document.getElementById("summaryAnalyzed"),
  summaryTitle: document.getElementById("summaryTitle"),
  summaryText: document.getElementById("summaryText"),
  summaryStampBadge: document.getElementById("summaryStampBadge"),
  summaryStampValue: document.getElementById("summaryStampValue"),
  metricScope: document.getElementById("metricScope"),
  metricMoney: document.getElementById("metricMoney"),
  metricTime: document.getElementById("metricTime"),
  metricResponsibility: document.getElementById("metricResponsibility"),
  metricDeadline: document.getElementById("metricDeadline"),
  metricClaimable: document.getElementById("metricClaimable"),
  recommendationText: document.getElementById("recommendationText"),
  riskGrid: document.getElementById("riskGrid"),
  generateReportBtn: document.getElementById("generateReportBtn"),
  regenerateReportBtn: document.getElementById("regenerateReportBtn"),
  exportReportBtn: document.getElementById("exportReportBtn"),
  reportCaseTitle: document.getElementById("reportCaseTitle"),
  reportStatusChip: document.getElementById("reportStatusChip"),
  reportFindingsChip: document.getElementById("reportFindingsChip"),
  reportConfidenceMeta: document.getElementById("reportConfidenceMeta"),
  reportUpdatedMeta: document.getElementById("reportUpdatedMeta"),
  reportSignals: document.getElementById("reportSignals"),
  reportCard: document.getElementById("reportCard"),
  sourcesFileName: document.getElementById("sourcesFileName"),
  sourcesViewerMode: document.getElementById("sourcesViewerMode"),
  sourcesOutline: document.getElementById("sourcesOutline"),
  sourcesThumbs: document.getElementById("sourcesThumbs"),
  sourcesCanvasViewport: document.getElementById("sourcesCanvasViewport"),
  sourcesCanvas: document.getElementById("sourcesCanvas"),
  sourcesViewerEmpty: document.getElementById("sourcesViewerEmpty"),
  viewerCurrentPage: document.getElementById("viewerCurrentPage"),
  viewerTotalPages: document.getElementById("viewerTotalPages"),
  viewerZoomLabel: document.getElementById("viewerZoomLabel"),
  viewerPrevBtn: document.getElementById("viewerPrevBtn"),
  viewerNextBtn: document.getElementById("viewerNextBtn"),
  viewerZoomOutBtn: document.getElementById("viewerZoomOutBtn"),
  viewerZoomInBtn: document.getElementById("viewerZoomInBtn"),
  sourceSignalClauseCount: document.getElementById("sourceSignalClauseCount"),
  sourceSignalPageRefs: document.getElementById("sourceSignalPageRefs"),
  sourceSignalConfidence: document.getElementById("sourceSignalConfidence"),
  sourcesEvidenceCount: document.getElementById("sourcesEvidenceCount"),
  sourcesSearchInput: document.getElementById("sourcesSearchInput"),
  openDocumentBtn: document.getElementById("openDocumentBtn"),
  citationsPanel: document.getElementById("citationsPanel"),
  regenerateDraftBtn: document.getElementById("regenerateDraftBtn"),
  saveDraftBtn: document.getElementById("saveDraftBtn"),
  copyDraftBtn: document.getElementById("copyDraftBtn"),
  exportDraftBtn: document.getElementById("exportDraftBtn"),
  draftTextarea: document.getElementById("draftTextarea"),
  draftTabBtn: document.getElementById("draftTabBtn"),
  strategyTabBtn: document.getElementById("strategyTabBtn"),
  draftPanel: document.getElementById("draftPanel"),
  strategyPanel: document.getElementById("strategyPanel"),
  draftStrategyPanel: document.getElementById("draftStrategyPanel"),
  draftSidebar: document.getElementById("draftSidebar"),
};

function formatDate(value) {
  if (!value) return "Not yet analyzed";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "Awaiting analysis";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nl2br(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function cloneArrayBuffer(buffer) {
  if (!(buffer instanceof ArrayBuffer)) return null;
  return buffer.slice(0);
}

const THREAD_DB_NAME = "nsb-db";
const THREAD_DB_VERSION = 1;
const THREAD_STORE = "threads";
const CURRENT_THREAD_ID = "current";

function openThreadDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(THREAD_DB_NAME, THREAD_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(THREAD_STORE)) {
        db.createObjectStore(THREAD_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadCurrentThread() {
  try {
    const db = await openThreadDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(THREAD_STORE, "readonly");
      const req = tx.objectStore(THREAD_STORE).get(CURRENT_THREAD_ID);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function saveCurrentThread() {
  if (threadRequest) return threadRequest;
  threadRequest = (async () => {
    const db = await openThreadDb();
    const existing = await loadCurrentThread();
    const now = new Date().toISOString();
    const thread = {
      id: CURRENT_THREAD_ID,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      projectData: state.projectData,
      analysis: state.analysis,
      contract: state.contractMeta,
      correspondence: state.correspondenceMeta,
      citations: state.citations,
      report: state.report,
      draft: state.draft,
      contractBlob: cloneArrayBuffer(state.contractBlob),
    };
    await new Promise((resolve, reject) => {
      const tx = db.transaction(THREAD_STORE, "readwrite");
      const req = tx.objectStore(THREAD_STORE).put(thread);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  })();
  try {
    await threadRequest;
  } finally {
    threadRequest = null;
  }
}

async function clearCurrentThread() {
  try {
    const db = await openThreadDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(THREAD_STORE, "readwrite");
      const req = tx.objectStore(THREAD_STORE).delete(CURRENT_THREAD_ID);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore persistence cleanup failures in the prototype.
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      projectData: state.projectData,
      contractMeta: state.contractMeta,
      correspondenceMeta: state.correspondenceMeta,
      analysis: state.analysis,
      citations: state.citations,
      report: state.report,
      draft: state.draft,
      draftTab: state.draftTab,
      lastAnalyzedAt: state.lastAnalyzedAt,
    }),
  );
}

function clearPersistedState() {
  localStorage.removeItem(STORAGE_KEY);
}

function syncContractObjectUrl() {
  if (state.contractObjectUrl) {
    URL.revokeObjectURL(state.contractObjectUrl);
    state.contractObjectUrl = "";
  }
  if (state.contractBlob) {
    state.contractObjectUrl = URL.createObjectURL(new Blob([state.contractBlob], { type: "application/pdf" }));
  } else if (state.contractFile && (state.contractFile.type || "").includes("pdf")) {
    state.contractObjectUrl = URL.createObjectURL(state.contractFile);
  }
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    state.projectData = parsed.projectData || state.projectData;
    state.contractMeta = parsed.contractMeta || null;
    state.correspondenceMeta = parsed.correspondenceMeta || null;
    state.analysis = parsed.analysis || null;
    state.citations = Array.isArray(parsed.citations) ? parsed.citations : [];
    state.report = parsed.report || null;
    state.draft = parsed.draft || null;
    state.draftTab = parsed.draftTab === "strategy" ? "strategy" : "draft";
    state.lastAnalyzedAt = parsed.lastAnalyzedAt || "";
    return true;
  } catch {
    return false;
  }
}

async function hydrateFromThread() {
  const thread = await loadCurrentThread();
  if (!thread) return false;
  state.projectData = thread.projectData || state.projectData;
  state.analysis = thread.analysis || state.analysis;
  state.contractMeta = thread.contract || state.contractMeta;
  state.correspondenceMeta = thread.correspondence || state.correspondenceMeta;
  state.citations = Array.isArray(thread.citations) ? thread.citations : state.citations;
  state.report = thread.report || state.report;
  state.draft = thread.draft || state.draft;
  state.contractBlob = cloneArrayBuffer(thread.contractBlob) || state.contractBlob;
  state.lastAnalyzedAt = thread.updatedAt || state.lastAnalyzedAt || state.contractMeta?.metadata?.uploadedAt || "";
  syncContractObjectUrl();
  saveState();
  return true;
}

function renderWorkspaceChrome() {
  const pd = state.projectData;
  const projectName = pd.name || "No active analysis";
  const contractLabel = pd.contractNumber ? `Contract ${pd.contractNumber}` : "Contract pending";
  const changeLabel = pd.changeRequestId || "No change request";
  const citationCount = state.citations.length || 0;
  const hasAnalysis = !!state.analysis;

  el.sidebarProjectName.textContent = projectName;
  el.sidebarProjectMeta.textContent = hasAnalysis ? `${contractLabel} · ${changeLabel}` : "Start a new contract review";
  el.topbarProjectChip.innerHTML = `<span class="tb-mini-dot"></span>${escapeHtml(pd.name || "No active project")}`;
  el.topbarChangeChip.textContent = escapeHtml(changeLabel);
  el.topbarCitationChip.textContent = citationCount ? `${citationCount} citation${citationCount === 1 ? "" : "s"} cited` : "No citations yet";
  el.intakeCaseTitle.textContent = pd.name ? `${pd.name} · Proposed Variation Review` : "Start a new contract analysis";
}

function setProjectFields() {
  el.projectNameInput.value = state.projectData.name || "";
  el.contractNumberInput.value = state.projectData.contractNumber || "";
  el.changeRequestInput.value = state.projectData.changeRequestId || "";
}

function syncProjectData() {
  state.projectData = {
    name: el.projectNameInput.value.trim(),
    contractNumber: el.contractNumberInput.value.trim(),
    changeRequestId: el.changeRequestInput.value.trim(),
  };
  saveState();
  if (state.analysis || state.contractMeta || state.correspondenceMeta) {
    saveCurrentThread().catch(() => {});
  }
  renderSummary();
  renderReport();
  renderDraft();
}

function setStatus(message, tone) {
  const bg = tone === "error" ? "rgba(179, 54, 39, .1)" : tone === "success" ? "rgba(7, 122, 68, .1)" : "rgba(17, 24, 39, .06)";
  const color = tone === "error" ? "var(--red)" : tone === "success" ? "var(--grn)" : "var(--navy)";
  el.analyzeStatus.textContent = message;
  el.analyzeStatus.style.background = bg;
  el.analyzeStatus.style.color = color;
  el.intakeNoticeText.textContent = message;
}

function setProgressStep(dot, text, done, pendingText, doneText) {
  dot.style.background = done ? "var(--orange)" : "transparent";
  dot.style.borderColor = done ? "var(--orange)" : "rgba(17,24,39,.18)";
  text.textContent = done ? doneText : pendingText;
  text.style.color = done ? "var(--navy)" : "var(--g400)";
}

function renderUploadCard(kind) {
  const isContract = kind === "contract";
  const file = isContract ? state.contractFile : state.correspondenceFile;
  const meta = isContract ? state.contractMeta : state.correspondenceMeta;
  const card = isContract ? el.contractCard : el.correspondenceCard;
  const badge = isContract ? el.contractBadge : el.correspondenceBadge;
  const title = isContract ? el.contractTitle : el.correspondenceTitle;
  const sub = isContract ? el.contractSub : el.correspondenceSub;
  const fileLine = isContract ? el.contractFileLine : el.correspondenceFileLine;
  const glyph = isContract ? el.contractFileGlyph : el.correspondenceFileGlyph;
  const fileName = isContract ? el.contractFileName : el.correspondenceFileName;
  const source = file || meta;
  const ready = !!source;
  card.style.borderColor = ready ? "rgba(202,118,60,.45)" : "var(--g100)";
  card.style.background = ready ? "linear-gradient(180deg,#fff7ef 0%,#ffffff 100%)" : "";
  badge.textContent = ready ? "Ready" : "Awaiting upload";
  badge.style.background = ready ? "rgba(202,118,60,.12)" : "rgba(17,24,39,.06)";
  badge.style.color = ready ? "var(--orange)" : "var(--g500)";
  title.textContent = ready ? source.name || "Uploaded file" : isContract ? "Upload Contract" : "Upload Correspondence";
  sub.textContent = ready
    ? `${meta?.pages?.length || source.pages?.length || "Multi-page"} ${isContract ? "contract" : "supporting"} document`
    : `Drop ${isContract ? "a contract PDF or DOCX" : "emails, letters, or change request support"} here`;
  fileLine.style.display = ready ? "flex" : "none";
  glyph.textContent = ready ? ((source.metadata?.mimeType || file?.type || "").includes("pdf") ? "PDF" : "DOCX") : "";
  fileName.textContent = ready ? `${source.name || "Uploaded file"}${source.metadata?.fileSize ? ` · ${Math.round(source.metadata.fileSize / 1024)} KB` : ""}` : "";
}

function renderIntake() {
  renderUploadCard("contract");
  renderUploadCard("correspondence");
  const docsReady = Number(!!(state.contractFile || state.contractMeta)) + Number(!!(state.correspondenceFile || state.correspondenceMeta));
  el.progressCount.textContent = `${docsReady}/2`;
  el.docsStaged.textContent = `${docsReady} of 2 documents staged`;
  el.expectedOutput.textContent = state.analysis
    ? "Summary, report, sources, and draft are ready to review."
    : "Executive summary, evidence map, formal report, and draft response.";
  setProgressStep(el.progressDotContract, el.progressTextContract, !!(state.contractFile || state.contractMeta), "Waiting for contract upload", "Contract uploaded");
  setProgressStep(el.progressDotCorrespondence, el.progressTextCorrespondence, !!(state.correspondenceFile || state.correspondenceMeta), "Waiting for correspondence upload", "Correspondence uploaded");
  setProgressStep(
    el.progressDotAnalysis,
    el.progressTextAnalysis,
    !!state.analysis,
    "Analysis not yet run",
    `Analysis ready${state.lastAnalyzedAt ? ` · ${formatDate(state.lastAnalyzedAt)}` : ""}`,
  );

  const ready = !!state.contractFile && !!state.correspondenceFile && !state.loading;
  el.analyzeBtn.disabled = !ready;
  el.analyzeBtn.style.opacity = ready ? "1" : ".55";
  el.analyzeBtn.style.cursor = ready ? "pointer" : "not-allowed";

  if (state.loading) setStatus("Analyzing uploaded documents against the live backend...", "neutral");
  else if (state.analysis) setStatus("Analysis complete. Review the decision summary, report, sources, and draft.", "success");
  else if (docsReady === 2) setStatus("Both documents are staged. Run analysis when you are ready.", "neutral");
  else setStatus("Upload a contract and correspondence file to activate the backend workflow.", "neutral");
}

function populateSummaryMetric(node, label, value, tone) {
  node.innerHTML = `<div class="mc-l">${escapeHtml(label)}</div><div class="mc-v">${escapeHtml(value)}</div>`;
  node.style.borderTopColor = tone === "good" ? "var(--grn)" : tone === "warn" ? "var(--orange)" : tone === "risk" ? "var(--red)" : "var(--navy)";
}

function renderSummary() {
  const analysis = state.analysis;
  const pd = state.projectData;
  const caseName = [pd.name || "Project workspace", pd.contractNumber || "Contract pending", pd.changeRequestId || "Change request pending"].filter(Boolean).join(" · ");
  el.summaryCaseTitle.textContent = caseName;
  el.summaryAnalyzed.textContent = state.lastAnalyzedAt ? `Analyzed ${formatDateTime(state.lastAnalyzedAt)}` : "Awaiting uploaded documents";
  el.summaryClauseChip.textContent = `${state.citations.length || 0} clause${state.citations.length === 1 ? "" : "s"} cited`;

  if (!analysis) {
    el.summaryConfidenceChip.textContent = "Confidence pending";
    el.summaryTitle.textContent = "Run an analysis to populate this executive summary";
    el.summaryText.textContent = "Once the contract and correspondence are analyzed, this screen will show the live conclusion, commercial position, deadline risk, and supporting evidence from the backend.";
    el.summaryStampBadge.textContent = "Status";
    el.summaryStampValue.textContent = "Awaiting documents";
    populateSummaryMetric(el.metricScope, "Scope status", "Pending", "neutral");
    populateSummaryMetric(el.metricMoney, "Extra money likely", "Pending", "neutral");
    populateSummaryMetric(el.metricTime, "Extra time likely", "Pending", "neutral");
    populateSummaryMetric(el.metricResponsibility, "Primary responsibility", "Pending", "neutral");
    populateSummaryMetric(el.metricDeadline, "Notice deadline", "Pending", "neutral");
    populateSummaryMetric(el.metricClaimable, "Claimable amount", "Pending", "neutral");
    el.recommendationText.textContent = "Strategic recommendation will appear here after the backend completes its analysis.";
    el.riskGrid.innerHTML = `<div class="ri ri-l"><div class="ri-sev">Info</div><div class="ri-title">No risks generated yet</div><div class="ri-body">Upload both documents and run analysis to generate the risk register from the live backend.</div><div class="ri-tags"><span class="ri-tag">Waiting</span></div></div>`;
    return;
  }

  el.summaryConfidenceChip.textContent = state.citations.length >= 3 ? "Evidence confidence: high" : state.citations.length ? "Evidence confidence: medium" : "Evidence confidence: limited";
  el.summaryTitle.textContent = analysis.scopeStatus === "Out of Scope" ? "The requested change appears outside the original contract scope" : "The requested change appears to stay within the original contract scope";
  el.summaryText.textContent = analysis.executiveConclusion || "No executive conclusion returned.";
  el.summaryStampBadge.textContent = "Scope posture";
  el.summaryStampValue.textContent = analysis.scopeStatus || "Unclear";
  populateSummaryMetric(el.metricScope, "Scope status", analysis.scopeStatus || "Unclear", analysis.scopeStatus === "Out of Scope" ? "risk" : "good");
  populateSummaryMetric(el.metricMoney, "Extra money likely", analysis.extraMoneyLikely ? "Likely yes" : "Likely no", analysis.extraMoneyLikely ? "warn" : "good");
  populateSummaryMetric(el.metricTime, "Extra time likely", analysis.extraTimeLikely ? "Likely yes" : "Likely no", analysis.extraTimeLikely ? "warn" : "good");
  populateSummaryMetric(el.metricResponsibility, "Primary responsibility", analysis.primaryResponsibility || "Not specified", "neutral");
  populateSummaryMetric(el.metricDeadline, "Notice deadline", analysis.noticeDeadline || "Not specified", analysis.noticeDeadline && analysis.noticeDeadline !== "Not specified" ? "warn" : "neutral");
  populateSummaryMetric(el.metricClaimable, "Claimable amount", analysis.claimableAmount || "Not specified", "neutral");
  el.recommendationText.textContent = analysis.strategicRecommendation || "No recommendation returned.";
  el.riskGrid.innerHTML = (analysis.keyRisks || [])
    .map((risk, index) => {
      const severity = index < 2 ? "High" : index < 4 ? "Med" : "Low";
      const cls = index < 2 ? "ri-h" : index < 4 ? "ri-m" : "ri-l";
      const sevColor = index < 2 ? "var(--red)" : index < 4 ? "#8B4E0E" : "var(--g400)";
      const citation = state.citations[index];
      return `<div class="ri ${cls}"><div class="ri-sev" style="color:${sevColor};">${severity}</div><div class="ri-title">${escapeHtml(risk.title || "Untitled risk")}</div><div class="ri-body">${escapeHtml(risk.description || "")}</div><div class="ri-tags"><span class="ri-tag">${escapeHtml(citation?.source || "Backend analysis")}</span><span class="ri-tag">${escapeHtml(citation?.confidence || "Review required")}</span></div></div>`;
    })
    .join("") || `<div class="ri ri-l"><div class="ri-sev">Info</div><div class="ri-title">No risks returned</div><div class="ri-body">The backend did not return any risk items for this analysis.</div><div class="ri-tags"><span class="ri-tag">Manual review</span></div></div>`;
}

function reportSectionHtml(index, heading, content) {
  return `<div class="rs"><div class="rs-head"><div class="rs-num">${String(index).padStart(2, "0")}</div><div class="rs-title">${escapeHtml(heading)}</div></div><div class="rs-body">${content}</div></div>`;
}

function renderReportHeader(report) {
  const pd = state.projectData;
  const metadata = report?.metadata || {};
  const sections = report?.sections || {};
  const clauseCount = Array.isArray(sections.keyContractClauses) ? sections.keyContractClauses.length : 0;
  const confidence = clauseCount >= 3 ? "High" : clauseCount >= 1 ? "Medium" : "Developing";
  const signals = [];

  if (sections.arcadisPosition?.scopeStatus) signals.push(sections.arcadisPosition.scopeStatus);
  if (sections.arcadisPosition?.feePosition) signals.push(`Fee: ${sections.arcadisPosition.feePosition}`);
  if (sections.arcadisPosition?.timePosition) signals.push(`Time: ${sections.arcadisPosition.timePosition}`);
  if (clauseCount) signals.push(`${clauseCount} supporting clause${clauseCount === 1 ? "" : "s"}`);

  el.reportCaseTitle.textContent = [metadata.projectName || pd.name || "Project workspace", "Formal analysis output"].join(" · ");
  el.reportStatusChip.innerHTML = `<span class="case-chip-dot"></span>${escapeHtml(metadata.reportStatus || (state.reportLoading ? "Generating" : "Awaiting report"))}`;
  el.reportFindingsChip.textContent = `${clauseCount || 0} finding${clauseCount === 1 ? "" : "s"} referenced`;
  el.reportConfidenceMeta.textContent = `Confidence: ${confidence}`;
  el.reportUpdatedMeta.textContent = state.reportLoading ? "Generating now" : `Last updated ${formatDate(metadata.dateOfAnalysis || report?.updatedAt || state.lastAnalyzedAt)}`;
  el.reportSignals.innerHTML = (signals.length ? signals : ["Awaiting generated report", "Signals will populate from backend output"]).slice(0, 4).map((signal) => `<div class="summary-chip"><span class="summary-chip-dot"></span>${escapeHtml(signal)}</div>`).join("");
}

function renderReport() {
  const report = state.report;
  const pd = state.projectData;
  renderReportHeader(report);
  if (state.reportLoading) {
    el.reportCard.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;"><div><div class="ey">Never Sign Blind™</div><div class="pg-title" style="margin-bottom:5px;">Generating report...</div><div style="font-size:13px;color:var(--g400);">The backend is building the formal report from the latest analysis.</div></div><div style="text-align:right;flex-shrink:0;"><span class="bdg b-ora">Working</span><div style="font-size:12px;color:var(--g400);margin-top:8px;">Please wait</div></div></div><div class="dv" style="margin:0 0 2px;"></div>${reportSectionHtml(1, "Executive Summary", "Generating the full report now from the analyzed contract and correspondence.")}`;
    return;
  }
  if (!report) {
    el.reportCard.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;"><div><div class="ey">Never Sign Blind™</div><div class="pg-title" style="margin-bottom:5px;">Change Order Analysis Report</div><div style="font-size:13px;color:var(--g400);">Run analysis and generate a report to populate this workspace.</div></div><div style="text-align:right;flex-shrink:0;"><span class="bdg b-gry">Pending</span><div style="font-size:12px;color:var(--g400);margin-top:8px;">Awaiting report generation</div></div></div><div class="dv" style="margin:0 0 2px;"></div>${reportSectionHtml(1, "Executive Summary", "The formal report will be generated from the saved analysis and displayed here.")}`;
    return;
  }

  const metadata = report.metadata || {};
  const sections = report.sections || {};
  const keyClauses = Array.isArray(sections.keyContractClauses)
    ? sections.keyContractClauses
        .map(
          (clause) => `<div class="cc"><div class="cc-head"><span class="cc-ref">${escapeHtml(clause.reference || "Clause")}</span><span class="cc-pg">${escapeHtml(clause.reference || "")}</span></div><div class="cc-body"><div class="cc-q">${escapeHtml(clause.excerpt || "")}</div><div class="cc-ml">Why It Matters</div><div class="cc-mt">${escapeHtml(clause.whyItMatters || clause.meaning || "")}</div></div></div>`,
        )
        .join("")
    : "";

  el.reportCard.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;">
      <div>
        <div class="ey">Never Sign Blind™</div>
        <div class="pg-title" style="margin-bottom:5px;">${escapeHtml(report.title || "Change Order Analysis Report")}</div>
        <div style="font-size:13px;color:var(--g400);">${escapeHtml(metadata.projectName || pd.name || "Project")} &nbsp;&middot;&nbsp; ${escapeHtml(metadata.contractNumber || pd.contractNumber || "Contract")} &nbsp;&middot;&nbsp; ${escapeHtml(metadata.changeRequestId || pd.changeRequestId || "Change request")} &nbsp;&middot;&nbsp; Owner: ${escapeHtml(metadata.ownerClient || "Not specified")}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <span class="bdg b-gry">${escapeHtml(metadata.reportStatus || "Draft")}</span>
        <div style="font-size:12px;color:var(--g400);margin-top:8px;">Analyzed: ${escapeHtml(formatDate(metadata.dateOfAnalysis || state.lastAnalyzedAt))}</div>
      </div>
    </div>
    <div class="dv" style="margin:0 0 2px;"></div>
    ${reportSectionHtml(1, "Executive Summary", nl2br(sections.executiveSummary?.content || ""))}
    ${reportSectionHtml(2, "Owner / Client Request", nl2br(sections.ownerRequest?.content || ""))}
    ${reportSectionHtml(3, "Position Assessment", `<div class="sg" style="margin-bottom:12px;"><div class="sc2"><div class="sc2-l">Scope Status</div><span class="bdg b-red">${escapeHtml(sections.arcadisPosition?.scopeStatus || "Unclear")}</span></div><div class="sc2"><div class="sc2-l">Responsibility</div><span class="bdg b-ora">${escapeHtml(sections.arcadisPosition?.responsibility || "Unclear")}</span></div><div class="sc2"><div class="sc2-l">Fee Position</div><span class="bdg b-grn">${escapeHtml(sections.arcadisPosition?.feePosition || "Unclear")}</span></div></div>${nl2br(sections.arcadisPosition?.explanation || "")}`)}
    ${reportSectionHtml(4, "Key Contract Clauses", keyClauses || "No clause summary returned.")}
    ${reportSectionHtml(5, "Application", nl2br(sections.application?.content || ""))}
    ${reportSectionHtml(6, "Commercial Analysis", nl2br(sections.commercialAnalysis?.content || ""))}
    ${reportSectionHtml(7, "Schedule Impact", `<strong style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:var(--navy);display:block;margin-bottom:6px;">Critical Path Impact</strong>${escapeHtml(sections.scheduleImpact?.criticalPathImpact || "Not enough information")}<br><br><strong style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:var(--navy);display:block;margin-bottom:6px;">Delay Risk</strong>${escapeHtml(sections.scheduleImpact?.delayRiskLevel || "Unclear")}<br><br>${nl2br(sections.scheduleImpact?.explanation || "")}`)}
    ${reportSectionHtml(8, "Notice Requirements", `<strong style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:var(--navy);display:block;margin-bottom:6px;">Notice Required</strong>${escapeHtml(sections.noticeRequirements?.noticeRequired || "Unclear")}<br><br><strong style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:var(--navy);display:block;margin-bottom:6px;">Deadline</strong>${escapeHtml(sections.noticeRequirements?.deadline || "Not specified")}<br><br><strong style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:var(--navy);display:block;margin-bottom:6px;">Recipient</strong>${escapeHtml(sections.noticeRequirements?.recipient || "Not specified")}<br><br>${nl2br(sections.noticeRequirements?.riskIfMissed || "")}`)}
    ${reportSectionHtml(9, "Risk and Mitigation", nl2br(sections.riskAndMitigation?.content || ""))}
    ${reportSectionHtml(10, "Recommendation", nl2br(sections.recommendation?.content || ""))}
    ${reportSectionHtml(11, "Draft Response", nl2br(sections.draftResponse?.content || ""))}
    ${reportSectionHtml(12, "Source Snapshot", nl2br(sections.sourceSnapshot?.content || ""))}
    <div style="border-top:1px solid var(--g100);padding-top:14px;display:flex;justify-content:space-between;margin-top:8px;">
      <div style="font-size:12px;color:var(--g400);">Never Sign Blind™ &mdash; Confidential &nbsp;&middot;&nbsp; Backend-generated analysis</div>
    <div style="font-size:12px;color:var(--g400);">Updated ${escapeHtml(formatDate(report.updatedAt || state.lastAnalyzedAt))}</div>
    </div>`;
}

function parsePageFromSource(source) {
  const match = String(source || "").match(/(?:page|pg|p\.?)\s*(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function extractProofRefs(...values) {
  const joined = values.filter(Boolean).join(" | ");
  const pageMatch = joined.match(/(?:page|pg|p\.?)\s*(\d+)/i);
  const articleMatch = joined.match(/\barticle\s+([a-z0-9.\-]+)/i);
  const sectionMatch = joined.match(/\bsection\s+([a-z0-9.\-]+)/i);
  const exhibitMatch = joined.match(/\bexhibit\s+([a-z0-9.\-]+)/i);
  return {
    page: pageMatch ? `Page ${pageMatch[1]}` : "",
    article: articleMatch ? `Article ${articleMatch[1]}` : "",
    section: sectionMatch ? `Section ${sectionMatch[1]}` : exhibitMatch ? `Exhibit ${exhibitMatch[1]}` : "",
  };
}

function getClauseEntries() {
  const clauses = state.report?.sections?.keyContractClauses;
  return Array.isArray(clauses) ? clauses : [];
}

function getEvidenceItems() {
  const citationItems = (Array.isArray(state.citations) ? state.citations : []).map((citation, index) => ({
    id: citation.id || `citation-${index}`,
    kind: "citation",
    order: index + 1,
    title: citation.title || "Citation",
    source: citation.source || "Uploaded contract",
    quote: citation.text || "",
    explanation: citation.explanation || "",
    confidence: citation.confidence || "Medium",
    pageNumber: parsePageFromSource(citation.source),
    proof: extractProofRefs(citation.source, citation.title, citation.text, citation.explanation),
  }));
  const clauseItems = getClauseEntries().map((clause, index) => ({
    id: `clause-${index}`,
    kind: "clause",
    order: citationItems.length + index + 1,
    title: clause.reference || `Clause ${index + 1}`,
    source: clause.reference || "Generated report",
    quote: clause.excerpt || "",
    explanation: clause.whyItMatters || clause.meaning || "",
    confidence: "Report",
    pageNumber: parsePageFromSource(clause.reference),
    proof: extractProofRefs(clause.reference, clause.excerpt, clause.whyItMatters, clause.meaning),
  }));
  return [...citationItems, ...clauseItems];
}

function getFilteredEvidenceItems() {
  const query = state.sourceSearch.trim().toLowerCase();
  const items = getEvidenceItems();
  if (!query) return items;
  return items.filter((item) =>
    [item.title, item.source, item.quote, item.explanation].some((field) => String(field || "").toLowerCase().includes(query)),
  );
}

async function getPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("/pdfjs/pdf.mjs").then((module) => {
      module.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.mjs";
      return module;
    });
  }
  return pdfjsPromise;
}

function updateViewerUi() {
  const hasPdf = !!sourceViewer.pdfDoc;
  el.viewerCurrentPage.textContent = hasPdf ? String(sourceViewer.currentPage) : "0";
  el.viewerTotalPages.textContent = hasPdf ? String(sourceViewer.totalPages) : "0";
  el.viewerZoomLabel.textContent = `${Math.round(sourceViewer.zoom * 100)}%`;
  el.viewerPrevBtn.disabled = !hasPdf || sourceViewer.currentPage <= 1;
  el.viewerNextBtn.disabled = !hasPdf || sourceViewer.currentPage >= sourceViewer.totalPages;
}

async function renderPdfPage(pageNumber = sourceViewer.currentPage) {
  if (!sourceViewer.pdfDoc) return;
  sourceViewer.currentPage = Math.max(1, Math.min(pageNumber, sourceViewer.totalPages));
  const page = await sourceViewer.pdfDoc.getPage(sourceViewer.currentPage);
  const viewport = page.getViewport({ scale: sourceViewer.zoom });
  const canvas = el.sourcesCanvas;
  const context = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * ratio);
  canvas.height = Math.floor(viewport.height * ratio);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  await page.render({ canvasContext: context, viewport }).promise;
  el.sourcesViewerEmpty.style.display = "none";
  canvas.style.display = "block";
  updateViewerUi();
  el.sourcesThumbs.querySelectorAll(".thumb-item").forEach((node) => {
    node.classList.toggle("active", Number(node.dataset.page) === sourceViewer.currentPage);
  });
}

async function renderPdfThumbnails() {
  if (!sourceViewer.pdfDoc) {
    el.sourcesThumbs.innerHTML = `<div class="thumb-empty">PDF thumbnails will appear here after analysis.</div>`;
    return;
  }
  const citedPages = new Set(getEvidenceItems().map((item) => item.pageNumber).filter(Boolean));
  const total = sourceViewer.totalPages;
  el.sourcesThumbs.innerHTML = Array.from({ length: total }, (_, index) => {
    const pageNumber = index + 1;
    return `<button class="thumb-item${pageNumber === sourceViewer.currentPage ? " active" : ""}" data-page="${pageNumber}" type="button">
      <div class="thumb-sheet"><canvas class="thumb-canvas" id="thumb-canvas-${pageNumber}"></canvas></div>
      <div class="thumb-meta"><span>Page ${pageNumber}</span>${citedPages.has(pageNumber) ? '<span class="thumb-hit"></span>' : ""}</div>
    </button>`;
  }).join("");
  el.sourcesThumbs.querySelectorAll(".thumb-item").forEach((node) => {
    node.addEventListener("click", () => jumpToPage(Number(node.dataset.page)));
  });
  const token = ++sourceViewer.thumbRenderToken;
  for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
    if (token !== sourceViewer.thumbRenderToken) return;
    const page = await sourceViewer.pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 0.22 });
    const canvas = document.getElementById(`thumb-canvas-${pageNumber}`);
    if (!canvas) continue;
    const context = canvas.getContext("2d");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvasContext: context, viewport }).promise;
  }
}

async function loadPdfViewer() {
  if (!state.contractBlob) {
    sourceViewer.pdfDoc = null;
    sourceViewer.documentKey = "";
    sourceViewer.totalPages = 0;
    sourceViewer.currentPage = 1;
    sourceViewer.thumbRenderToken += 1;
    el.sourcesCanvas.style.display = "none";
    el.sourcesViewerEmpty.style.display = "flex";
    el.sourcesThumbs.innerHTML = `<div class="thumb-empty">Upload a contract PDF to enable the viewer.</div>`;
    updateViewerUi();
    return;
  }
  const activeBlob = cloneArrayBuffer(state.contractBlob);
  if (!activeBlob) {
    throw new Error("The saved PDF data is unavailable. Re-run the analysis to restore the viewer.");
  }
  const documentKey = `${state.contractMeta?.name || "contract"}-${activeBlob.byteLength}`;
  if (sourceViewer.pdfDoc && sourceViewer.documentKey === documentKey) {
    updateViewerUi();
    return;
  }
  if (sourceViewer.loadingTask) {
    try {
      sourceViewer.loadingTask.destroy();
    } catch {
      // Ignore previous loading task cleanup failures.
    }
  }
  const pdfjsLib = await getPdfJs();
  sourceViewer.loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(activeBlob) });
  sourceViewer.pdfDoc = await sourceViewer.loadingTask.promise;
  sourceViewer.documentKey = documentKey;
  sourceViewer.totalPages = sourceViewer.pdfDoc.numPages;
  sourceViewer.currentPage = Math.min(sourceViewer.currentPage, sourceViewer.totalPages || 1) || 1;
  await renderPdfThumbnails();
  await renderPdfPage(sourceViewer.currentPage);
}

function jumpToPage(pageNumber) {
  if (!pageNumber || !sourceViewer.pdfDoc) return;
  renderPdfPage(pageNumber).catch(() => {});
}

function renderSources() {
  const items = getFilteredEvidenceItems();
  const allItems = getEvidenceItems();
  const citedPages = [...new Set(allItems.map((item) => item.pageNumber).filter(Boolean))].sort((a, b) => a - b);
  const confidenceLabel = allItems.some((item) => item.confidence === "High")
    ? "High confidence signal"
    : allItems.some((item) => item.confidence === "Medium")
      ? "Medium confidence signal"
      : allItems.length
        ? "Report-backed evidence"
        : "Confidence updates after analysis";

  el.sourcesFileName.textContent = state.contractMeta?.name || state.contractFile?.name || "No contract uploaded";
  el.sourcesViewerMode.textContent = state.contractBlob ? "PDF Viewer" : state.contractMeta?.pages?.length ? "Text Evidence" : "Awaiting contract";
  el.sourceSignalClauseCount.textContent = allItems.length ? `${allItems.length} findings linked` : "Clause matches will appear here";
  el.sourceSignalPageRefs.textContent = citedPages.length ? `Pages ${citedPages.join(", ")}` : "Page references will appear here";
  el.sourceSignalConfidence.textContent = confidenceLabel;
  el.sourcesEvidenceCount.textContent = `${allItems.length} ${allItems.length === 1 ? "finding" : "findings"}`;
  if (el.sourcesSearchInput.value !== state.sourceSearch) el.sourcesSearchInput.value = state.sourceSearch;

  el.citationsPanel.innerHTML = items.length
    ? items
        .map((item) => {
          const jumpLabel = item.pageNumber ? `<button class="evidence-jump" type="button" data-page="${item.pageNumber}">Jump to Page ${item.pageNumber}</button>` : "";
          const confidenceBadge = item.confidence === "Report"
            ? `<span class="evidence-badge report">Report</span>`
            : `<span class="evidence-badge ${String(item.confidence || "").toLowerCase()}">${escapeHtml(item.confidence)}</span>`;
          const proof = item.proof || {};
          return `<article class="evidence-card">
            <div class="evidence-index">${String(item.order).padStart(2, "0")}</div>
            <div class="evidence-body">
              <div class="evidence-top">
                <div>
                  <h4 class="evidence-title">${escapeHtml(item.title)}</h4>
                  <div class="evidence-source">${escapeHtml(item.source)}</div>
                </div>
                ${confidenceBadge}
              </div>
              <div class="evidence-quote">"${escapeHtml(item.quote || "No excerpt returned.")}"</div>
              <div class="evidence-proof">
                <div class="evidence-proof-label">Proof</div>
                <div class="evidence-proof-grid">
                  <div class="evidence-proof-item"><span>Page</span><strong>${escapeHtml(proof.page || "Not cited")}</strong></div>
                  <div class="evidence-proof-item"><span>Article</span><strong>${escapeHtml(proof.article || "Not cited")}</strong></div>
                  <div class="evidence-proof-item"><span>Section</span><strong>${escapeHtml(proof.section || "Not cited")}</strong></div>
                </div>
              </div>
              <div class="evidence-label">Analysis</div>
              <p class="evidence-analysis">${escapeHtml(item.explanation || "No analysis returned.")}</p>
              ${jumpLabel}
            </div>
          </article>`;
        })
        .join("")
    : `<div class="evidence-empty">No evidence matches the current search. Try a different term or run a fresh analysis.</div>`;

  el.citationsPanel.querySelectorAll(".evidence-jump").forEach((node) => {
    node.addEventListener("click", () => jumpToPage(Number(node.dataset.page)));
  });

  loadPdfViewer().catch((error) => {
    el.sourcesViewerEmpty.style.display = "flex";
    el.sourcesViewerEmpty.innerHTML = `<div class="pdf-empty-icon">!</div><div><strong>Viewer unavailable</strong><div>${escapeHtml(error?.message || "The PDF could not be loaded.")}</div></div>`;
    el.sourcesCanvas.style.display = "none";
  });
}

function strategyStatusClass(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "neutral";
  if (["critical", "high", "yes", "likely"].includes(normalized)) return normalized;
  if (["possible", "moderate"].includes(normalized)) return normalized;
  if (["low", "no"].includes(normalized)) return normalized;
  return "neutral";
}

function strategySectionHtml(number, title, bodyHtml, statusText = "") {
  const status = statusText
    ? `<span class="strategy-status ${strategyStatusClass(statusText)}">${escapeHtml(statusText)}</span>`
    : "";
  return `<section class="strategy-section">
    <div class="strategy-section-head">
      <div class="strategy-section-title">${number}. ${escapeHtml(title)}</div>
      ${status}
    </div>
    <div class="strategy-section-body">${bodyHtml}</div>
  </section>`;
}

function strategyBulletList(items, emptyText) {
  if (!Array.isArray(items) || !items.length) {
    return `<div class="strategy-empty">${escapeHtml(emptyText)}</div>`;
  }
  return `<div class="strategy-bullets">${items
    .map(
      (item, index) => `<div class="strategy-bullet">
        <div class="strategy-bullet-dot">${String(index + 1).padStart(2, "0")}</div>
        <div class="strategy-bullet-copy">${escapeHtml(item)}</div>
      </div>`,
    )
    .join("")}</div>`;
}

function draftStrategyContentHtml(strategy) {
  if (!strategy) {
    return `<div class="draft-strategy-stack">
      <div class="strategy-empty">Generate the draft response to populate the claim strategy and mitigation workspace from the backend analysis.</div>
    </div>
    <aside class="strategy-aside">
      <section class="strategy-note-card strategy-note-dark">
        <div class="strategy-note-title">Commercial Context</div>
        <div class="strategy-note-copy">Run the draft generator to pull the repo-backed claim strategy, mitigation steps, and recommended path into this page.</div>
      </section>
    </aside>`;
  }

  const left = [
    strategySectionHtml(1, "What Changed", `<p class="strategy-copy">${escapeHtml(strategy.whatChanged || "Not specified.")}</p>`),
    strategySectionHtml(2, "Current Position", `<p class="strategy-copy">${escapeHtml(strategy.arcadisPosition || "Not specified.")}</p>`),
    strategySectionHtml(
      3,
      "Critical Path Impact",
      `<div class="strategy-callout"><div class="strategy-callout-icon">!</div><p class="strategy-copy">${escapeHtml(strategy.recommendedPath || "No critical path impact returned.")}</p></div>`,
      strategy.criticalPathImpact || "Not specified",
    ),
    strategySectionHtml(
      4,
      "Schedule Delay Risk",
      `<div class="strategy-callout"><div class="strategy-callout-icon">!</div><p class="strategy-copy">${escapeHtml(strategy.commercialContext || "No schedule delay context returned.")}</p></div>`,
      strategy.scheduleDelayRisk || "Not specified",
    ),
    strategySectionHtml(5, "Mitigation Strategy", strategyBulletList(strategy.mitigationSteps, "No mitigation steps were returned.")),
    strategySectionHtml(6, "Alternative Paths", strategyBulletList(strategy.alternativePaths, "No alternative paths were returned.")),
    `<section class="strategy-section strategy-primary">
      <div class="strategy-section-head">
        <div class="strategy-section-title">7. Recommended Path</div>
      </div>
      <div class="strategy-section-body">
        <p class="strategy-copy">${escapeHtml(strategy.recommendedPath || "No recommended path was returned.")}</p>
      </div>
    </section>`,
  ].join("");

  const reminders = Array.isArray(strategy.strategicReminders) && strategy.strategicReminders.length
    ? `<section class="strategy-note-card">
        <div class="strategy-note-title">Strategic Reminders</div>
        <div class="strategy-reminders">${strategy.strategicReminders
          .map(
            (item) => `<div class="strategy-reminder">
              <div class="strategy-reminder-dot">+</div>
              <div>${escapeHtml(item)}</div>
            </div>`,
          )
          .join("")}</div>
      </section>`
    : "";

  const right = `<aside class="strategy-aside">
    <section class="strategy-note-card strategy-note-dark">
      <div class="strategy-note-title">Commercial Context</div>
      <div class="strategy-note-copy">${escapeHtml(strategy.commercialContext || "No commercial context returned.")}</div>
    </section>
    ${reminders}
  </aside>`;

  return `<div class="draft-strategy-stack">${left}</div>${right}`;
}

function draftSidebarHtml(strategy) {
  const generatedLabel = state.draft?.updatedAt || state.lastAnalyzedAt
    ? formatDate(state.draft?.updatedAt || state.lastAnalyzedAt)
    : "Awaiting draft";
  const strategySummary = strategy?.recommendedPath || "Generate a draft to populate this review panel and strategy summary.";
  const whatChanged = strategy?.whatChanged || "Not specified";
  const position = strategy?.arcadisPosition || "Not specified";
  const pathImpact = strategy?.criticalPathImpact || "Not specified";
  const delayRisk = strategy?.scheduleDelayRisk || "Not specified";
  return `<div class="card">
      <div class="ct">About This Draft</div>
      <div class="mr"><span class="ml">Project</span><span class="mv">${escapeHtml(state.projectData.name || "Pending")}</span></div>
      <div class="mr"><span class="ml">Contract</span><span class="mv">${escapeHtml(state.projectData.contractNumber || "Pending")}</span></div>
      <div class="mr"><span class="ml">Change Request</span><span class="mv">${escapeHtml(state.projectData.changeRequestId || "Pending")}</span></div>
      <div class="mr"><span class="ml">Generated</span><span class="mv">${escapeHtml(generatedLabel)}</span></div>
      <div class="dv"></div>
      <p style="font-size:12px;color:var(--g400);line-height:1.6;">${escapeHtml(strategySummary)}</p>
    </div>
    <div class="card">
      <div class="ct">Strategy Signals</div>
      <div class="mr"><span class="ml">What changed</span><span class="mv">${escapeHtml(whatChanged)}</span></div>
      <div class="mr"><span class="ml">Current position</span><span class="mv">${escapeHtml(position)}</span></div>
      <div class="mr"><span class="ml">Critical path impact</span><span class="mv">${escapeHtml(pathImpact)}</span></div>
      <div class="mr"><span class="ml">Delay risk</span><span class="mv">${escapeHtml(delayRisk)}</span></div>
      <div class="dv"></div>
      <p style="font-size:12px;color:var(--g400);line-height:1.6;">${escapeHtml((strategy?.mitigationSteps || []).join(" • ") || strategy?.commercialContext || "No strategy notes returned.")}</p>
    </div>`;
}

function setDraftTab(tab) {
  state.draftTab = tab === "strategy" ? "strategy" : "draft";
  if (el.draftTabBtn) el.draftTabBtn.classList.toggle("on", state.draftTab === "draft");
  if (el.strategyTabBtn) el.strategyTabBtn.classList.toggle("on", state.draftTab === "strategy");
  if (el.draftPanel) el.draftPanel.classList.toggle("on", state.draftTab === "draft");
  if (el.strategyPanel) el.strategyPanel.classList.toggle("on", state.draftTab === "strategy");
}

function renderDraft() {
  el.draftTextarea.value = state.draftLoading
    ? "Generating the backend draft response..."
    : state.draft
      ? state.draft.letter || ""
      : "Generate the backend draft response to populate this workspace.";
  if (el.draftStrategyPanel) {
    el.draftStrategyPanel.innerHTML = draftStrategyContentHtml(state.draft?.strategy);
  }
  if (el.draftSidebar) {
    el.draftSidebar.innerHTML = draftSidebarHtml(state.draft?.strategy);
  }
  setDraftTab(state.draftTab);
}

function renderAll() {
  renderWorkspaceChrome();
  renderIntake();
  renderSummary();
  renderReport();
  renderSources();
  renderDraft();
}

function resetAppState(clearProjectData = true) {
  if (state.contractObjectUrl) {
    URL.revokeObjectURL(state.contractObjectUrl);
  }
  state.contractObjectUrl = "";
  state.contractFile = null;
  state.contractBlob = null;
  state.correspondenceFile = null;
  state.contractMeta = null;
  state.correspondenceMeta = null;
  state.analysis = null;
  state.citations = [];
  state.report = null;
  state.draft = null;
  state.draftTab = "draft";
  state.lastAnalyzedAt = "";
  state.sourceSearch = "";
  state.loading = false;
  state.reportLoading = false;
  state.draftLoading = false;
  sourceViewer.pdfDoc = null;
  sourceViewer.currentPage = 1;
  sourceViewer.totalPages = 0;
  sourceViewer.zoom = 1;
  sourceViewer.documentKey = "";
  sourceViewer.thumbRenderToken += 1;
  if (clearProjectData) {
    state.projectData = { name: "", contractNumber: "", changeRequestId: "" };
    setProjectFields();
  }
  if (el.contractInput) el.contractInput.value = "";
  if (el.correspondenceInput) el.correspondenceInput.value = "";
  if (el.sourcesSearchInput) el.sourcesSearchInput.value = "";
  clearPersistedState();
  clearCurrentThread().catch(() => {});
  renderAll();
}

function setLoading(loading, button, loadingText) {
  state.loading = loading;
  if (button) {
    button.disabled = loading;
    button.dataset.baseText = button.dataset.baseText || button.textContent;
    button.textContent = loading ? loadingText : button.dataset.baseText;
    button.style.opacity = loading ? ".75" : "1";
    button.style.cursor = loading ? "progress" : "pointer";
  }
  renderIntake();
}

function updateNavForScreen(id) {
  const index = navMap[id];
  document.querySelectorAll(".ni").forEach((n) => n.classList.remove("on"));
  if (document.querySelectorAll(".ni")[index]) document.querySelectorAll(".ni")[index].classList.add("on");
}

async function analyzeDocuments() {
  if (!state.contractFile || !state.correspondenceFile) {
    setStatus("Both files are required before analysis can run.", "error");
    return;
  }
  syncProjectData();
  const formData = new FormData();
  formData.append("contract", state.contractFile);
  formData.append("correspondence", state.correspondenceFile);
  formData.append("projectName", state.projectData.name);
  formData.append("contractNumber", state.projectData.contractNumber);
  formData.append("changeRequestId", state.projectData.changeRequestId);
  setLoading(true, el.analyzeBtn, "Analyzing...");
  setStatus("Uploading files and requesting live analysis...", "neutral");
  try {
    const contractBuffer = state.contractFile?.type?.includes("pdf") ? await state.contractFile.arrayBuffer() : null;
    const res = await fetch("/api/analyze", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Analysis failed.");
    state.analysis = data.analysis || null;
    state.projectData = data.projectData || state.projectData;
    state.citations = Array.isArray(data.citations) ? data.citations : [];
    state.contractMeta = data.contract || state.contractMeta;
    state.correspondenceMeta = data.correspondence || state.correspondenceMeta;
    state.report = null;
    state.draft = null;
    state.contractBlob = cloneArrayBuffer(contractBuffer);
    state.lastAnalyzedAt = new Date().toISOString();
    sourceViewer.currentPage = 1;
    sourceViewer.zoom = 1;
    syncContractObjectUrl();
    saveState();
    await saveCurrentThread();
    setProjectFields();
    renderAll();
    fetch("/api/save-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis: state.analysis, projectData: state.projectData }),
    }).catch(() => {});
    go("s2", document.querySelectorAll(".ni")[1]);
  } catch (error) {
    setStatus(error.message || "Analysis failed.", "error");
  } finally {
    setLoading(false, el.analyzeBtn, "Analyzing...");
  }
}

async function generateReport(options = {}) {
  const { keepScreen = false, silent = false } = options;
  if (!state.analysis) {
    if (!keepScreen) go("s1", document.querySelectorAll(".ni")[0]);
    if (!silent) setStatus("Run analysis first so the report has source material.", "error");
    return null;
  }
  if (state.reportLoading && reportRequest) return reportRequest;
  if (state.reportLoading) return state.report;
  state.reportLoading = true;
  renderReport();
  setLoading(true, el.generateReportBtn, "Generating report...");
  reportRequest = (async () => {
    const res = await fetch("/api/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis: state.analysis, projectData: state.projectData, citations: state.citations }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Report generation failed.");
    state.report = data.report || null;
    saveState();
    await saveCurrentThread();
    renderReport();
    if (!keepScreen) go("s3", document.querySelectorAll(".ni")[2]);
    return state.report;
  })();
  try {
    return await reportRequest;
  } catch (error) {
    if (!silent) alert(error.message || "Report generation failed.");
    return null;
  } finally {
    reportRequest = null;
    state.reportLoading = false;
    renderReport();
    setLoading(false, el.generateReportBtn, "Generating report...");
  }
}

async function generateDraft() {
  if (!state.analysis) {
    go("s1", document.querySelectorAll(".ni")[0]);
    setStatus("Run analysis first so the draft has source material.", "error");
    return;
  }
  if (state.draftLoading) return;
  state.draftLoading = true;
  renderDraft();
  setLoading(true, el.regenerateDraftBtn, "Generating draft...");
  try {
    const res = await fetch("/api/generate-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis: state.analysis, projectData: state.projectData, citations: state.citations, report: state.report }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Draft generation failed.");
    state.draft = data.draft || null;
    saveState();
    await saveCurrentThread();
    renderDraft();
    go("s5", document.querySelectorAll(".ni")[4]);
  } catch (error) {
    alert(error.message || "Draft generation failed.");
  } finally {
    state.draftLoading = false;
    renderDraft();
    setLoading(false, el.regenerateDraftBtn, "Generating draft...");
  }
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function exportReportPdf() {
  if (!state.analysis) {
    go("s1", document.querySelectorAll(".ni")[0]);
    setStatus("Run analysis first so the report can be exported.", "error");
    return;
  }
  const button = el.exportReportBtn;
  button.dataset.baseText = button.dataset.baseText || button.textContent;
  button.disabled = true;
  button.textContent = state.report ? "Exporting..." : "Preparing PDF...";

  try {
    if (state.reportLoading && reportRequest) {
      button.textContent = "Waiting for report...";
      await reportRequest;
    }
    if (!state.report) {
      const report = await generateReport({ keepScreen: true, silent: true });
      if (!report) throw new Error("The report could not be generated for export.");
    }
    button.textContent = "Building PDF...";
    await import("/node_modules/jspdf/dist/jspdf.umd.min.js");
    const jsPDF = window.jspdf?.jsPDF;
    if (!jsPDF) throw new Error("jsPDF failed to load.");
    const report = state.report || {};
    const metadata = report.metadata || {};
    const sections = report.sections || {};
    const pdf = new jsPDF("p", "pt", "letter");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    const usableWidth = pageWidth - margin * 2;
    const lineHeight = 16;
    let y = margin;

    const ensureSpace = (needed = lineHeight) => {
      if (y + needed <= pageHeight - margin) return;
      pdf.addPage();
      y = margin;
    };
    const writeLine = (text, options = {}) => {
      const { size = 11, weight = "normal", color = [31, 41, 55] } = options;
      ensureSpace(lineHeight);
      pdf.setFont("helvetica", weight);
      pdf.setFontSize(size);
      pdf.setTextColor(color[0], color[1], color[2]);
      pdf.text(String(text || ""), margin, y);
      y += lineHeight;
    };
    const writeParagraph = (text, options = {}) => {
      const { size = 11, weight = "normal", color = [55, 65, 81], spacing = 6 } = options;
      const normalized = String(text || "").replace(/\*\*/g, "").replace(/\r/g, "");
      const pieces = normalized.split("\n").filter((part) => part.trim());
      if (!pieces.length) {
        y += spacing;
        return;
      }
      pdf.setFont("helvetica", weight);
      pdf.setFontSize(size);
      pdf.setTextColor(color[0], color[1], color[2]);
      for (const piece of pieces) {
        const lines = pdf.splitTextToSize(piece.trim(), usableWidth);
        ensureSpace(lines.length * lineHeight + spacing);
        pdf.text(lines, margin, y);
        y += lines.length * lineHeight;
        y += spacing;
      }
    };
    const writeSection = (index, title, body) => {
      ensureSpace(lineHeight * 2);
      writeLine(`${String(index).padStart(2, "0")}  ${title}`, { size: 13, weight: "bold", color: [17, 24, 39] });
      writeParagraph(body);
      y += 4;
    };

    writeLine("Never Sign Blind", { size: 10, weight: "bold", color: [202, 118, 60] });
    writeLine(report.title || "Change Order Analysis Report", { size: 18, weight: "bold", color: [17, 24, 39] });
    writeParagraph(
      [
        metadata.projectName || state.projectData.name || "Project pending",
        metadata.contractNumber || state.projectData.contractNumber || "Contract pending",
        metadata.changeRequestId || state.projectData.changeRequestId || "Change request pending",
        `Owner: ${metadata.ownerClient || "Not specified"}`,
      ].join(" | "),
      { size: 10, color: [75, 85, 99], spacing: 10 },
    );
    writeParagraph(
      `Status: ${metadata.reportStatus || "Draft"} | Analyzed: ${formatDate(metadata.dateOfAnalysis || report.updatedAt || state.lastAnalyzedAt)}`,
      { size: 10, color: [75, 85, 99], spacing: 14 },
    );

    writeSection(1, "Executive Summary", sections.executiveSummary?.content || "No executive summary returned.");
    writeSection(2, "Owner / Client Request", sections.ownerRequest?.content || "No request summary returned.");
    writeSection(
      3,
      "Position Assessment",
      [
        `Scope Status: ${sections.arcadisPosition?.scopeStatus || "Unclear"}`,
        `Responsibility: ${sections.arcadisPosition?.responsibility || "Unclear"}`,
        `Fee Position: ${sections.arcadisPosition?.feePosition || "Unclear"}`,
        `Time Position: ${sections.arcadisPosition?.timePosition || "Unclear"}`,
        "",
        sections.arcadisPosition?.explanation || "",
      ].join("\n"),
    );
    const clauseText = Array.isArray(sections.keyContractClauses) && sections.keyContractClauses.length
      ? sections.keyContractClauses
          .map(
            (clause, index) =>
              [
                `${index + 1}. ${clause.reference || "Clause"}`,
                clause.excerpt || "",
                `Why it matters: ${clause.whyItMatters || clause.meaning || "Not provided."}`,
              ].join("\n"),
          )
          .join("\n\n")
      : "No clause summary returned.";
    writeSection(4, "Key Contract Clauses", clauseText);
    writeSection(5, "Application", sections.application?.content || "No application analysis returned.");
    writeSection(6, "Commercial Analysis", sections.commercialAnalysis?.content || "No commercial analysis returned.");
    writeSection(
      7,
      "Schedule Impact",
      [
        `Critical Path Impact: ${sections.scheduleImpact?.criticalPathImpact || "Not enough information"}`,
        `Delay Risk: ${sections.scheduleImpact?.delayRiskLevel || "Unclear"}`,
        "",
        sections.scheduleImpact?.explanation || "",
      ].join("\n"),
    );
    writeSection(
      8,
      "Notice Requirements",
      [
        `Notice Required: ${sections.noticeRequirements?.noticeRequired || "Unclear"}`,
        `Deadline: ${sections.noticeRequirements?.deadline || "Not specified"}`,
        `Recipient: ${sections.noticeRequirements?.recipient || "Not specified"}`,
        "",
        sections.noticeRequirements?.riskIfMissed || "",
      ].join("\n"),
    );
    writeSection(9, "Risk and Mitigation", sections.riskAndMitigation?.content || "No mitigation analysis returned.");
    writeSection(10, "Recommendation", sections.recommendation?.content || "No recommendation returned.");
    writeSection(11, "Draft Response", sections.draftResponse?.content || "No draft response returned.");
    writeSection(12, "Source Snapshot", sections.sourceSnapshot?.content || "No source snapshot returned.");

    ensureSpace(lineHeight * 2);
    pdf.setDrawColor(229, 231, 235);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 14;
    writeLine("Never Sign Blind - Confidential | Backend-generated analysis", { size: 9, color: [107, 114, 128] });
    writeLine(`Updated ${formatDate(report.updatedAt || state.lastAnalyzedAt)}`, { size: 9, color: [107, 114, 128] });

    const safeProject = (state.projectData.name || "analysis-report").replace(/[^\w\-]+/g, "-");
    const filename = `${safeProject}-report.pdf`;
    button.textContent = "Downloading...";
    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    alert(`PDF export failed: ${error.message || error}`);
  } finally {
    button.disabled = false;
    button.textContent = button.dataset.baseText;
  }
}

async function bindFile(kind, file) {
  if (!file) return;
  const meta = { name: file.name, metadata: { mimeType: file.type, fileSize: file.size, uploadedAt: new Date().toISOString() } };
  if (kind === "contract") {
    state.contractFile = file;
    state.contractMeta = meta;
    state.contractBlob = file.type.includes("pdf") ? cloneArrayBuffer(await file.arrayBuffer()) : null;
    syncContractObjectUrl();
  } else {
    state.correspondenceFile = file;
    state.correspondenceMeta = meta;
  }
  state.analysis = null;
  state.report = null;
  state.draft = null;
  state.draftTab = "draft";
  state.citations = [];
  state.lastAnalyzedAt = "";
  sourceViewer.currentPage = 1;
  sourceViewer.zoom = 1;
  saveState();
  renderAll();
}

function maybeGenerateDependentContent(targetScreen) {
  if (targetScreen === "s3" && !state.report && state.analysis) {
    generateReport({ keepScreen: true, silent: true });
    return;
  }
  if (targetScreen === "s5" && !state.draft && state.analysis) {
    generateDraft();
  }
}

function initNavigation() {
  document.querySelectorAll(".ni").forEach((node, index) => {
    const screenId = `s${index + 1}`;
    node.addEventListener("click", (event) => {
      event.preventDefault();
      if (screenId === "s1") {
        resetAppState(true);
      }
      updateNavForScreen(screenId);
      go(screenId, node);
      maybeGenerateDependentContent(screenId);
    });
  });
}

function initEvents() {
  setProjectFields();
  [el.projectNameInput, el.contractNumberInput, el.changeRequestInput].forEach((input) => input.addEventListener("input", syncProjectData));
  el.contractCard.addEventListener("click", () => el.contractInput.click());
  el.correspondenceCard.addEventListener("click", () => el.correspondenceInput.click());
  el.contractInput.addEventListener("change", async (event) => bindFile("contract", event.target.files?.[0]));
  el.correspondenceInput.addEventListener("change", async (event) => bindFile("correspondence", event.target.files?.[0]));
  el.analyzeBtn.addEventListener("click", analyzeDocuments);
  el.generateReportBtn.addEventListener("click", generateReport);
  el.regenerateReportBtn.addEventListener("click", generateReport);
  el.regenerateDraftBtn.addEventListener("click", generateDraft);
  el.exportReportBtn.addEventListener("click", exportReportPdf);
  el.exportDraftBtn.addEventListener("click", () => downloadText("nsb-draft-response.txt", el.draftTextarea.value || "No draft generated."));
  el.draftTabBtn?.addEventListener("click", () => {
    setDraftTab("draft");
    saveState();
  });
  el.strategyTabBtn?.addEventListener("click", () => {
    setDraftTab("strategy");
    saveState();
  });
  el.openDocumentBtn.addEventListener("click", () => {
    if (state.contractObjectUrl) window.open(state.contractObjectUrl, "_blank", "noopener");
    else alert("Upload and analyze a contract PDF to open it in a new tab.");
  });
  el.viewerPrevBtn.addEventListener("click", () => jumpToPage(sourceViewer.currentPage - 1));
  el.viewerNextBtn.addEventListener("click", () => jumpToPage(sourceViewer.currentPage + 1));
  el.viewerZoomOutBtn.addEventListener("click", () => {
    sourceViewer.zoom = Math.max(0.65, sourceViewer.zoom - 0.15);
    renderPdfPage(sourceViewer.currentPage).catch(() => {});
  });
  el.viewerZoomInBtn.addEventListener("click", () => {
    sourceViewer.zoom = Math.min(2.25, sourceViewer.zoom + 0.15);
    renderPdfPage(sourceViewer.currentPage).catch(() => {});
  });
  el.sourcesSearchInput.addEventListener("input", (event) => {
    state.sourceSearch = event.target.value || "";
    renderSources();
  });
  el.saveDraftBtn.addEventListener("click", () => {
    state.draft = state.draft || { letter: "", strategy: null, updatedAt: new Date().toISOString() };
    state.draft.letter = el.draftTextarea.value;
    state.draft.updatedAt = new Date().toISOString();
    saveState();
    saveCurrentThread().catch(() => {});
    renderDraft();
  });
  el.copyDraftBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(el.draftTextarea.value);
    } catch {
      alert("Clipboard copy was blocked by the browser.");
    }
  });
  el.draftTextarea.addEventListener("input", () => {
    if (state.draft) {
      state.draft.letter = el.draftTextarea.value;
      state.draft.updatedAt = new Date().toISOString();
      saveState();
      saveCurrentThread().catch(() => {});
    }
  });
  document.querySelectorAll("[onclick]").forEach((node) => {
    if (node.getAttribute("onclick")?.includes("go('s1'")) {
      node.addEventListener("click", () => {
        resetAppState(true);
        updateNavForScreen("s1");
      });
    }
  });
}

(async function init() {
  loadLocalState();
  await hydrateFromThread();
  initNavigation();
  initEvents();
  setProjectFields();
  renderAll();
})();
