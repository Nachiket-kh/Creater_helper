import { createHmac, randomBytes, timingSafeEqual, createCipheriv, createDecipheriv } from "node:crypto";

export const SESSION_COOKIE = "collabdesk_session";
export const OAUTH_STATE_COOKIE = "collabdesk_oauth_state";
export const SESSION_SECONDS = 60 * 60 * 24 * 7;

function hmac(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(a, b) {
  const left = Buffer.from(a || "");
  const right = Buffer.from(b || "");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function readCookies(request) {
  return Object.fromEntries((request.headers.get("cookie") || "").split(";").map((part) => {
    const index = part.indexOf("=");
    if (index < 0) return ["", ""];
    const value = part.slice(index + 1).trim();
    try { return [part.slice(0, index).trim(), decodeURIComponent(value)]; }
    catch { return [part.slice(0, index).trim(), value]; }
  }).filter(([key]) => key));
}

export function createOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function createSessionCookieValue({ sub, email }, secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ sub, email, exp: Math.floor(now / 1000) + SESSION_SECONDS })).toString("base64url");
  return `${payload}.${hmac(payload, secret)}`;
}

export function readSessionCookie(value, secret, now = Date.now()) {
  if (!value || !secret) return null;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra || !safeEqual(signature, hmac(payload, secret))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof session.sub !== "string" || typeof session.email !== "string" || !Number.isInteger(session.exp) || session.exp <= Math.floor(now / 1000)) return null;
    return { sub: session.sub, email: session.email.toLowerCase(), exp: session.exp };
  } catch {
    return null;
  }
}

export function isValidOAuthState(cookieValue, returnedState) {
  return Boolean(cookieValue && returnedState && safeEqual(cookieValue, returnedState));
}

export function cookieOptions({ secure = false, maxAge = SESSION_SECONDS } = {}) {
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export function encryptionKey(encoded = process.env.GMAIL_TOKEN_ENCRYPTION_KEY) {
  if (!encoded) throw new Error("Gmail token encryption is not configured.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return key;
}

export function encryptRefreshToken(token, encodedKey) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(encodedKey), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${ciphertext.toString("base64url")}`;
}

export function decryptRefreshToken(value, encodedKey) {
  const [version, ivText, tagText, ciphertextText, extra] = String(value || "").split(":");
  if (version !== "v1" || !ivText || !tagText || !ciphertextText || extra) throw new Error("Stored Gmail token is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(encodedKey), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64url")), decipher.final()]).toString("utf8");
}

export function secureCookieFlag(env = process.env) {
  return env.NODE_ENV === "production" || env.GMAIL_COOKIE_SECURE === "true";
}
