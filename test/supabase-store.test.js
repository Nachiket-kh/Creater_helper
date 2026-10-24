import assert from "node:assert/strict";
import test from "node:test";
import { createSupabaseStore } from "../server/supabase-store.js";

function response(rows, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(rows), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("Supabase store bootstraps from seed data and persists updates through REST", async () => {
  let row = null;
  const requests = [];
  const fetcher = async (input, init) => {
    const url = new URL(input);
    requests.push({ url, init });
    assert.equal(init.headers.apikey, "sb_secret_test");
    assert.equal(init.headers.Authorization, "Bearer sb_secret_test");
    if (init.method === "POST") {
      row = JSON.parse(init.body);
      return response([row], 201);
    }
    if (init.method === "PATCH") {
      const expectedRevision = Number(url.searchParams.get("revision").replace("eq.", ""));
      if (row.revision !== expectedRevision) return response([]);
      const update = JSON.parse(init.body);
      row = { ...row, ...update };
      return response([row]);
    }
    return response(row ? [structuredClone(row)] : []);
  };
  const store = createSupabaseStore({
    url: "https://project.supabase.co",
    secretKey: "sb_secret_test",
    seedProvider: async () => ({ creator: { name: "Demo" }, deals: [], posts: [] }),
    fetcher,
  });

  assert.deepEqual(await store.read(), { creator: { name: "Demo" }, deals: [], posts: [] });
  const result = await store.update((data) => {
    data.deals.push({ id: "d-1" });
    return "saved";
  });
  assert.equal(result, "saved");
  assert.equal(row.revision, 2);
  assert.deepEqual((await store.read()).deals, [{ id: "d-1" }]);
  assert.ok(requests.some(({ init }) => init.method === "POST"));
  assert.ok(requests.some(({ init }) => init.method === "PATCH"));
});

test("Supabase optimistic updates retry after a concurrent write", async () => {
  let row = { id: "default", payload: { count: 0 }, revision: 1 };
  const fetcher = async (input, init) => {
    const url = new URL(input);
    if (init.method === "PATCH") {
      const expectedRevision = Number(url.searchParams.get("revision").replace("eq.", ""));
      if (row.revision !== expectedRevision) return response([]);
      const update = JSON.parse(init.body);
      row = { ...row, ...update };
      return response([row]);
    }
    return response([structuredClone(row)]);
  };
  const makeStore = () => createSupabaseStore({
    url: "https://project.supabase.co",
    secretKey: "sb_secret_test",
    seedProvider: async () => ({ count: 0 }),
    fetcher,
  });
  const [first, second] = await Promise.all([makeStore(), makeStore()].map((store) =>
    store.update((data) => { data.count += 1; return data.count; })
  ));

  assert.equal(row.payload.count, 2);
  assert.equal(row.revision, 3);
  assert.ok([first, second].includes(2));
});

test("Supabase configuration requires a secret key and HTTPS", () => {
  assert.throws(() => createSupabaseStore({ url: "https://project.supabase.co", seedProvider: async () => ({}) }), /SUPABASE_SECRET_KEY/);
  assert.throws(() => createSupabaseStore({ url: "http://project.supabase.co", secretKey: "secret", seedProvider: async () => ({}) }), /HTTPS/);
});
