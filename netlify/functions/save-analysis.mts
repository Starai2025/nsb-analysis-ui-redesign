import type { Config } from "@netlify/functions";
import { readStore, writeStore } from "./_shared/store.js";

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const body = await req.json();
    const existing = await readStore();
    const updated  = { ...existing };

    if (body.analysis)    updated.analysis    = body.analysis;
    if (body.projectData) updated.projectData = body.projectData;

    await writeStore(updated);
    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: "Failed to save analysis." }, { status: 500 });
  }
};

export const config: Config = { path: "/api/save-analysis" };
