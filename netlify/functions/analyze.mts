import type { Config } from "@netlify/functions";
import { ingestDocument } from "./_shared/ingestion.js";
import { runAnalysis, extractCitations, buildDocumentContent } from "./_shared/claude.js";
import { writeStore } from "./_shared/store.js";

const SUPPORTED = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const formData      = await req.formData();
    const contractFile  = formData.get("contract")       as File | null;
    const corrFile      = formData.get("correspondence") as File | null;

    if (!contractFile || !corrFile) {
      return Response.json({ error: "Both 'contract' and 'correspondence' files are required." }, { status: 400 });
    }
    if (!SUPPORTED.includes(contractFile.type)) {
      return Response.json({ error: `Unsupported contract type: ${contractFile.type}` }, { status: 400 });
    }
    if (!SUPPORTED.includes(corrFile.type)) {
      return Response.json({ error: `Unsupported correspondence type: ${corrFile.type}` }, { status: 400 });
    }

    const projectName     = formData.get("projectName")     as string ?? "";
    const contractNumber  = formData.get("contractNumber")  as string ?? "";
    const changeRequestId = formData.get("changeRequestId") as string ?? "";

    const contractBuffer = Buffer.from(await contractFile.arrayBuffer());
    const corrBuffer     = Buffer.from(await corrFile.arrayBuffer());

    console.log(`Ingesting: "${contractFile.name}" + "${corrFile.name}"`);

    const [contractDoc, correspondenceDoc] = await Promise.all([
      ingestDocument(contractBuffer, contractFile.type, contractFile.name, "contract",       contractFile.size),
      ingestDocument(corrBuffer,     corrFile.type,     corrFile.name,     "correspondence", corrFile.size),
    ]);

    console.log("Running Claude analysis...");
    const analysis = await runAnalysis(
      contractBuffer, contractFile.type, contractDoc,
      corrBuffer,     corrFile.type,     correspondenceDoc,
    );

    console.log("Extracting citations...");
    const citations = await extractCitations(analysis, contractDoc);
    console.log(`${citations.length} citation(s) extracted`);

    const projectData = { name: projectName, contractNumber, changeRequestId };

    // Save to Netlify Blobs (backup store — client uses IndexedDB as primary)
    const contractDocMeta  = { ...contractDoc,       pages: undefined, chunks: undefined };
    const corrDocMeta      = { ...correspondenceDoc, pages: undefined, chunks: undefined };
    await writeStore({ analysis, projectData, contract: contractDocMeta, correspondence: corrDocMeta });

    return Response.json({
      success: true,
      analysis,
      projectData,
      citations,
      contract:       contractDoc,
      correspondence: correspondenceDoc,
    });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : "Analysis failed.";
    console.error("Analysis error:", message);
    const status = message.includes("timed out") ? 504 : message.includes("API_KEY") ? 500 : 500;
    return Response.json({ error: message }, { status });
  }
};

export const config: Config = { path: "/api/analyze" };
