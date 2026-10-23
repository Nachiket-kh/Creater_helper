import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const directory = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(directory, 'data', 'db.json');
let snapshot;
export async function readDB() {
  if (!snapshot) snapshot = JSON.parse(await readFile(file, 'utf8'));
  return snapshot;
}
export async function writeDB(data) {
  snapshot = data;
  if (!process.env.VERCEL) await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}
