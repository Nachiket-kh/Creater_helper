import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const directory = await mkdtemp(join(tmpdir(), "collabdesk-test-"));
const testDatabasePath = join(directory, "db.json");
const seed = await readFile(new URL("../server/data/db.json", import.meta.url), "utf8");
await writeFile(testDatabasePath, seed);
process.env.COLLABDESK_DB_PATH = testDatabasePath;
process.env.DATABASE_PROVIDER = "file";
delete process.env.OPENAI_API_KEY;
const { app } = await import("../server/index.js");
const { quote } = await import("../server/rate.js");

after(async () => {
  await rm(directory, { recursive: true, force: true });
});

async function json(path, method = "GET", body) {
  const response = await app.request(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, payload: await response.json() };
}

test("API health, creator profile validation, and persistence", async () => {
  assert.deepEqual((await json("/api/health")).payload, { ok: true });
  const before = (await json("/api/creator")).payload;
  const valid = await json("/api/creator", "PUT", {
    niche: "Pune food",
    followers: 50000,
    rates: { reel: 16000, post: 9000, stories: 4500 },
  });
  assert.equal(valid.response.status, 200);
  assert.equal(valid.payload.rates.reel, 16000);
  const invalid = await json("/api/creator", "PUT", {
    niche: " ", followers: -1, rates: { reel: 0, post: 9000, stories: 4500 },
  });
  assert.equal(invalid.response.status, 400);
  const stored = JSON.parse(await readFile(testDatabasePath, "utf8"));
  assert.equal(stored.creator.rates.reel, 16000);
  assert.notEqual(stored.creator.rates.reel, before.rates.reel);
});

test("deal listing, status updates, and missing-deal errors", async () => {
  const listing = await json("/api/deals");
  assert.equal(listing.response.status, 200);
  assert.ok(listing.payload.deals.length >= 3);
  const changed = await json("/api/deals/d-seed-skincare", "PATCH", { status: "negotiating" });
  assert.equal(changed.response.status, 200);
  assert.equal(changed.payload.status, "negotiating");
  assert.equal((await json("/api/deals/d-seed-skincare", "PATCH", { status: "unknown" })).response.status, 400);
  assert.equal((await json("/api/deals/missing", "PATCH", { status: "paid" })).response.status, 404);
});

test("email parsing uses the offline fallback and writes a unique deal", async () => {
  const request = { rawEmail: "Subject: Café Ramwadi offer. Budget ₹8,000 for one reel this week." };
  const [one, two] = await Promise.all([
    json("/api/inbox/parse", "POST", request),
    json("/api/inbox/parse", "POST", request),
  ]);
  assert.equal(one.response.status, 201);
  assert.equal(two.response.status, 201);
  assert.equal(one.payload.source, "fallback");
  assert.notEqual(one.payload.deal.id, two.payload.deal.id);
  const stored = JSON.parse(await readFile(testDatabasePath, "utf8"));
  assert.equal(stored.deals.filter((deal) => deal.id === one.payload.deal.id || deal.id === two.payload.deal.id).length, 2);
  assert.equal((await json("/api/inbox/parse", "POST", { rawEmail: " " })).response.status, 400);
});

test("reply drafting, rates, content insights, and daily actions work", async () => {
  const reply = await json("/api/deals/d-seed-bakery/reply", "POST", { intent: "counter" });
  assert.equal(reply.response.status, 200);
  assert.equal(reply.payload.source, "fallback");
  assert.match(reply.payload.body, /₹16,000/);
  assert.equal((await json("/api/deals/d-seed-bakery/rate", "POST")).payload.suggestedInr, 16000);
  const content = await json("/api/content");
  assert.equal(content.response.status, 200);
  assert.equal(content.payload.averages.food, 78000);
  assert.equal(content.payload.averages.beauty, 11000);
  assert.match(content.payload.insight, /Food posts average 78,000 reach, compared with 11,000 for beauty posts/);
  assert.doesNotMatch(content.payload.insight, /commute/i);
  assert.equal((await json("/api/today")).response.status, 200);
  assert.equal((await json("/api/deals/d-seed-bakery/reply", "POST", { intent: "send" })).response.status, 400);
});

test("reel script starter supports all advertised durations with contiguous scene timings", async () => {
  for (const duration of [15, 30, 45, 60]) {
    const result = await json("/api/content/reel-script", "POST", { topic: "Cafe breakfast", duration, goal: "saves" });
    assert.equal(result.response.status, 200);
    assert.equal(result.payload.source, "starter");
    assert.equal(result.payload.hooks.length, 3);
    assert.equal(result.payload.scenes.length, 4);
    const intervals = result.payload.scenes.map(({ seconds }) => seconds.match(/^(\d+)–(\d+)s$/).slice(1).map(Number));
    assert.equal(intervals[0][0], 0);
    assert.equal(intervals.at(-1)[1], duration);
    for (let index = 0; index < intervals.length; index += 1) {
      assert.ok(intervals[index][1] > intervals[index][0]);
      if (index > 0) assert.equal(intervals[index][0], intervals[index - 1][1]);
    }
  }
  assert.equal((await json("/api/content/reel-script", "POST", { topic: "x", duration: 10 })).response.status, 400);
});

test("desk assistant answers with grounded workspace data and validates questions", async () => {
  const response = await app.request("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": "192.0.2.33" },
    body: JSON.stringify({ question: "What content performs best?", page: "content" }),
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.source, "workspace");
  assert.match(payload.answer, /reach/i);
  assert.ok(Array.isArray(payload.suggestions));
  const empty = await app.request("/api/assistant", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: " " }),
  });
  assert.equal(empty.status, 400);
  const oversized = await app.request("/api/assistant", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: "x".repeat(501) }),
  });
  assert.equal(oversized.status, 413);
  let limited;
  for (let index = 0; index < 9; index += 1) {
    limited = await app.request("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "192.0.2.44" },
      body: JSON.stringify({ question: "What should I follow up on?" }),
    });
  }
  assert.equal(limited.status, 429);
});

test("malformed, oversized, and disallowed-origin requests are handled safely", async () => {
  const malformed = await app.request("/api/inbox/parse", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{bad json",
  });
  assert.equal(malformed.status, 400);
  const oversized = await app.request("/api/inbox/parse", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawEmail: "x".repeat(17_000) }),
  });
  assert.equal(oversized.status, 413);
  const emailLimit = await app.request("/api/inbox/parse", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawEmail: "x".repeat(10_001) }),
  });
  assert.equal(emailLimit.status, 413);
  const deniedOrigin = await app.request("/api/creator", { headers: { Origin: "https://untrusted.example" } });
  assert.equal(deniedOrigin.headers.get("access-control-allow-origin"), null);
});

test("extended usage raises the suggested rate and lowball threshold", () => {
  const result = quote(
    { rates: { reel: 15000, post: 8000, stories: 4000 } },
    { format: "reel", budgetInr: 12000, usageDays: 60 },
  );
  assert.equal(result.suggestedInr, 21000);
  assert.equal(result.usageExtra, true);
  assert.equal(result.lowball, true);
});
