import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Hono } from "hono";
import {
  createOAuthState, createSessionCookieValue, decryptRefreshToken, encryptRefreshToken,
  isValidOAuthState, readSessionCookie,
} from "../server/gmail-security.js";
import {
  authorizationUrl, createGmailService, decodePubSubNotification, normalizeGmailMessage,
  verifyGoogleIdentity, verifyPubSubRequest,
} from "../server/gmail-service.js";
import { gmailAuthRequired, registerGmailRoutes } from "../server/gmail-routes.js";
import { createGmailStore } from "../server/gmail-store.js";

const encryptionKey = randomBytes(32).toString("base64");

test("Gmail OAuth state and signed sessions reject tampering and expiry", () => {
  const state = createOAuthState();
  assert.equal(isValidOAuthState(state, state), true);
  assert.equal(isValidOAuthState(state, `${state}x`), false);
  const secret = randomBytes(48).toString("base64url");
  const value = createSessionCookieValue({ sub: "google-sub", email: "creator@example.com" }, secret, 1_000_000);
  assert.equal(readSessionCookie(value, secret, 1_000_001)?.email, "creator@example.com");
  assert.equal(readSessionCookie(`${value}x`, secret, 1_000_001), null);
  assert.equal(readSessionCookie(value, secret, 1_000_000 + 8 * 24 * 60 * 60 * 1000), null);
});

test("Gmail refresh tokens are encrypted with authenticated encryption", () => {
  const encrypted = encryptRefreshToken("refresh-secret", encryptionKey);
  assert.notEqual(encrypted, "refresh-secret");
  assert.equal(decryptRefreshToken(encrypted, encryptionKey), "refresh-secret");
  assert.throws(() => decryptRefreshToken(`${encrypted}x`, encryptionKey));
  assert.throws(() => encryptRefreshToken("x", Buffer.from("bad").toString("base64")), /32-byte/);
});

test("OAuth authorization URL asks for offline Gmail read access", () => {
  const url = new URL(authorizationUrl({
    clientId: "client-id", redirectUri: "https://collabdesk.example/api/gmail/callback",
  }, "oauth-state"));
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.get("state"), "oauth-state");
  assert.match(url.searchParams.get("scope"), /gmail\.readonly/);
  assert.equal(url.searchParams.get("response_type"), "code");
});

test("Google identity verification checks audience, expiration, and creator allowlist", async () => {
  const fetcher = async () => new Response(JSON.stringify({
    iss: "https://accounts.google.com", aud: "client-id", email_verified: "true",
    email: "Creator@Example.com", sub: "google-sub", exp: String(Date.now() / 1000 + 300),
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  const identity = await verifyGoogleIdentity("id-token", { clientId: "client-id", allowedEmail: "creator@example.com" }, fetcher);
  assert.deepEqual(identity, { sub: "google-sub", email: "creator@example.com" });
  await assert.rejects(verifyGoogleIdentity("id-token", { clientId: "other-client", allowedEmail: "creator@example.com" }, fetcher), /could not be verified/);
  await assert.rejects(verifyGoogleIdentity("id-token", { clientId: "client-id", allowedEmail: "other@example.com" }, fetcher), /not authorized/);
});

test("Pub/Sub bearer and Gmail notification payloads are validated", async () => {
  const config = { pubSubAudience: "https://app.example/api/gmail/webhook", pubSubServiceAccount: "push@example.iam.gserviceaccount.com" };
  const fetcher = async () => new Response(JSON.stringify({
    iss: "https://accounts.google.com", aud: config.pubSubAudience,
    email: config.pubSubServiceAccount, email_verified: "true", exp: String(Date.now() / 1000 + 60),
  }), { status: 200 });
  assert.equal(await verifyPubSubRequest(new Request("https://app.example/api/gmail/webhook", { headers: { Authorization: "Bearer signed" } }), config, fetcher), true);
  assert.equal(await verifyPubSubRequest(new Request("https://app.example/api/gmail/webhook"), config, fetcher), false);
  const data = Buffer.from(JSON.stringify({ emailAddress: "creator@example.com", historyId: "501" })).toString("base64url");
  assert.deepEqual(decodePubSubNotification({ message: { data } }), { email: "creator@example.com", historyId: "501" });
  assert.equal(decodePubSubNotification({ message: { data: "not-json" } }), null);
});

test("Gmail messages are normalized to safe text records", () => {
  const body = Buffer.from("The new café campaign details.").toString("base64url");
  const normalized = normalizeGmailMessage({
    id: "message-1", threadId: "thread-1", snippet: "The new café campaign details.",
    internalDate: "1790000000000", labelIds: ["INBOX"],
    payload: { headers: [
      { name: "From", value: "Café Ramwadi <hello@example.com>" },
      { name: "Subject", value: "Creator partnership" },
    ], mimeType: "text/plain", body: { data: body } },
  }, "google-sub");
  assert.equal(normalized.google_sub, "google-sub");
  assert.equal(normalized.from_email, "hello@example.com");
  assert.equal(normalized.subject, "Creator partnership");
  assert.equal(normalized.body_text, "The new café campaign details.");
  assert.deepEqual(normalized.label_ids, ["INBOX"]);
});

test("connecting a mailbox starts its watch before syncing and advances history", async () => {
  const account = { google_sub: "sub-1", email: "creator@example.com", history_id: null };
  const store = {
    async saveAccount(value) { Object.assign(account, value); return { ...account }; },
    async getAccount() { return { ...account }; },
    async updateAccount(_sub, changes) { Object.assign(account, changes); return { ...account }; },
    async upsertMessages(rows) { account.savedMessages = [...(account.savedMessages || []), ...rows]; },
    async getAccountByEmail() { return { ...account }; },
    async listMessages() { return []; },
    async listAccounts() { return []; },
    async deleteExpiredMessages() {},
    async deleteAccount() {},
  };
  const config = {
    clientId: "client-id", clientSecret: "client-secret", pubSubTopic: "projects/demo/topics/gmail",
    encryptionKey, allowedEmail: "creator@example.com",
  };
  const calls = [];
  const fetcher = async (input) => {
    const url = new URL(input);
    calls.push(url.pathname);
    if (url.hostname === "oauth2.googleapis.com") return new Response(JSON.stringify({ access_token: "access" }), { status: 200 });
    if (url.pathname.endsWith("/watch")) return new Response(JSON.stringify({ historyId: "100", expiration: String(Date.now() + 7 * 86400000) }), { status: 200 });
    if (url.pathname.endsWith("/messages")) return new Response(JSON.stringify({ messages: [] }), { status: 200 });
    if (url.pathname.endsWith("/profile")) return new Response(JSON.stringify({ historyId: "101" }), { status: 200 });
    if (url.pathname.endsWith("/history")) return new Response(JSON.stringify({ historyId: "101", history: [] }), { status: 200 });
    throw new Error(`Unexpected Gmail API call: ${url}`);
  };
  const service = createGmailService({ store, config, fetcher });
  assert.equal(await service.connectMailbox({ sub: "sub-1", email: "creator@example.com" }, { refresh_token: "refresh-token" }), 0);
  assert.ok(calls.findIndex((path) => path.endsWith("/users/me/watch")) < calls.findIndex((path) => path.endsWith("/users/me/messages")));
  assert.equal(account.history_id, "101");
  assert.equal(account.savedMessages?.length || 0, 0);
});

test("production workspace auth fails closed until configuration is complete", async () => {
  assert.equal(gmailAuthRequired({ NODE_ENV: "production" }), true);
  const app = new Hono();
  registerGmailRoutes(app, { env: { NODE_ENV: "production", DATABASE_PROVIDER: "file" } });
  app.get("/api/creator", (c) => c.json({ name: "CollabDesk creator" }));
  app.get("/api/deals", (c) => c.json({ deals: [] }));
  const status = await app.request("/api/gmail/status");
  assert.equal(status.status, 200);
  assert.equal((await status.json()).configured, false);
  const workspace = await app.request("/api/creator");
  assert.equal(workspace.status, 503);
  assert.match((await workspace.json()).error, /sign-in is not configured/);
  assert.equal((await app.request("/api/deals")).status, 503);
  const messages = await app.request("/api/gmail/messages");
  assert.equal(messages.status, 503);
});

test("production workspace APIs require the approved creator session when configured", async () => {
  const secret = randomBytes(48).toString("base64url");
  const env = {
    NODE_ENV: "production", DATABASE_PROVIDER: "supabase", SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SECRET_KEY: "server-only", GOOGLE_CLIENT_ID: "client-id", GOOGLE_CLIENT_SECRET: "client-secret",
    GOOGLE_REDIRECT_URI: "https://collabdesk.example/api/gmail/callback", GMAIL_ALLOWED_EMAIL: "creator@example.com",
    GMAIL_SESSION_SECRET: secret, GMAIL_TOKEN_ENCRYPTION_KEY: encryptionKey,
    GMAIL_PUBSUB_TOPIC: "projects/project/topics/gmail", PUBSUB_PUSH_OIDC_AUDIENCE: "https://collabdesk.example/api/gmail/webhook",
    PUBSUB_PUSH_SERVICE_ACCOUNT: "push@project.iam.gserviceaccount.com", GMAIL_CRON_SECRET: "cron-secret",
    APP_ORIGIN: "https://collabdesk.example",
  };
  const app = new Hono();
  registerGmailRoutes(app, { env });
  app.get("/api/creator", (c) => c.json({ name: "Aanya" }));
  const unauthenticated = await app.request("/api/creator");
  assert.equal(unauthenticated.status, 401);
  const session = createSessionCookieValue({ sub: "google-sub", email: "creator@example.com" }, secret);
  const authorized = await app.request("/api/creator", { headers: { Cookie: `collabdesk_session=${session}` } });
  assert.equal(authorized.status, 200);
  assert.deepEqual(await authorized.json(), { name: "Aanya" });
  const otherCreator = createSessionCookieValue({ sub: "other-sub", email: "other@example.com" }, secret);
  assert.equal((await app.request("/api/creator", { headers: { Cookie: `collabdesk_session=${otherCreator}` } })).status, 401);
});

test("Gmail message storage scopes queries by account and separates summaries from bodies", async () => {
  const calls = [];
  const store = createGmailStore({
    url: "https://project.supabase.co", secretKey: "server-only-secret",
    fetcher: async (input, options) => {
      calls.push({ url: new URL(input), options });
      return new Response(JSON.stringify([{ gmail_message_id: "message-1" }]), { status: 200 });
    },
  });
  await store.listMessages("google-sub", 60);
  assert.equal(calls[0].url.searchParams.get("google_sub"), "eq.google-sub");
  assert.doesNotMatch(calls[0].url.searchParams.get("select"), /body_text/);
  await store.getMessage("google-sub", "message-1");
  assert.equal(calls[1].url.searchParams.get("gmail_message_id"), "eq.message-1");
  assert.match(calls[1].url.searchParams.get("select"), /body_text/);
  await store.upsertMessages(Array.from({ length: 21 }, (_, index) => ({ google_sub: "sub", gmail_message_id: String(index) })));
  assert.equal(calls.length, 4);
  assert.equal(calls[2].options.method, "POST");
  assert.equal(JSON.parse(calls[2].options.body).length, 20);
  assert.equal(JSON.parse(calls[3].options.body).length, 1);
});
