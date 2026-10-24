import crypto from 'node:crypto';
import twilio from 'twilio';
import { askJSON } from './llm.js';
import { voiceAgentPrompt } from './prompts.js';

const VoiceResponse = twilio.twiml.VoiceResponse;
const MAX_TURNS = 8;
const MAX_TEXT = 700;
const VOICE_LANGUAGE = 'en-IN';

export function voiceConfiguration() {
  return {
    twilioConfigured: Boolean(process.env.TWILIO_AUTH_TOKEN),
    transferConfigured: Boolean(process.env.VOICE_TRANSFER_NUMBER),
    aiConfigured: Boolean(process.env.OLLAMA_CHAT_URL),
    webhookBaseUrl: process.env.VOICE_WEBHOOK_BASE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  };
}

function callbackUrl(requestUrl, path) {
  const configuredBase = process.env.VOICE_WEBHOOK_BASE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
  const request = new URL(requestUrl);
  if (configuredBase) return new URL(`${path}${request.search}`, configuredBase).toString();
  return new URL(`${path}${request.search}`, request.origin).toString();
}

function encryptionKey() {
  const secret = process.env.VOICE_SESSION_SECRET || process.env.TWILIO_AUTH_TOKEN;
  if (!secret) throw new Error('Set TWILIO_AUTH_TOKEN to enable voice webhooks.');
  return crypto.createHash('sha256').update(`collabdesk-voice-session:${secret}`).digest();
}

function sealSession(session) {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), nonce);
  const payload = Buffer.from(JSON.stringify({ ...session, expiresAt: Date.now() + 60 * 60 * 1000 }));
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString('base64url');
}

function openSession(token) {
  try {
    const data = Buffer.from(token, 'base64url');
    if (data.length < 29 || data.length > 12000) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    const plaintext = Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]);
    const session = JSON.parse(plaintext.toString('utf8'));
    if (!Number.isFinite(session.expiresAt) || session.expiresAt < Date.now()) return null;
    if (!Array.isArray(session.history) || !Number.isInteger(session.turns)) return null;
    return session;
  } catch {
    return null;
  }
}

export function parseVoiceForm(form) {
  return Object.fromEntries(Object.entries(form || {}).map(([key, value]) => [key, Array.isArray(value) ? value.at(-1) : value]));
}

export function isValidTwilioRequest(request, params) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = request.headers?.get?.('x-twilio-signature');
  if (!authToken || !signature) return false;
  const url = callbackUrl(request.url, new URL(request.url).pathname);
  return twilio.validateRequest(authToken, signature, url, params);
}

function gatherForNextTurn(response, requestUrl, session) {
  const sessionToken = sealSession(session);
  const action = new URL('/api/voice/turn', callbackUrl(requestUrl, '/api/voice/turn'));
  action.searchParams.set('session', sessionToken);
  const gather = response.gather({ input: 'speech', language: VOICE_LANGUAGE, speechTimeout: 'auto', timeout: 6, actionOnEmptyResult: true, method: 'POST', action: action.toString() });
  return gather;
}

function fallbackReply(text, history) {
  const normalized = text.toLowerCase();
  if (/\b(human|person|real person|aanya|agent|someone)\b/.test(normalized) && /\b(speak|talk|connect|transfer|call|person|human|agent)\b/.test(normalized)) {
    return { reply: 'Of course. I can try to connect you with Aanya now.', intent: 'handoff', transfer: true };
  }
  if (/\b(error|broken|not working|technical|stream|audio|video|microphone|camera)\b/.test(normalized)) {
    return { reply: 'I can help with a quick check. Please tell me what device or app you are using and what you see.', intent: 'technical_help', transfer: false };
  }
  if (/\b(idea|brainstorm|create|concept|collab|collaboration|brand)\b/.test(normalized)) {
    return { reply: 'I can help get the collaboration started. What are you hoping to create, and who is it for?', intent: 'collaboration', transfer: false };
  }
  if (/\b(thank you|thanks|bye|goodbye|that is all|that's all)\b/.test(normalized)) {
    return { reply: 'Thanks for calling CollabDesk. Have a good day.', intent: 'follow_up', transfer: false };
  }
  if (!history.length && /^(hi|hello|hey)\b/.test(normalized)) {
    return { reply: 'Hello, this is CollabDeskAI, Aanya’s creator assistant. How can I help with your collaboration today?', intent: 'welcome', transfer: false };
  }
  return { reply: 'I’m here to help with creator collaborations and session support. What would you like to work through?', intent: 'unclear', transfer: false };
}

async function getVoiceReply(text, history) {
  try {
    const voiceTimeoutMs = Number(process.env.VOICE_AI_TIMEOUT_MS) > 0 ? Number(process.env.VOICE_AI_TIMEOUT_MS) : 7000;
    const result = await askJSON(voiceAgentPrompt(history, text), { timeoutMs: Math.min(voiceTimeoutMs, 10000) });
    if (typeof result?.reply !== 'string' || !result.reply.trim()) throw new Error('Invalid voice reply');
    return {
      reply: result.reply.trim().slice(0, MAX_TEXT),
      intent: ['welcome', 'collaboration', 'technical_help', 'handoff', 'follow_up', 'unclear'].includes(result.intent) ? result.intent : 'unclear',
      transfer: result.transfer === true
    };
  } catch {
    return fallbackReply(text, history);
  }
}

export function incomingCallTwiml(requestUrl) {
  const response = new VoiceResponse();
  response.say({ language: VOICE_LANGUAGE }, 'Hello, this is CollabDeskAI, Aanya’s creator assistant. How can I help with your collaboration today?');
  gatherForNextTurn(response, requestUrl, { history: [], turns: 0 });
  response.say({ language: VOICE_LANGUAGE }, 'I did not hear anything. Please call again when you are ready. Goodbye.');
  response.hangup();
  return response.toString();
}

export async function voiceTurnTwiml(requestUrl, body, session) {
  const response = new VoiceResponse();
  const callerText = String(body.SpeechResult || '').trim().slice(0, MAX_TEXT);
  if (!callerText) {
    session.noInput = (session.noInput || 0) + 1;
    if (session.noInput >= 2) {
      response.say({ language: VOICE_LANGUAGE }, 'I could not hear you clearly. Please call again when you are ready. Goodbye.');
      response.hangup();
      return response.toString();
    }
    response.say({ language: VOICE_LANGUAGE }, 'Sorry, I did not catch that. Please say that again.');
    gatherForNextTurn(response, requestUrl, session);
    response.say({ language: VOICE_LANGUAGE }, 'I still cannot hear you clearly. Please call back when you are ready. Goodbye.');
    response.hangup();
    return response.toString();
  }

  const history = session.history.slice(-6);
  const turn = await getVoiceReply(callerText, history);
  session.noInput = 0;
  session.turns += 1;
  session.history = [...history, { role: 'user', text: callerText }, { role: 'assistant', text: turn.reply }].slice(-12);

  if (turn.transfer && process.env.VOICE_TRANSFER_NUMBER) {
    response.say({ language: VOICE_LANGUAGE }, 'One moment while I try to connect you with Aanya.');
    const dial = response.dial({ action: callbackUrl(requestUrl, '/api/voice/transfer-result'), method: 'POST', timeout: 20, answerOnBridge: true });
    dial.number(process.env.VOICE_TRANSFER_NUMBER);
    return response.toString();
  }

  if (turn.transfer && !process.env.VOICE_TRANSFER_NUMBER) {
    turn.reply = 'I cannot connect a call right now, but I can continue helping here. What would you like Aanya to know?';
    session.history[session.history.length - 1] = { role: 'assistant', text: turn.reply };
  }

  response.say({ language: VOICE_LANGUAGE }, turn.reply);
  if (session.turns >= MAX_TURNS || turn.intent === 'follow_up') {
    response.say({ language: VOICE_LANGUAGE }, 'Thank you for calling CollabDesk. Goodbye.');
    response.hangup();
    return response.toString();
  }
  gatherForNextTurn(response, requestUrl, session);
  response.say({ language: VOICE_LANGUAGE }, 'I could not hear a reply. Please call again when you are ready. Goodbye.');
  response.hangup();
  return response.toString();
}

export function transferResultTwiml(status) {
  const response = new VoiceResponse();
  if (status === 'completed' || status === 'answered') {
    response.say({ language: VOICE_LANGUAGE }, 'Thanks for speaking with Aanya. Goodbye.');
  } else {
    response.say({ language: VOICE_LANGUAGE }, 'I could not connect you just now. Please try again later. Goodbye.');
  }
  response.hangup();
  return response.toString();
}

export function sessionFromQuery(requestUrl) {
  const token = new URL(requestUrl).searchParams.get('session');
  return token ? openSession(token) : null;
}
