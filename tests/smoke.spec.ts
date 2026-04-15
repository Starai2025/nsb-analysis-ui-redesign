import { expect, test } from "@playwright/test";
import path from "path";

const contractDoc = path.resolve(
  "C:/Users/StarrButts/Downloads/NSB analysis ui redesign for chatgpt/Never-Sign-Blind-Analysis-App/node_modules/mammoth/test/test-data/comments.docx",
);
const correspondenceDoc = path.resolve(
  "C:/Users/StarrButts/Downloads/NSB analysis ui redesign for chatgpt/Never-Sign-Blind-Analysis-App/node_modules/mammoth/test/test-data/endnotes.docx",
);
const sourcesPdf = path.resolve(
  "C:/Users/StarrButts/Downloads/NSB analysis ui redesign for chatgpt/Never-Sign-Blind-Analysis-App/tests/fixtures-sources-sample.pdf",
);

test("startup is blank and end-to-end smoke flow works", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#sidebarProjectName")).toHaveText("No active analysis");
  await expect(page.locator("#topbarProjectChip")).toContainText("No active project");
  await expect(page.locator("#topbarChangeChip")).toHaveText("No change request");
  await expect(page.locator("#topbarCitationChip")).toHaveText("No citations yet");
  await expect(page.locator("#analyzeBtn")).toBeDisabled();

  await page.locator("#projectNameInput").fill("Smoke Test Project");
  await page.locator("#contractNumberInput").fill("SMK-001");
  await page.locator("#changeRequestInput").fill("PCR-001");
  await page.locator("#contractInput").setInputFiles(contractDoc);
  await page.locator("#correspondenceInput").setInputFiles(correspondenceDoc);

  await expect(page.locator("#analyzeBtn")).toBeEnabled();
  await page.locator("#analyzeBtn").click();

  await expect(page.locator("#crumb")).toHaveText("Decision Summary", { timeout: 90_000 });
  await expect(page.locator("#summaryCaseTitle")).toContainText("Smoke Test Project");
  await expect(page.locator("#summaryText")).not.toContainText("Once the contract and correspondence are analyzed");

  await page.locator(".ni").nth(2).click();
  await expect(page.locator("#crumb")).toHaveText("Report");
  await expect(page.locator("#reportStatusChip")).toContainText("Draft", { timeout: 120_000 });
  await expect(page.locator("#reportCard")).toContainText("Smoke Test Project", { timeout: 90_000 });
  const downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
  await page.locator("#exportReportBtn").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Smoke-Test-Project-report.pdf");

  await page.locator(".ni").nth(3).click();
  await expect(page.locator("#crumb")).toHaveText("Sources");
  await expect(page.locator("#citationsPanel")).toBeVisible();

  await page.locator(".ni").nth(4).click();
  await expect(page.locator("#crumb")).toHaveText("Draft Response");
  await expect(page.locator("#draftTextarea")).not.toHaveValue("Generate the backend draft response to populate this workspace.", {
    timeout: 90_000,
  });
  await page.locator("#strategyTabBtn").click();
  await expect(page.locator("#strategyPanel")).toBeVisible();
  await expect(page.locator("#draftStrategyPanel")).toContainText("Mitigation Strategy", { timeout: 90_000 });
  await expect(page.locator("#draftStrategyPanel")).toContainText("Recommended Path", { timeout: 90_000 });

  await page.locator(".ni").nth(0).click();
  await expect(page.locator("#crumb")).toHaveText("New Analysis");
  await expect(page.locator("#sidebarProjectName")).toHaveText("No active analysis");
  await expect(page.locator("#projectNameInput")).toHaveValue("");
  await expect(page.locator("#contractInput")).toHaveValue("");
  await expect(page.locator("#correspondenceInput")).toHaveValue("");
});

test("sources page renders a live PDF viewer for uploaded PDFs", async ({ page }) => {
  await page.goto("/");

  await page.locator("#projectNameInput").fill("Sources Test Project");
  await page.locator("#contractNumberInput").fill("SRC-001");
  await page.locator("#changeRequestInput").fill("PCR-SRC");
  await page.locator("#contractInput").setInputFiles(sourcesPdf);
  await page.locator("#correspondenceInput").setInputFiles(correspondenceDoc);

  await page.locator("#analyzeBtn").click();
  await expect(page.locator("#crumb")).toHaveText("Decision Summary", { timeout: 90_000 });

  await page.locator(".ni").nth(3).click();
  await expect(page.locator("#crumb")).toHaveText("Sources");
  await expect(page.locator("#sourcesFileName")).toContainText("fixtures-sources-sample.pdf", { timeout: 60_000 });
  await expect(page.locator("#sourcesViewerMode")).toHaveText("PDF Viewer", { timeout: 60_000 });
  await expect(page.locator("#viewerCurrentPage")).toHaveText("1", { timeout: 60_000 });
  await expect(page.locator("#viewerTotalPages")).toHaveText("1", { timeout: 60_000 });
  await expect(page.locator("#sourcesCanvas")).toBeVisible({ timeout: 60_000 });
  await expect(page.locator(".thumb-item")).toHaveCount(1, { timeout: 60_000 });
});
