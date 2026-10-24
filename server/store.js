import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createSupabaseStore } from "./supabase-store.js";

const here = dirname(fileURLToPath(import.meta.url));
export const databasePath = resolve(process.env.COLLABDESK_DB_PATH || resolve(here, "data/db.json"));
const databaseProvider = process.env.DATABASE_PROVIDER || "file";
const useEphemeralDemoStore = process.env.VERCEL === "1" && databaseProvider === "file";
let writeQueue = Promise.resolve();
let ephemeralDemoState;

if (!["file", "supabase"].includes(databaseProvider)) {
  throw new Error("DATABASE_PROVIDER must be either 'file' or 'supabase'.");
}

const supabaseStore = databaseProvider === "supabase"
  ? createSupabaseStore({
      url: process.env.SUPABASE_URL,
      secretKey: process.env.SUPABASE_SECRET_KEY,
      seedProvider: async () => JSON.parse(await readFile(databasePath, "utf8")),
    })
  : null;

// Deliberately load from disk for each operation so edits are visible immediately.
export async function readStore() {
  if (supabaseStore) return supabaseStore.read();
  if (useEphemeralDemoStore) {
    ephemeralDemoState ||= JSON.parse(await readFile(databasePath, "utf8"));
    return structuredClone(ephemeralDemoState);
  }
  return JSON.parse(await readFile(databasePath, "utf8"));
}

export async function writeStore(data, expectedRevision) {
  if (supabaseStore) return supabaseStore.write(data, expectedRevision);
  // Vercel's bundled function files are read-only. Keep walkthrough changes
  // in memory so sample parsing and reply drafting work without a database.
  if (useEphemeralDemoStore) {
    ephemeralDemoState = structuredClone(data);
    return true;
  }
  const temporaryPath = `${databasePath}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    await rename(temporaryPath, databasePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

// Keep read/modify/write operations ordered within this process so two requests
// cannot silently overwrite one another's updates.
export function updateStore(mutator) {
  if (supabaseStore) return supabaseStore.update(mutator);
  const operation = writeQueue.then(async () => {
    const data = await readStore();
    const result = await mutator(data);
    await writeStore(data);
    return result;
  });
  writeQueue = operation.catch(() => {});
  return operation;
}
