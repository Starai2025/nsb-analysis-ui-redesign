import type { Config } from "@netlify/functions";
import { generateReport } from "./_shared/claude.js";
import { readStore, writeStore } from "./_shared/store.js";

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const stored = await readStore();

    if (!stored?.analysis) {
      return Response.json({ error: "No analysis found. Run an analysis first." }, { status: 400 });
    }

    console.log("Generating report...");
    const raw = await generateReport(stored.analysis, stored.projectData ?? {});
    const now = new Date().toISOString();

    const report = {
      id:        `report-${Date.now()}`,
      threadId:  "current",
      createdAt: now,
      updatedAt: now,
      title:     raw.title,
      sections:  raw.sections,
    };

    // Persist report to store alongside analysis
    await writeStore({ ...stored, report });

    console.log("Report generated.");
    return Response.json({ success: true, report });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : "Report generation failed.";
    console.error("Report error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
};

export const config: Config = { path: "/api/generate-report" };
