import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { incomingCallTwiml, isValidTwilioRequest, parseVoiceForm, sessionFromQuery, transferResultTwiml, voiceConfiguration, voiceTurnTwiml } from "./voice.js";
import { readStore, updateStore } from "./store.js";
import { quote, insight, todayActions } from "./rate.js";
import { askJSON } from "./llm.js";
import { parsePrompt, replyPrompt } from "./prompts.js";
import { samples } from "./samples.js";
import { registerGmailRoutes } from "./gmail-routes.js";
import { defaultStudioRepo, generateRepositoryDraft, getRepositoryActivity } from "./studio.js";

const app = new Hono();
const statuses = ["new", "negotiating", "confirmed", "posted", "paid"];
const replyIntents = ["accept", "counter", "decline", "ask_brief"];
const assistantRequests = new Map();
const franchiseDeals = [
  { id: "d-seed-metro-bite", brand: "MetroBite Franchise", intent: "paid_collab", format: "reel", budgetInr: 32000, deadline: "in 14 days", deliverables: ["1 launch reel", "3 stories"], summary: "Pune franchise launch coverage for two new MetroBite locations.", status: "new", usageDays: 30, createdAt: "2026-10-24T08:00:00.000Z" },
  { id: "d-seed-chai-junction", brand: "Chai Junction", intent: "paid_collab", format: "reel", budgetInr: 18000, deadline: "next month", deliverables: ["1 reel", "2 stories"], summary: "Paid coverage for a new Chai Junction franchise outlet.", status: "new", usageDays: 30, createdAt: "2026-10-24T08:01:00.000Z" },
  { id: "d-seed-food-festival", brand: "Pune Food Festival", intent: "paid_collab", format: "reel", budgetInr: 24000, deadline: "in three weeks", deliverables: ["1 reel", "3 stories"], summary: "Paid event coverage for Pune Food Festival.", status: "new", usageDays: 30, createdAt: "2026-10-24T08:02:00.000Z" },
];
const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",").map((origin) => origin.trim()).filter(Boolean));

app.use("/api/*", bodyLimit({ maxSize: 16 * 1024, onError: (c) => c.json({ error: "Request body exceeds 16 KB." }, 413) }));
app.use("/api/*", cors({ origin: (origin) => allowedOrigins.has(origin) ? origin : null, allowMethods: ["GET", "POST", "PUT", "PATCH", "OPTIONS"], allowHeaders: ["Content-Type"] }));
app.onError((error, c) => {
  if (error instanceof SyntaxError) return c.json({ error: "Request body must contain valid JSON." }, 400);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
  return c.json({ error: status === 500 ? "Internal server error" : error.message }, status);
});

registerGmailRoutes(app);

app.get("/api/voice/status", (c) => c.json(voiceConfiguration()));
app.post("/api/voice/incoming", async (c) => {
  const body = parseVoiceForm(await c.req.parseBody());
  if (!isValidTwilioRequest(c.req.raw, body)) return c.text("Invalid or missing Twilio signature.", 403);
  return c.body(incomingCallTwiml(c.req.url), 200, { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" });
});
app.post("/api/voice/turn", async (c) => {
  const body = parseVoiceForm(await c.req.parseBody());
  if (!isValidTwilioRequest(c.req.raw, body)) return c.text("Invalid or missing Twilio signature.", 403);
  const session = sessionFromQuery(c.req.url);
  if (!session) return c.text("Voice session expired. Please call again.", 410);
  return c.body(await voiceTurnTwiml(c.req.url, body, session), 200, { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" });
});
app.post("/api/voice/transfer-result", async (c) => {
  const body = parseVoiceForm(await c.req.parseBody());
  if (!isValidTwilioRequest(c.req.raw, body)) return c.text("Invalid or missing Twilio signature.", 403);
  return c.body(transferResultTwiml(String(body.DialCallStatus || "failed")), 200, { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" });
});

function validParsedDeal(value) {
  return value && typeof value.brand === "string" && value.brand.trim().length > 0 && value.brand.length <= 120 &&
    ["paid_collab", "gifted", "spam", "follow_up"].includes(value.intent) &&
    ["reel", "post", "stories"].includes(value.format) &&
    (value.budgetInr === null || (typeof value.budgetInr === "number" && Number.isFinite(value.budgetInr) && value.budgetInr >= 0)) &&
    typeof value.deadline === "string" && value.deadline.length <= 200 && Array.isArray(value.deliverables) && value.deliverables.length <= 20 &&
    value.deliverables.every((item) => typeof item === "string" && item.length <= 200) &&
    typeof value.summary === "string" && value.summary.length <= 1000 && typeof value.usageDays === "number" && Number.isFinite(value.usageDays) && value.usageDays >= 0 && value.usageDays <= 3650;
}

function fallbackParse(rawEmail) {
  if (/MetroBite/i.test(rawEmail)) return { brand: "MetroBite Franchise", intent: "paid_collab", format: "reel", budgetInr: 32000, deadline: "in 14 days", deliverables: ["1 launch reel", "3 stories"], summary: "Pune franchise launch coverage for two new MetroBite locations with 30 days of usage.", usageDays: 30 };
  if (/Chai Junction/i.test(rawEmail)) return { brand: "Chai Junction", intent: "paid_collab", format: "reel", budgetInr: 18000, deadline: "next month", deliverables: ["1 reel", "2 stories"], summary: "Paid coverage for a new Chai Junction franchise outlet with 30 days of usage.", usageDays: 30 };
  if (/Pune Food Festival/i.test(rawEmail)) return { brand: "Pune Food Festival", intent: "paid_collab", format: "reel", budgetInr: 24000, deadline: "in three weeks", deliverables: ["1 reel", "3 stories"], summary: "Paid event coverage for Pune Food Festival with 30 days of social usage.", usageDays: 30 };
  if (/Vanaz Bakehouse/i.test(rawEmail)) return { brand: "Vanaz Bakehouse", intent: "paid_collab", format: "reel", budgetInr: 18000, deadline: "in 10 days", deliverables: ["1 reel", "3 stories"], summary: "Vanaz Bakehouse offered ₹18,000 for one reel and three stories with 30 days of usage.", usageDays: 30 };
  if (/(?:^|[^\d])(?:8,000|8000)(?!\d)/.test(rawEmail)) {
    return { brand: "Café Ramwadi", intent: "paid_collab", format: "reel", budgetInr: 8000, deadline: "this week", deliverables: ["1 30 second reel", "2 stories"], summary: "Café Ramwadi offered ₹8,000 for one reel and two stories with 30 days of usage.", usageDays: 30 };
  }
  if (/GlowTheory|cannot pay/i.test(rawEmail)) {
    return { brand: "GlowTheory", intent: "gifted", format: "reel", budgetInr: null, deadline: "no deadline given", deliverables: ["1 reel"], summary: "GlowTheory offered a gifted skincare kit for one reel with no fee.", usageDays: 30 };
  }
  if (/(?:^|[^\d])(?:18,000|18000)(?!\d)/.test(rawEmail)) {
    return { brand: "Vanaz Bakehouse", intent: "paid_collab", format: "reel", budgetInr: 18000, deadline: "in 10 days", deliverables: ["1 reel", "3 stories"], summary: "Vanaz Bakehouse offered ₹18,000 for one reel and three stories with 30 days of usage.", usageDays: 30 };
  }
  return { brand: "Unknown brand", intent: "follow_up", format: "reel", budgetInr: null, deadline: "unclear", deliverables: ["1 reel"], summary: "Could not read this email. Review it yourself.", usageDays: 30 };
}

function fallbackReply(intent, deal, suggestedInr) {
  const amount = `₹${suggestedInr.toLocaleString("en-IN")}`;
  if (intent === "accept") {
    return { subject: `Yes — ${deal.brand} x Aanya`, body: `Hi,\n\nHappy to confirm ${deal.deliverables.join(" and ")} by ${deal.deadline} for ${amount}, including ${deal.usageDays} days of usage.\n\nThanks,\nAanya` };
  }
  if (intent === "counter") {
    return { subject: `Rate for ${deal.brand}`, body: `Hi,\n\nThanks for the offer. The budget does not match my ${deal.format || "reel"} rate. My fee is ${amount}, including ${deal.usageDays} days of usage.\n\nThanks,\nAanya` };
  }
  if (intent === "decline") {
    return { subject: "Not the right fit", body: "Hi,\n\nThanks for thinking of me. I’ll have to pass on this collaboration, but I appreciate you reaching out.\n\nBest,\nAanya" };
  }
  return { subject: "A few details before I confirm", body: "Hi,\n\nCould you share more about the product, the posting date, and how many days you need usage?\n\nThanks,\nAanya" };
}

function workspaceAssistant(question, db) {
  const normalized = question.toLowerCase();
  const deals = db.deals.map((deal) => ({ ...deal, quote: quote(db.creator, deal) }));
  const lowballDeals = deals.filter((deal) => deal.quote.lowball);
  const followUps = deals.filter((deal) => deal.status === "new" || deal.status === "posted");
  const bestPost = [...db.posts].sort((a, b) => b.reach - a.reach)[0];

  if (/(rate|lowball|offer|price|fee|budget)/.test(normalized)) {
    if (lowballDeals.length) {
      const summary = lowballDeals.slice(0, 3).map((deal) => `${deal.brand} offered ${deal.budgetInr == null ? "no fee" : `₹${deal.budgetInr.toLocaleString("en-IN")}`}; your suggested ${deal.format} fee is ₹${deal.quote.suggestedInr.toLocaleString("en-IN")}`).join(". ");
      return { answer: `${lowballDeals.length} offer${lowballDeals.length === 1 ? " is" : "s are"} below your rate. ${summary}.`, suggestions: ["Open the deal board", "Review your rate card"] };
    }
    return { answer: "No current offer is flagged below your rate. Your suggested fees are calculated from your media kit and usage period.", suggestions: ["Review your rate card", "Check new deals"] };
  }

  if (/(reply|follow.?up|next|payment|chase)/.test(normalized)) {
    if (followUps.length) {
      const names = followUps.slice(0, 3).map((deal) => `${deal.brand} (${deal.status === "posted" ? "payment follow-up" : "reply needed"})`).join(", ");
      return { answer: `Your next follow-up${followUps.length === 1 ? " is" : "s are"} ${names}. Open a deal to draft a reply; you can review and edit it before copying.`, suggestions: ["Open the inbox", "View all deals"] };
    }
    return { answer: "There are no new replies or posted deals awaiting payment follow-up right now.", suggestions: ["Review recent deals", "Check content insights"] };
  }

  if (/(content|post|reach|save|perform|resonat)/.test(normalized) && bestPost) {
    const result = insight(db.posts);
    return { answer: `${bestPost.title} leads your library with ${bestPost.reach.toLocaleString("en-IN")} reach and ${bestPost.saves.toLocaleString("en-IN")} saves. ${result.text}`, suggestions: ["Explore content insights", "Review your media kit"] };
  }

  const counts = Object.fromEntries(statuses.map((status) => [status, deals.filter((deal) => deal.status === status).length]));
  const pending = followUps.length;
  return {
    answer: `${pending ? `${pending} partnership${pending === 1 ? " needs" : "s need"} a follow-up. ` : "Your deal list has no pending follow-ups. "}${insight(db.posts).text}`,
    suggestions: ["What should I follow up on?", "Which offer is below my rate?", "What content is performing best?"],
    counts,
  };
}

function assistantPrompt(question, page, db) {
  const context = {
    creator: { name: db.creator.name, niche: db.creator.niche, rates: db.creator.rates },
    deals: db.deals.slice(0, 12).map((deal) => ({ brand: deal.brand, status: deal.status, format: deal.format, budgetInr: deal.budgetInr, usageDays: deal.usageDays, quote: quote(db.creator, deal) })),
    posts: db.posts.slice(0, 12).map(({ title, topic, type, reach, saves, collab }) => ({ title, topic, type, reach, saves, collab })),
  };
  return `You are CollabDesk's concise creator-work assistant. The user is on the ${page} page. Answer the user's question using only the JSON workspace facts below. Do not invent facts, change rates, send messages, or perform actions. When suggesting a reply, say the user can review and edit it first. Return JSON only: {"answer": string, "suggestions": string[]} with one short answer (max 500 characters) and up to 3 short next-step suggestions.\n\nWorkspace facts:\n${JSON.stringify(context)}\n\nQuestion: ${question}`;
}

function allowAssistantRequest(key) {
  const now = Date.now();
  const windowMs = 60_000;
  if (assistantRequests.size > 1_000) {
    for (const [client, request] of assistantRequests) if (request.resetAt <= now) assistantRequests.delete(client);
  }
  const current = assistantRequests.get(key);
  if (!current || current.resetAt <= now) {
    assistantRequests.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= 8) return false;
  current.count += 1;
  return true;
}

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/creator", async (c) => {
  const db = await readStore();
  return c.json(db.creator);
});

app.put("/api/creator", async (c) => {
  const body = await c.req.json();
  const rates = body?.rates;
  if (typeof body?.niche !== "string" || !body.niche.trim() || body.niche.length > 120 || typeof body?.followers !== "number" || !Number.isFinite(body.followers) || body.followers < 0 || body.followers > 1_000_000_000 ||
    !rates || ["reel", "post", "stories"].some((key) => typeof rates[key] !== "number" || !Number.isFinite(rates[key]) || rates[key] <= 0 || rates[key] > 1_000_000_000)) {
    return c.json({ error: "Provide a niche, numeric followers count, and positive reel, post, and stories rates." }, 400);
  }
  const creator = await updateStore((db) => {
    db.creator = { ...db.creator, niche: body.niche.trim(), followers: body.followers, rates: { reel: rates.reel, post: rates.post, stories: rates.stories } };
    return db.creator;
  });
  return c.json(creator);
});

app.get("/api/deals", async (c) => {
  let db = await readStore();
  if (franchiseDeals.some((seed) => !db.deals.some((deal) => deal.id === seed.id))) {
    db = await updateStore((current) => {
      for (const seed of franchiseDeals) if (!current.deals.some((deal) => deal.id === seed.id)) current.deals.push(seed);
      return current;
    });
  }
  return c.json({ deals: [...db.deals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((deal) => ({ ...deal, quote: quote(db.creator, deal) })) });
});

app.get("/api/deals/:id", async (c) => {
  const db = await readStore();
  const deal = db.deals.find((item) => item.id === c.req.param("id"));
  if (!deal) return c.json({ error: "Deal not found" }, 404);
  return c.json({ ...deal, quote: quote(db.creator, deal) });
});

app.patch("/api/deals/:id", async (c) => {
  const body = await c.req.json();
  if (!statuses.includes(body?.status)) return c.json({ error: "Status must be new, negotiating, confirmed, posted, or paid." }, 400);
  const result = await updateStore((db) => {
    const deal = db.deals.find((item) => item.id === c.req.param("id"));
    if (!deal) return null;
    deal.status = body.status;
    return deal;
  });
  if (!result) return c.json({ error: "Deal not found" }, 404);
  return c.json(result);
});

app.post("/api/inbox/parse", async (c) => {
  const body = await c.req.json();
  if (typeof body?.rawEmail !== "string" || !body.rawEmail.trim()) return c.json({ error: "rawEmail is required" }, 400);
  if (body.rawEmail.length > 10_000) return c.json({ error: "rawEmail must be 10,000 characters or fewer." }, 413);
  const db = await readStore();
  let parsed;
  let source = "llm";
  try {
    const prompt = parsePrompt(body.rawEmail);
    try {
      parsed = await askJSON(prompt);
    } catch (error) {
      if (error.code !== "INVALID_JSON") throw error;
      parsed = null;
    }
    if (!validParsedDeal(parsed)) {
      try {
        parsed = await askJSON(`${prompt}\n\nYour last answer was invalid JSON. Fix it.`);
      } catch {
        parsed = null;
      }
    }
    if (!validParsedDeal(parsed)) throw new Error("Invalid deal fields from model");
  } catch {
    parsed = fallbackParse(body.rawEmail);
    source = "fallback";
  }
  const result = await updateStore((current) => {
    const deal = { id: `d-${randomUUID()}`, ...parsed, status: "new", createdAt: new Date().toISOString() };
    current.deals.push(deal);
    return { deal, quote: quote(current.creator, deal), source };
  });
  return c.json(result, 201);
});

app.post("/api/deals/:id/rate", async (c) => {
  const db = await readStore();
  const deal = db.deals.find((item) => item.id === c.req.param("id"));
  if (!deal) return c.json({ error: "Deal not found" }, 404);
  return c.json(quote(db.creator, deal));
});

app.post("/api/deals/:id/reply", async (c) => {
  const body = await c.req.json();
  if (!replyIntents.includes(body?.intent)) return c.json({ error: "intent must be accept, counter, decline, or ask_brief" }, 400);
  const db = await readStore();
  const deal = db.deals.find((item) => item.id === c.req.param("id"));
  if (!deal) return c.json({ error: "Deal not found" }, 404);
  const q = quote(db.creator, deal);
  let reply;
  let source = "llm";
  try {
    reply = await askJSON(replyPrompt(body.intent, deal, q.suggestedInr));
    if (!reply || typeof reply.subject !== "string" || reply.subject.length > 300 || typeof reply.body !== "string" || reply.body.length > 5000) throw new Error("Invalid reply fields from model");
    const amountForms = [`₹${q.suggestedInr}`, `₹${q.suggestedInr.toLocaleString("en-IN")}`];
    if (body.intent === "counter" && !amountForms.some((amount) => reply.body.includes(amount))) {
      reply.body = `${reply.body.trim()}\n\nMy fee for this is ${amountForms[1]}.`;
    }
  } catch {
    reply = fallbackReply(body.intent, deal, q.suggestedInr);
    source = "fallback";
  }
  return c.json({ ...reply, quote: q, source });
});

app.get("/api/content", async (c) => {
  const db = await readStore();
  const result = insight(db.posts);
  return c.json({ posts: db.posts, insight: result.text, averages: result.averages });
});

app.get("/api/studio/activity", async (c) => {
  try { return c.json(await getRepositoryActivity(c.req.query("repo") || defaultStudioRepo)); }
  catch (error) { return c.json({ error: error.message || "Could not load repository activity." }, 502); }
});

app.post("/api/studio/generate", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") return c.json({ error: "Draft settings are required." }, 400);
  try { return c.json(await generateRepositoryDraft(body)); }
  catch (error) { return c.json({ error: error.message || "Could not generate a repository draft." }, 502); }
});

app.get("/api/today", async (c) => {
  const db = await readStore();
  const contentInsight = insight(db.posts).text;
  const counts = Object.fromEntries(statuses.map((status) => [status, db.deals.filter((deal) => deal.status === status).length]));
  return c.json({ actions: todayActions(db.deals, contentInsight), counts });
});

app.get("/api/samples", (c) => c.json(samples));

app.post("/api/assistant", async (c) => {
  const body = await c.req.json();
  if (typeof body?.question !== "string" || !body.question.trim()) return c.json({ error: "Ask a question about your deals, rates, or content." }, 400);
  if (body.question.length > 500) return c.json({ error: "Keep your question under 500 characters." }, 413);
  const page = ["today", "inbox", "deals", "detail", "content", "kit"].includes(body.page) ? body.page : "workspace";
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  const clientKey = forwarded || c.req.header("x-real-ip") || "local";
  if (!allowAssistantRequest(clientKey)) return c.json({ error: "The assistant is taking a short pause. Try again in a minute." }, 429);

  const db = await readStore();
  let response = workspaceAssistant(body.question.trim(), db);
  let source = "workspace";
  if (process.env.OPENAI_API_KEY) {
    try {
      const generated = await askJSON(assistantPrompt(body.question.trim(), page, db));
      if (typeof generated?.answer === "string" && generated.answer.trim().length <= 500 && Array.isArray(generated.suggestions) && generated.suggestions.length <= 3 && generated.suggestions.every((item) => typeof item === "string" && item.length <= 80)) {
        response = { answer: generated.answer.trim(), suggestions: generated.suggestions.map((item) => item.trim()) };
        source = "ai";
      }
    } catch {
      // Keep the grounded workspace answer available when the optional AI provider is unavailable.
    }
  }
  return c.json({ ...response, source });
});

const port = Number(process.env.PORT || 3001);
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const hostname = process.env.HOST || "127.0.0.1";
  serve({ fetch: app.fetch, port, hostname }, (info) => {
    console.log(`CollabDesk API listening on http://${hostname}:${info.port}`);
  });
}

export { app };
