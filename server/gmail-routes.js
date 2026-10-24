import { timingSafeEqual } from "node:crypto";
import { createGmailStore } from "./gmail-store.js";
import {
  cookieOptions, createOAuthState, createSessionCookieValue, encryptionKey, isValidOAuthState,
  OAUTH_STATE_COOKIE, readCookies, readSessionCookie, SESSION_COOKIE, secureCookieFlag,
} from "./gmail-security.js";
import {
  authorizationUrl, createGmailService, decodePubSubNotification, exchangeAuthorizationCode,
  gmailConfig, isGmailConfigured, verifyGoogleIdentity, verifyPubSubRequest,
} from "./gmail-service.js";

const APP_CALLBACKS = new Set([
  "/api/health", "/api/gmail/status", "/api/gmail/connect", "/api/gmail/callback",
  "/api/gmail/webhook", "/api/gmail/renew",
  // These endpoints expose setup status or validate their own provider signature.
  "/api/voice/status", "/api/voice/incoming", "/api/voice/turn", "/api/voice/transfer-result",
]);

let storeInstance;

function getStore(env) {
  if (env.DATABASE_PROVIDER !== "supabase") throw new Error("Set DATABASE_PROVIDER=supabase before connecting Gmail.");
  storeInstance ||= createGmailStore({ url: env.SUPABASE_URL, secretKey: env.SUPABASE_SECRET_KEY });
  return storeInstance;
}

function getService(env, config) {
  return createGmailService({ store: getStore(env), config });
}

function configReadyForRuntime(env, config) {
  let validEncryptionKey = false;
  try { encryptionKey(config.encryptionKey); validEncryptionKey = true; } catch { /* Keep production locked until key setup is fixed. */ }
  return isGmailConfigured(config) && config.sessionSecret.length >= 32 && validEncryptionKey && Boolean(config.appOrigin &&
    config.pubSubTopic && config.pubSubAudience && config.pubSubServiceAccount && config.cronSecret &&
    env.DATABASE_PROVIDER === "supabase" && env.SUPABASE_URL && env.SUPABASE_SECRET_KEY);
}

function sessionFromRequest(request, config) {
  if (!config.sessionSecret) return null;
  return readSessionCookie(readCookies(request)[SESSION_COOKIE], config.sessionSecret);
}

function setCookie(c, name, value, options) {
  c.header("Set-Cookie", `${name}=${encodeURIComponent(value)}; ${options}`, { append: true });
}

function sameSecret(left, right) {
  if (!left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function missingConfig(env, config) {
  const missing = [];
  for (const [key, value] of Object.entries({
    GOOGLE_CLIENT_ID: config.clientId,
    GOOGLE_CLIENT_SECRET: config.clientSecret,
    GOOGLE_REDIRECT_URI: config.redirectUri,
    GMAIL_ALLOWED_EMAIL: config.allowedEmail,
    GMAIL_SESSION_SECRET: config.sessionSecret,
    GMAIL_TOKEN_ENCRYPTION_KEY: config.encryptionKey,
    GMAIL_PUBSUB_TOPIC: config.pubSubTopic,
    PUBSUB_PUSH_OIDC_AUDIENCE: config.pubSubAudience,
    PUBSUB_PUSH_SERVICE_ACCOUNT: config.pubSubServiceAccount,
    GMAIL_CRON_SECRET: config.cronSecret,
    APP_ORIGIN: config.appOrigin,
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_SECRET_KEY: env.SUPABASE_SECRET_KEY,
  })) if (!value) missing.push(key);
  if (config.sessionSecret && config.sessionSecret.length < 32) missing.push("GMAIL_SESSION_SECRET (32+ characters)");
  try { encryptionKey(config.encryptionKey); } catch { if (config.encryptionKey) missing.push("GMAIL_TOKEN_ENCRYPTION_KEY (base64 32-byte key)"); }
  if (env.DATABASE_PROVIDER !== "supabase") missing.push("DATABASE_PROVIDER=supabase");
  return missing;
}

export function gmailAuthRequired(env = process.env) {
  return env.NODE_ENV === "production" || env.GMAIL_AUTH_REQUIRED === "true";
}

export function registerGmailRoutes(app, { env = process.env } = {}) {
  const config = gmailConfig(env);

  app.use("/api/*", async (c, next) => {
    if (!gmailAuthRequired(env) || APP_CALLBACKS.has(c.req.path)) return next();
    if (!configReadyForRuntime(env, config)) {
      return c.json({ error: "Creator workspace sign-in is not configured for this deployment." }, 503);
    }
    const session = sessionFromRequest(c.req.raw, config);
    if (!session || session.email !== config.allowedEmail) return c.json({ error: "Connect the approved Gmail account to continue." }, 401);
    c.set("gmailSession", session);
    await next();
  });

  app.get("/api/gmail/status", async (c) => {
    const session = sessionFromRequest(c.req.raw, config);
    if (!session || !config.sessionSecret || !env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
      return c.json({ configured: configReadyForRuntime(env, config), connected: false });
    }
    try {
      const account = await getStore(env).getAccount(session.sub);
      return c.json({ configured: configReadyForRuntime(env, config), connected: Boolean(account), email: account?.email || null });
    } catch {
      return c.json({ configured: false, connected: false, error: "Gmail storage is not ready." }, 503);
    }
  });

  app.get("/api/gmail/connect", (c) => {
    const missing = missingConfig(env, config);
    if (missing.length) return c.json({ error: `Gmail setup is incomplete: ${missing.join(", ")}.` }, 503);
    if (config.sessionSecret.length < 32) return c.json({ error: "GMAIL_SESSION_SECRET must contain at least 32 characters." }, 503);
    try {
      // Validate the encryption key before redirecting the user to Google.
      getService(env, config);
      const state = createOAuthState();
      setCookie(c, OAUTH_STATE_COOKIE, state, cookieOptions({ secure: secureCookieFlag(env), maxAge: 600 }));
      return c.redirect(authorizationUrl(config, state), 302);
    } catch (error) {
      return c.json({ error: error.message }, 503);
    }
  });

  app.get("/api/gmail/callback", async (c) => {
    const returnedState = c.req.query("state");
    const cookieState = readCookies(c.req.raw)[OAUTH_STATE_COOKIE];
    setCookie(c, OAUTH_STATE_COOKIE, "", cookieOptions({ secure: secureCookieFlag(env), maxAge: 0 }));
    const errorParam = c.req.query("error");
    if (errorParam) return c.redirect(`${config.appOrigin}/inbox?gmail_error=cancelled`, 302);
    if (!isValidOAuthState(cookieState, returnedState)) return c.redirect(`${config.appOrigin}/inbox?gmail_error=state`, 302);
    if (!c.req.query("code") || !isGmailConfigured(config)) return c.redirect(`${config.appOrigin}/inbox?gmail_error=setup`, 302);
    try {
      const tokens = await exchangeAuthorizationCode(c.req.query("code"), config);
      const identity = await verifyGoogleIdentity(tokens.id_token, config);
      const service = getService(env, config);
      await service.connectMailbox(identity, tokens);
      setCookie(c, SESSION_COOKIE, createSessionCookieValue(identity, config.sessionSecret), cookieOptions({ secure: secureCookieFlag(env) }));
      return c.redirect(`${config.appOrigin}/inbox?gmail=connected`, 302);
    } catch (error) {
      const code = /not authorized/i.test(error.message) ? "account" : /refresh token/i.test(error.message) ? "refresh" : "connect";
      return c.redirect(`${config.appOrigin}/inbox?gmail_error=${code}`, 302);
    }
  });

  app.get("/api/gmail/messages", async (c) => {
    const session = sessionFromRequest(c.req.raw, config);
    if (!session) return c.json({ error: "Connect Gmail to view messages." }, 401);
    try {
      const messages = await getService(env, config).messagesFor(session.sub);
      return c.json({ messages });
    } catch {
      return c.json({ error: "Could not load Gmail messages." }, 503);
    }
  });

  app.get("/api/gmail/messages/:id", async (c) => {
    const session = sessionFromRequest(c.req.raw, config);
    if (!session) return c.json({ error: "Connect Gmail to view messages." }, 401);
    try {
      const message = await getStore(env).getMessage(session.sub, c.req.param("id"));
      if (!message) return c.json({ error: "Email not found." }, 404);
      return c.json({ message });
    } catch {
      return c.json({ error: "Could not load this email." }, 503);
    }
  });

  app.post("/api/gmail/disconnect", async (c) => {
    const session = sessionFromRequest(c.req.raw, config);
    if (!session) return c.json({ error: "Connect Gmail before disconnecting it." }, 401);
    try {
      await getService(env, config).disconnect(session.sub);
      return c.json({ disconnected: true });
    } catch {
      return c.json({ error: "Could not disconnect Gmail. Try again." }, 503);
    }
  });

  app.post("/api/gmail/webhook", async (c) => {
    if (!await verifyPubSubRequest(c.req.raw, config)) return c.json({ error: "Unauthorized Pub/Sub request." }, 401);
    let body;
    try { body = await c.req.json(); } catch { return c.json({ error: "Invalid Pub/Sub payload." }, 400); }
    const notification = decodePubSubNotification(body);
    if (!notification) return c.json({ error: "Invalid Gmail notification." }, 400);
    try {
      await getService(env, config).handleNotification(notification.email, notification.historyId);
      return c.body(null, 204);
    } catch {
      // A non-success response makes Pub/Sub retry this notification.
      return c.json({ error: "Gmail sync failed; Pub/Sub should retry." }, 500);
    }
  });

  app.get("/api/gmail/renew", async (c) => {
    const bearer = /^Bearer\s+(.+)$/i.exec(c.req.header("authorization") || "")?.[1];
    if (!sameSecret(bearer, config.cronSecret)) return c.json({ error: "Unauthorized scheduled request." }, 401);
    try {
      const accounts = await getService(env, config).renewAll();
      return c.json({ renewed: accounts });
    } catch {
      return c.json({ error: "Gmail watch renewal failed." }, 500);
    }
  });

  return app;
}
