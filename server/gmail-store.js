const ACCOUNTS = "collabdesk_gmail_accounts";
const MESSAGES = "collabdesk_gmail_messages";

export function createGmailStore({ url, secretKey, fetcher = fetch }) {
  if (!url || !secretKey) throw new Error("Gmail sync requires SUPABASE_URL and SUPABASE_SECRET_KEY on the server.");
  const base = new URL(url);
  if (base.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base.hostname)) {
    throw new Error("SUPABASE_URL must use HTTPS.");
  }

  async function request(table, { method = "GET", filters = {}, query = {}, body, prefer } = {}) {
    const target = new URL(`${base.origin}/rest/v1/${table}`);
    for (const [key, value] of Object.entries(filters)) target.searchParams.set(key, value);
    for (const [key, value] of Object.entries(query)) target.searchParams.set(key, value);
    const headers = {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      Accept: "application/json",
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (prefer) headers.Prefer = prefer;
    let response;
    try {
      response = await fetcher(target, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(12_000),
      });
    } catch (error) {
      throw new Error(`Gmail storage request failed: ${error.message}`);
    }
    if (!response.ok) {
      const error = new Error(`Gmail storage request failed (HTTP ${response.status}).`);
      error.status = response.status;
      throw error;
    }
    if (response.status === 204) return [];
    return response.json();
  }

  return {
    async getAccount(sub) {
      const rows = await request(ACCOUNTS, { filters: { google_sub: `eq.${sub}` }, query: { select: "*", limit: "1" } });
      return rows[0] || null;
    },
    async getAccountByEmail(email) {
      const rows = await request(ACCOUNTS, { filters: { email: `eq.${email.toLowerCase()}` }, query: { select: "*", limit: "1" } });
      return rows[0] || null;
    },
    async listAccounts() {
      return request(ACCOUNTS, { query: { select: "*" } });
    },
    async saveAccount(account) {
      const rows = await request(ACCOUNTS, {
        method: "POST",
        query: { on_conflict: "google_sub" },
        body: account,
        prefer: "resolution=merge-duplicates,return=representation",
      });
      return rows[0] || account;
    },
    async updateAccount(sub, changes) {
      const rows = await request(ACCOUNTS, {
        method: "PATCH",
        filters: { google_sub: `eq.${sub}` },
        body: { ...changes, updated_at: new Date().toISOString() },
        prefer: "return=representation",
      });
      return rows[0] || null;
    },
    async deleteAccount(sub) {
      await request(ACCOUNTS, { method: "DELETE", filters: { google_sub: `eq.${sub}` } });
    },
    async upsertMessages(messages) {
      for (let index = 0; index < messages.length; index += 20) {
        await request(MESSAGES, {
          method: "POST",
          query: { on_conflict: "google_sub,gmail_message_id" },
          body: messages.slice(index, index + 20),
          prefer: "resolution=merge-duplicates,return=minimal",
        });
      }
    },
    async listMessages(sub, limit = 60) {
      return request(MESSAGES, {
        filters: { google_sub: `eq.${sub}` },
        query: { select: "gmail_message_id,thread_id,from_name,from_email,subject,snippet,label_ids,internal_date", order: "internal_date.desc", limit: String(limit) },
      });
    },
    async getMessage(sub, messageId) {
      const rows = await request(MESSAGES, {
        filters: { google_sub: `eq.${sub}`, gmail_message_id: `eq.${messageId}` },
        query: { select: "gmail_message_id,thread_id,from_name,from_email,subject,snippet,body_text,label_ids,internal_date", limit: "1" },
      });
      return rows[0] || null;
    },
    async deleteExpiredMessages(days = 30) {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      await request(MESSAGES, { method: "DELETE", filters: { internal_date: `lt.${cutoff}` } });
    },
  };
}
