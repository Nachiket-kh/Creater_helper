const TABLE = "collabdesk_state";
const STATE_ID = "default";

export function createSupabaseStore({ url, secretKey, seedProvider, fetcher = fetch }) {
  if (!url || !secretKey) throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY to use Supabase storage.");
  const baseUrl = new URL(url);
  if (baseUrl.protocol !== "https:" && baseUrl.hostname !== "localhost" && baseUrl.hostname !== "127.0.0.1") {
    throw new Error("SUPABASE_URL must use HTTPS, except for a local Supabase instance.");
  }
  const endpoint = `${baseUrl.origin}/rest/v1/${TABLE}`;

  async function request(path, { method = "GET", body, prefer } = {}) {
    const headers = {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      Accept: "application/json",
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (prefer) headers.Prefer = prefer;
    let response;
    try {
      response = await fetcher(`${endpoint}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      throw new Error(`Supabase request failed: ${error.message}`);
    }
    if (!response.ok) {
      const error = new Error(`Supabase request failed (HTTP ${response.status}).`);
      error.status = response.status;
      throw error;
    }
    if (response.status === 204) return [];
    return response.json();
  }

  async function findRecord() {
    const rows = await request(`?select=id,payload,revision&id=eq.${STATE_ID}&limit=1`);
    return rows[0] || null;
  }

  async function loadRecord() {
    const existing = await findRecord();
    if (existing) return existing;

    const initial = await seedProvider();
    try {
      const inserted = await request("", {
        method: "POST",
        body: { id: STATE_ID, payload: initial, revision: 1 },
        prefer: "return=representation",
      });
      if (inserted[0]) return inserted[0];
    } catch (error) {
      // Another process may have initialized the singleton row at the same time.
      if (error.status !== 409) throw error;
    }
    const afterInsert = await findRecord();
    if (afterInsert) return afterInsert;
    throw new Error("Could not initialize the CollabDesk Supabase state row.");
  }

  async function read() {
    const row = await loadRecord();
    return row.payload;
  }

  async function write(data, expectedRevision) {
    const rows = await request(`?id=eq.${STATE_ID}&revision=eq.${expectedRevision}&select=revision`, {
      method: "PATCH",
      body: { payload: data, revision: expectedRevision + 1, updated_at: new Date().toISOString() },
      prefer: "return=representation",
    });
    return rows.length > 0;
  }

  async function update(mutator) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const row = await loadRecord();
      const data = structuredClone(row.payload);
      const result = await mutator(data);
      if (await write(data, Number(row.revision))) return result;
    }
    const error = new Error("The database changed repeatedly while saving. Please retry the request.");
    error.status = 409;
    throw error;
  }

  return { read, write, update };
}
