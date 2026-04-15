import { getStore } from "@netlify/blobs";

const STORE_NAME = "nsb-analysis";
const STORE_KEY  = "current";

export async function readStore(): Promise<any> {
  try {
    const store = getStore({ name: STORE_NAME, consistency: "strong" });
    return await store.get(STORE_KEY, { type: "json" }) ?? {};
  } catch {
    return {};
  }
}

export async function writeStore(data: any): Promise<void> {
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  await store.setJSON(STORE_KEY, data);
}
