async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error("Could not reach CollabDesk. Make sure the API server is running.");
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status}).`);
  return data;
}

export const money = (value) => value == null ? "No fee" : `₹${Number(value).toLocaleString("en-IN")}`;
export const titleCase = (value) => String(value ?? "").replace(/[_-]+/g, " ").replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());

export const api = {
  creator: () => request("/creator"),
  saveCreator: (creator) => request("/creator", { method: "PUT", body: creator }),
  deals: () => request("/deals"),
  deal: (id) => request(`/deals/${encodeURIComponent(id)}`),
  setDealStatus: (id, status) => request(`/deals/${encodeURIComponent(id)}`, { method: "PATCH", body: { status } }),
  updateDeal: (id, status) => request(`/deals/${encodeURIComponent(id)}`, { method: "PATCH", body: { status } }),
  parseEmail: (rawEmail) => request("/inbox/parse", { method: "POST", body: { rawEmail } }),
  parse: (rawEmail) => request("/inbox/parse", { method: "POST", body: { rawEmail } }),
  reply: (id, intent) => request(`/deals/${encodeURIComponent(id)}/reply`, { method: "POST", body: { intent } }),
  content: () => request("/content"),
  reelScript: (brief) => request("/content/reel-script", { method: "POST", body: brief }),
  today: () => request("/today"),
  samples: () => request("/samples"),
  assistant: (question, page) => request("/assistant", { method: "POST", body: { question, page } }),
  gmailStatus: () => request("/gmail/status"),
  gmailMessages: () => request("/gmail/messages"),
  gmailMessage: (id) => request(`/gmail/messages/${encodeURIComponent(id)}`),
  disconnectGmail: () => request("/gmail/disconnect", { method: "POST" }),
  voiceStatus: () => request("/voice/status"),
  voiceReply: (text, history) => request("/voice/respond", { method: "POST", body: { text, history } }),
  generateStudioDraft: (settings) => request("/studio/generate", { method: "POST", body: settings }),
};
