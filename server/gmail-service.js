import { decryptRefreshToken, encryptRefreshToken } from "./gmail-security.js";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const SCOPES = ["openid", "email", "profile", "https://www.googleapis.com/auth/gmail.readonly"];

function required(value, name) {
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function gmailConfig(env = process.env) {
  // Vercel exposes the project's stable production hostname separately from
  // the deployment-specific VERCEL_URL. Prefer it so OAuth callbacks from
  // production always return to the canonical app domain.
  const vercelHost = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL || "";
  const vercelOrigin = vercelHost ? `https://${vercelHost.replace(/^https?:\/\//, "")}` : "";
  const appOrigin = env.APP_ORIGIN || (env.NODE_ENV === "production"
    ? vercelOrigin
    : "http://127.0.0.1:5173");
  return {
    clientId: env.GOOGLE_CLIENT_ID || "",
    clientSecret: env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: env.GOOGLE_REDIRECT_URI || (appOrigin ? `${appOrigin}/api/gmail/callback` : ""),
    allowedEmail: (env.GMAIL_ALLOWED_EMAIL || "").trim().toLowerCase(),
    sessionSecret: env.GMAIL_SESSION_SECRET || "",
    encryptionKey: env.GMAIL_TOKEN_ENCRYPTION_KEY || "",
    pubSubTopic: env.GMAIL_PUBSUB_TOPIC || "",
    pubSubAudience: env.PUBSUB_PUSH_OIDC_AUDIENCE || "",
    pubSubServiceAccount: (env.PUBSUB_PUSH_SERVICE_ACCOUNT || "").toLowerCase(),
    cronSecret: env.GMAIL_CRON_SECRET || env.CRON_SECRET || "",
    appOrigin,
  };
}

export function isGmailConfigured(config) {
  return Boolean(config.clientId && config.clientSecret && config.redirectUri && config.allowedEmail &&
    config.sessionSecret && config.encryptionKey);
}

export function authorizationUrl(config, state) {
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: required(config.clientId, "GOOGLE_CLIENT_ID"),
    redirect_uri: required(config.redirectUri, "GOOGLE_REDIRECT_URI"),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return url.toString();
}

async function parseResponse(response, label) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`${label} failed (HTTP ${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function exchangeAuthorizationCode(code, config, fetcher = fetch) {
  const response = await fetcher(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: required(config.clientId, "GOOGLE_CLIENT_ID"),
      client_secret: required(config.clientSecret, "GOOGLE_CLIENT_SECRET"),
      redirect_uri: required(config.redirectUri, "GOOGLE_REDIRECT_URI"),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(12_000),
  });
  return parseResponse(response, "Google OAuth token exchange");
}

export async function verifyGoogleIdentity(idToken, config, fetcher = fetch, now = Date.now()) {
  if (!idToken) throw new Error("Google did not return an identity token.");
  const target = new URL(TOKEN_INFO_URL);
  target.searchParams.set("id_token", idToken);
  const response = await fetcher(target, { signal: AbortSignal.timeout(10_000) });
  const claims = await parseResponse(response, "Google identity verification");
  const expiresAt = Number(claims.exp) * 1000;
  if (claims.iss !== "https://accounts.google.com" || claims.aud !== config.clientId ||
    !["true", true].includes(claims.email_verified) || !claims.email || !claims.sub || !Number.isFinite(expiresAt) || expiresAt <= now) {
    throw new Error("Google identity token could not be verified.");
  }
  const email = claims.email.trim().toLowerCase();
  if (email !== config.allowedEmail) throw new Error("This Gmail account is not authorized for this CollabDesk workspace.");
  return { sub: claims.sub, email };
}

export async function verifyPubSubRequest(request, config, fetcher = fetch, now = Date.now()) {
  const token = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") || "")?.[1];
  if (!token || !config.pubSubAudience || !config.pubSubServiceAccount) return false;
  const target = new URL(TOKEN_INFO_URL);
  target.searchParams.set("id_token", token);
  try {
    const response = await fetcher(target, { signal: AbortSignal.timeout(8_000) });
    const claims = await response.json();
    return response.ok && claims.iss === "https://accounts.google.com" &&
      claims.aud === config.pubSubAudience && ["true", true].includes(claims.email_verified) &&
      String(claims.email || "").toLowerCase() === config.pubSubServiceAccount &&
      Number(claims.exp) * 1000 > now;
  } catch {
    return false;
  }
}

function decodeBody(value) {
  if (!value) return "";
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function bodyParts(part, output = { plain: [], html: [] }) {
  if (part?.body?.data) {
    const content = decodeBody(part.body.data);
    if (part.mimeType === "text/plain") output.plain.push(content);
    else if (part.mimeType === "text/html") output.html.push(content);
  }
  for (const child of part?.parts || []) bodyParts(child, output);
  return output;
}

function cleanHtml(html) {
  return html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(?:div|p|br|li|tr|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/[\t ]+/g, " ").replace(/\n[ \t]+/g, "\n").trim();
}

export function normalizeGmailMessage(message, googleSub) {
  const headers = Object.fromEntries((message.payload?.headers || []).map((header) => [header.name.toLowerCase(), header.value]));
  const sender = headers.from || "";
  const email = /<([^>]+)>/.exec(sender)?.[1] || sender;
  const name = sender.replace(/<[^>]*>/g, "").replace(/^\s*["']|["']\s*$/g, "").trim();
  const parts = bodyParts(message.payload);
  const bodyText = (parts.plain.join("\n") || cleanHtml(parts.html.join("\n"))).slice(0, 50_000);
  return {
    google_sub: googleSub,
    gmail_message_id: message.id,
    thread_id: message.threadId || message.id,
    from_name: name,
    from_email: email.toLowerCase(),
    subject: (headers.subject || "(no subject)").slice(0, 998),
    snippet: (message.snippet || "").slice(0, 1000),
    body_text: bodyText,
    label_ids: message.labelIds || [],
    internal_date: new Date(Number(message.internalDate) || Date.now()).toISOString(),
  };
}

function isOlderOrEqual(left, right) {
  try { return BigInt(left) <= BigInt(right); } catch { return left === right; }
}

export function createGmailService({ store, config, fetcher = fetch, now = Date.now }) {
  async function accessToken(account) {
    const refreshToken = decryptRefreshToken(account.refresh_token_ciphertext, config.encryptionKey);
    const response = await fetcher(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: required(config.clientId, "GOOGLE_CLIENT_ID"),
        client_secret: required(config.clientSecret, "GOOGLE_CLIENT_SECRET"),
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(12_000),
    });
    const data = await parseResponse(response, "Gmail access token refresh");
    if (!data.access_token) throw new Error("Google did not return an access token.");
    return data.access_token;
  }

  async function gmailRequest(token, path, { method = "GET", body } = {}) {
    const headers = { Authorization: `Bearer ${token}` };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const response = await fetcher(`${GMAIL_API}${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    return parseResponse(response, "Gmail API request");
  }

  async function getMessages(token, ids, sub) {
    const result = [];
    for (let index = 0; index < ids.length; index += 8) {
      const page = await Promise.all(ids.slice(index, index + 8).map(({ id }) =>
        gmailRequest(token, `/messages/${encodeURIComponent(id)}?format=full`)));
      result.push(...page.map((message) => normalizeGmailMessage(message, sub)));
    }
    await store.upsertMessages(result);
  }

  async function listRecent(token, sub) {
    let pageToken = "";
    let total = 0;
    do {
      const query = new URLSearchParams({ labelIds: "INBOX", q: "newer_than:30d", maxResults: "100" });
      if (pageToken) query.set("pageToken", pageToken);
      const response = await gmailRequest(token, `/messages?${query}`);
      const messages = response.messages || [];
      await getMessages(token, messages, sub);
      total += messages.length;
      pageToken = response.nextPageToken || "";
    } while (pageToken && total < 300);
    return total;
  }

  async function processChanges(account, targetHistoryId = "") {
    if (!account.history_id) return syncInitial(account);
    if (targetHistoryId && isOlderOrEqual(targetHistoryId, account.history_id)) return 0;
    const token = await accessToken(account);
    let pageToken = "";
    let latest = account.history_id;
    let changed = [];
    try {
      do {
        const query = new URLSearchParams({ startHistoryId: account.history_id, historyTypes: "messageAdded", maxResults: "500" });
        if (pageToken) query.set("pageToken", pageToken);
        const response = await gmailRequest(token, `/history?${query}`);
        latest = response.historyId || targetHistoryId || latest;
        for (const history of response.history || []) {
          for (const added of history.messagesAdded || []) {
            if ((added.message?.labelIds || []).includes("INBOX") && added.message?.id) changed.push({ id: added.message.id });
          }
        }
        pageToken = response.nextPageToken || "";
      } while (pageToken);
    } catch (error) {
      if (error.status !== 404) throw error;
      return syncInitial(account);
    }
    if (changed.length) await getMessages(token, [...new Map(changed.map((item) => [item.id, item])).values()], account.google_sub);
    if (targetHistoryId && (!latest || isOlderOrEqual(latest, targetHistoryId))) latest = targetHistoryId;
    await store.updateAccount(account.google_sub, { history_id: String(latest) });
    return changed.length;
  }

  async function syncInitial(account, { updateCursor = true } = {}) {
    const token = await accessToken(account);
    const count = await listRecent(token, account.google_sub);
    if (updateCursor) {
      const profile = await gmailRequest(token, "/profile");
      if (profile.historyId) await store.updateAccount(account.google_sub, { history_id: String(profile.historyId) });
    }
    return count;
  }

  async function startWatch(account) {
    const token = await accessToken(account);
    const watched = await gmailRequest(token, "/watch", {
      method: "POST",
      body: { topicName: required(config.pubSubTopic, "GMAIL_PUBSUB_TOPIC"), labelIds: ["INBOX"], labelFilterBehavior: "include" },
    });
    await store.updateAccount(account.google_sub, {
      history_id: account.history_id || String(watched.historyId),
      watch_expiration: new Date(Number(watched.expiration)).toISOString(),
    });
    return watched;
  }

  async function stopWatch(account) {
    const token = await accessToken(account);
    await gmailRequest(token, "/stop", { method: "POST", body: {} });
  }

  async function disconnect(sub) {
    const account = await store.getAccount(sub);
    if (!account) return;
    try { await stopWatch(account); } catch { /* A missing or expired watch is already stopped. */ }
    const refreshToken = decryptRefreshToken(account.refresh_token_ciphertext, config.encryptionKey);
    await fetcher("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
      signal: AbortSignal.timeout(8_000),
    }).catch(() => {});
    await store.deleteAccount(sub);
  }

  async function connectMailbox(identity, oauthTokens) {
    if (!oauthTokens.refresh_token) throw new Error("Google did not issue a refresh token. Disconnect CollabDesk in Google Account settings, then connect again.");
    const account = await store.saveAccount({
      google_sub: identity.sub,
      email: identity.email,
      refresh_token_ciphertext: encryptRefreshToken(oauthTokens.refresh_token, config.encryptionKey),
      history_id: null,
      watch_expiration: null,
      updated_at: new Date(now()).toISOString(),
    });
    await startWatch(account);
    const current = await store.getAccount(identity.sub);
    const initialCount = await syncInitial(current, { updateCursor: false });
    // The initial watch establishes a cursor before the full sync. Catch any
    // messages that arrived while the first page was being loaded.
    const synced = await store.getAccount(identity.sub);
    const profile = await gmailRequest(await accessToken(synced), "/profile");
    if (profile.historyId && synced.history_id) await processChanges(synced, String(profile.historyId));
    return initialCount;
  }

  async function handleNotification(email, historyId) {
    const account = await store.getAccountByEmail(email);
    if (!account) return 0;
    return processChanges(account, String(historyId));
  }

  async function renewAll() {
    const accounts = await store.listAccounts();
    for (const account of accounts) {
      const token = await accessToken(account);
      const profile = await gmailRequest(token, "/profile");
      await processChanges(account, String(profile.historyId || account.history_id));
      await startWatch(await store.getAccount(account.google_sub));
    }
    await store.deleteExpiredMessages(30);
    return accounts.length;
  }

  async function messagesFor(sub) {
    return store.listMessages(sub, 60);
  }

  return { connectMailbox, handleNotification, renewAll, messagesFor, stopWatch, disconnect };
}

export function decodePubSubNotification(body) {
  const encoded = body?.message?.data;
  if (typeof encoded !== "string" || encoded.length > 16_000) return null;
  try {
    const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (typeof decoded.emailAddress !== "string" || typeof decoded.historyId !== "string") return null;
    return { email: decoded.emailAddress.toLowerCase(), historyId: decoded.historyId };
  } catch {
    return null;
  }
}
