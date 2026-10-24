import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { readDB, writeDB } from './store.js';
import { quote, insight, todayActions } from './rate.js';
import { askJSON } from './llm.js';
import { parsePrompt, replyPrompt } from './prompts.js';
import { samples } from './samples.js';
import { incomingCallTwiml, isValidTwilioRequest, parseVoiceForm, sessionFromQuery, transferResultTwiml, voiceConfiguration, voiceTurnTwiml } from './voice.js';

const app = new Hono();
app.use('/api/*', cors({ origin: ['http://localhost:5173', 'https://creater-helper.vercel.app'], allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'], allowHeaders: ['Content-Type', 'X-Twilio-Signature'] }));
app.onError((error, c) => c.json({ error: error.message || 'Internal server error' }, 500));
const statuses = ['new', 'negotiating', 'confirmed', 'posted', 'paid'];
const intents = ['paid_collab', 'gifted', 'spam', 'follow_up'];
const formats = ['reel', 'post', 'stories'];
const validParse = (value) => value && typeof value.brand === 'string' && intents.includes(value.intent) && formats.includes(value.format) && (value.budgetInr === null || (typeof value.budgetInr === 'number' && Number.isFinite(value.budgetInr))) && typeof value.deadline === 'string' && Array.isArray(value.deliverables) && value.deliverables.every((item) => typeof item === 'string') && typeof value.summary === 'string' && typeof value.usageDays === 'number' && Number.isFinite(value.usageDays);
const fallbackParse = (rawEmail) => {
  const text = rawEmail.toLowerCase();
  if (text.includes('8,000') || text.includes('8000')) return { brand: 'Café Ramwadi', intent: 'paid_collab', format: 'reel', budgetInr: 8000, deadline: 'this week', deliverables: ['1 30 second reel', '2 stories'], summary: 'A café near Ramwadi metro wants a 30 second reel and 2 stories this week with 30 days of usage.', usageDays: 30 };
  if (text.includes('glowtheory') || text.includes('cannot pay')) return { brand: 'GlowTheory', intent: 'gifted', format: 'reel', budgetInr: null, deadline: 'no deadline given', deliverables: ['1 reel'], summary: 'Gifted skincare reel in exchange for exposure. No fee.', usageDays: 30 };
  if (text.includes('18,000') || text.includes('18000')) return { brand: 'Vanaz Bakehouse', intent: 'paid_collab', format: 'reel', budgetInr: 18000, deadline: 'in 10 days', deliverables: ['1 reel', '3 stories'], summary: 'Paid bakery reel plus stories with 30 days of usage.', usageDays: 30 };
  return { brand: 'Unknown brand', intent: 'follow_up', format: 'reel', budgetInr: null, deadline: 'unclear', deliverables: ['1 reel'], summary: 'Could not read this email. Review it yourself.', usageDays: 30 };
};
const findDeal = async (id) => { const db = await readDB(); return { db, deal: db.deals.find((item) => item.id === id) }; };

app.get('/api/health', (c) => c.json({ ok: true }));
app.get('/api/voice/status', (c) => c.json(voiceConfiguration()));
app.post('/api/voice/incoming', async (c) => {
  const body = parseVoiceForm(await c.req.parseBody());
  if (!isValidTwilioRequest(c.req.raw, body)) return c.text('Invalid or missing Twilio signature.', 403);
  return c.body(incomingCallTwiml(c.req.url), 200, { 'Content-Type': 'text/xml; charset=utf-8', 'Cache-Control': 'no-store' });
});
app.post('/api/voice/turn', async (c) => {
  const body = parseVoiceForm(await c.req.parseBody());
  if (!isValidTwilioRequest(c.req.raw, body)) return c.text('Invalid or missing Twilio signature.', 403);
  const session = sessionFromQuery(c.req.url);
  if (!session) return c.text('Voice session expired. Please call again.', 410);
  return c.body(await voiceTurnTwiml(c.req.url, body, session), 200, { 'Content-Type': 'text/xml; charset=utf-8', 'Cache-Control': 'no-store' });
});
app.post('/api/voice/transfer-result', async (c) => {
  const body = parseVoiceForm(await c.req.parseBody());
  if (!isValidTwilioRequest(c.req.raw, body)) return c.text('Invalid or missing Twilio signature.', 403);
  return c.body(transferResultTwiml(String(body.DialCallStatus || 'failed')), 200, { 'Content-Type': 'text/xml; charset=utf-8', 'Cache-Control': 'no-store' });
});
app.get('/api/creator', async (c) => c.json((await readDB()).creator));
app.put('/api/creator', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.niche !== 'string' || typeof body.followers !== 'number' || !body.rates || !['reel', 'post', 'stories'].every((key) => typeof body.rates[key] === 'number' && Number.isFinite(body.rates[key]) && body.rates[key] > 0)) return c.json({ error: 'Niche, followers, and three positive rates are required.' }, 400);
  const db = await readDB(); db.creator = { ...db.creator, niche: body.niche, followers: body.followers, rates: body.rates }; await writeDB(db); return c.json(db.creator);
});
app.get('/api/deals', async (c) => { const { deals } = await readDB(); return c.json({ deals: [...deals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) }); });
app.get('/api/deals/:id', async (c) => { const { db, deal } = await findDeal(c.req.param('id')); if (!deal) return c.json({ error: 'Deal not found.' }, 404); return c.json({ ...deal, quote: quote(db.creator, deal) }); });
app.patch('/api/deals/:id', async (c) => {
  const body = await c.req.json().catch(() => null); if (!body || !statuses.includes(body.status)) return c.json({ error: 'Status must be new, negotiating, confirmed, posted, or paid.' }, 400);
  const db = await readDB(); const deal = db.deals.find((item) => item.id === c.req.param('id')); if (!deal) return c.json({ error: 'Deal not found.' }, 404);
  deal.status = body.status; await writeDB(db); return c.json(deal);
});
app.post('/api/inbox/parse', async (c) => {
  const body = await c.req.json().catch(() => null); const rawEmail = body?.rawEmail;
  if (typeof rawEmail !== 'string' || !rawEmail.trim()) return c.json({ error: 'Paste an email to parse.' }, 400);
  let parsed; let source = 'llm';
  try {
    try { parsed = await askJSON(parsePrompt(rawEmail)); } catch { parsed = null; }
    if (!validParse(parsed)) parsed = await askJSON(parsePrompt(rawEmail, true));
    if (!validParse(parsed)) throw new Error('Invalid deal response');
  } catch { parsed = fallbackParse(rawEmail); source = 'fallback'; }
  const db = await readDB(); const deal = { ...parsed, id: `d-${Date.now()}`, status: 'new', createdAt: new Date().toISOString() }; db.deals.push(deal); await writeDB(db);
  return c.json({ deal, quote: quote(db.creator, deal), source });
});
app.post('/api/deals/:id/rate', async (c) => { const { db, deal } = await findDeal(c.req.param('id')); if (!deal) return c.json({ error: 'Deal not found.' }, 404); return c.json(quote(db.creator, deal)); });
app.post('/api/deals/:id/reply', async (c) => {
  const body = await c.req.json().catch(() => null); const intent = body?.intent;
  if (!['accept', 'counter', 'decline', 'ask_brief'].includes(intent)) return c.json({ error: 'Intent must be accept, counter, decline, or ask_brief.' }, 400);
  const { db, deal } = await findDeal(c.req.param('id')); if (!deal) return c.json({ error: 'Deal not found.' }, 404); const dealQuote = quote(db.creator, deal);
  const fallback = {
    accept: { subject: `Yes — ${deal.brand} x Aanya`, body: `Thanks for reaching out. I’m happy to confirm ${deal.deliverables.join(' and ')}, ${deal.deadline}, for a fee of ₹${dealQuote.suggestedInr}.` },
    counter: { subject: `Rate for ${deal.brand}`, body: `Thanks for the offer. The budget does not match my ${deal.format || 'reel'} rate. My fee is ₹${dealQuote.suggestedInr}, including 30 days of usage.` },
    decline: { subject: 'Not the right fit', body: `Thanks for thinking of me. I’ll have to pass on this collaboration, but I appreciate you reaching out.` },
    ask_brief: { subject: 'A few details before I confirm', body: `Could you share the product, your preferred posting date, and how many days you need usage?` }
  };
  let reply; let source = 'llm';
  try {
    reply = await askJSON(replyPrompt(intent, deal, dealQuote.suggestedInr));
    if (!reply || typeof reply.subject !== 'string' || typeof reply.body !== 'string') throw new Error('Invalid reply');
    if (intent === 'counter' && !new RegExp(`₹\\s?${dealQuote.suggestedInr.toLocaleString('en-IN').replace(',', '[,]?')}`).test(reply.body)) reply.body = `${reply.body.trim()} My fee for this is ₹${dealQuote.suggestedInr}.`;
  } catch { reply = fallback[intent]; source = 'fallback'; }
  if (intent === 'counter' && !reply.body.includes(`₹${dealQuote.suggestedInr}`) && !reply.body.includes(`₹${dealQuote.suggestedInr.toLocaleString('en-IN')}`)) reply.body = `${reply.body} My fee for this is ₹${dealQuote.suggestedInr}.`;
  return c.json({ ...reply, quote: dealQuote, source });
});
app.get('/api/content', async (c) => { const { posts } = await readDB(); const data = insight(posts); return c.json({ posts, insight: data.text, averages: data.averages }); });
app.get('/api/today', async (c) => { const { deals, posts } = await readDB(); const counts = Object.fromEntries(statuses.map((status) => [status, deals.filter((deal) => deal.status === status).length])); return c.json({ actions: todayActions(deals, insight(posts).text), counts }); });
app.get('/api/samples', (c) => c.json(samples));

export { app };
export default app;

if (!process.env.VERCEL) {
  serve({ fetch: app.fetch, port: 3001 }, (info) => console.log(`CollabDesk API listening on http://localhost:${info.port}`));
}
