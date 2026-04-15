import type { Config } from "@netlify/functions";
import { readStore } from "./_shared/store.js";

export default async (_req: Request) => {
  try {
    const data = await readStore();
    return Response.json(data ?? {});
  } catch {
    return Response.json({});
  }
};

export const config: Config = { path: "/api/store" };
