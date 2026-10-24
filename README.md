# CollabDesk

CollabDesk is a creator-brand collaboration desk for one creator. This checkout contains the React/Vite frontend, Node.js/Hono API, deterministic pricing helpers, Supabase persistence, and a Gmail inbox integration using Google OAuth and Gmail push notifications. Production API access is restricted to the configured creator's Google account.

## Run the API locally

Requirements: Node.js 20 or later.

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Vite forwards `/api` requests to the API at `http://127.0.0.1:3001`. The local API is bound to loopback. Local runs without Gmail credentials use the seeded demo workspace. Production runs require Gmail OAuth configuration and a single allowed creator email; the API rejects workspace requests until that configuration is complete.

To enable model-assisted email parsing and reply drafting, set `OPENAI_API_KEY` in the server process environment. The app uses `gpt-4o-mini`; when the key is missing or the provider fails, the API identifies deterministic fallback responses with `source: "fallback"`.

When the key is configured, email parsing sends the pasted email text to OpenAI. Reply drafting sends saved deal details, not the original email body. The Inbox and deal reply screens disclose this before the user runs those actions.

The compact **Ask your desk** assistant answers questions about rates, deal follow-ups, and content performance using saved workspace data. Without an OpenAI key, it returns clearly labeled deterministic workspace insights. When configured, it sends the question and a bounded summary of creator rates, deals, and post metrics to OpenAI; raw email text is not included. The assistant never sends replies or changes deal data.

For a frontend on another local port, set `ALLOWED_ORIGINS` to a comma-separated list of exact origins. The defaults are `http://localhost:5173` and `http://127.0.0.1:5173`. Set `HOST` only when intentionally changing the listen address. `PORT` defaults to `3001`.

Demo path: **Inbox → Café Ramwadi → Parse email → Counter → move to Negotiating**. Rates and lowball decisions are computed in code; the model only extracts email details and writes reply text.

File storage is the default. The demo data is in `server/data/db.json`; set `COLLABDESK_DB_PATH` to use another local JSON file. Concurrent in-process mutations are serialized and writes use atomic file replacement.

### Use Supabase Postgres

1. The `creater_production` Supabase project (`https://mmzioyebwkdpkinuhlas.supabase.co`) already has the `collabdesk_state` migration applied. For a different project, run [`supabase/migrations/202610230001_collabdesk_state.sql`](supabase/migrations/202610230001_collabdesk_state.sql) in its SQL editor.
2. Set these variables in the **backend server environment**:

   ```sh
   export DATABASE_PROVIDER=supabase
   export SUPABASE_URL=https://mmzioyebwkdpkinuhlas.supabase.co
   export SUPABASE_SECRET_KEY=sb_secret_...
   ```

   Use the project URL and a Supabase secret key from the project Connect/API Keys page. The secret key is server-only and bypasses row-level policies; never put it in browser code or commit it. Supabase [recommends secret keys only in server-side code](https://supabase.com/docs/guides/getting-started/api-keys). The migration enables RLS and grants table access only to the backend `service_role`.

3. Start the API. On first database access, CollabDesk copies the current local JSON state into the empty Supabase state row. Later reads and writes use Supabase. Updates use a revision check and retry to avoid lost writes across server instances.

The data is currently stored as one JSONB state row to match the existing single-creator data model. This is not multi-tenant storage. Add authentication and per-user rows/policies before using it for multiple creators. The live schema and its grants have been verified. The backend still needs `DATABASE_PROVIDER=supabase` and a Supabase secret key in its runtime environment before application requests use the live database; the secret key is not available through the Supabase project connection and must never be committed or put in browser code.

## Run backend tests

```sh
npm test
```

The tests use a temporary copy of the seed data and do not alter the checked-in demo database.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| GET, PUT | `/api/creator` | Read or update the demo creator profile and rates |
| GET | `/api/deals` | List deals with current rate quotes |
| GET | `/api/deals/:id` | Read a deal |
| PATCH | `/api/deals/:id` | Update a deal status |
| POST | `/api/inbox/parse` | Parse an email into a saved deal |
| POST | `/api/deals/:id/rate` | Recalculate a deal quote |
| POST | `/api/deals/:id/reply` | Draft an accept, counter, decline, or clarification reply |
| GET | `/api/content` | Read seeded demo posts and reach averages |
| GET | `/api/today` | Read action suggestions and deal counts |
| GET | `/api/samples` | Read sample collaboration emails |
| POST | `/api/assistant` | Answer a bounded question using workspace facts; limited to 8 requests per minute per client key |
| GET | `/api/gmail/status` | Report whether Gmail is configured and connected |
| GET | `/api/gmail/connect` | Begin Google OAuth for the approved creator account |
| GET | `/api/gmail/callback` | Validate OAuth state, save encrypted refresh token, and start initial sync |
| GET | `/api/gmail/messages` | List the connected creator's recent synced messages |
| POST | `/api/gmail/disconnect` | Stop Gmail watch, revoke Google access, and remove the cached mailbox |
| POST | `/api/gmail/webhook` | Verify Pub/Sub OIDC and sync Gmail history changes |
| GET | `/api/gmail/renew` | Renew Gmail watch and catch up changes; called daily by Vercel Cron |

The app has a single-owner Google OAuth session in production, but no multi-user workspace boundaries, real social metrics, publishing, invoicing, or voice/audio routes. Local demo mode is unauthenticated and should remain bound to loopback. Values in `server/data/db.json` are demo fixtures, not connected platform analytics.

### Connect Gmail for incoming brand emails

The Inbox offers a **Connect Gmail** button when the required server configuration is present. After authorization, CollabDesk imports up to 300 recent Inbox messages, stores a protected refresh token and cached message text in Supabase, and checks Gmail for changes through Google Cloud Pub/Sub. The Inbox refreshes its message list every five seconds. Cached message bodies are deleted after 30 days. Gmail watch subscriptions are renewed daily by the Vercel Cron job.

This checkout is a **single-creator workspace**: set `GMAIL_ALLOWED_EMAIL` to the one Google account permitted to use it. Production routes require that account's signed, HTTP-only session. Do not enable the app for multiple creators until workspace deals and creator profiles are also stored per user.

#### Google Cloud setup

1. In Google Cloud Console, create or select a project and enable **Gmail API**. Configure the OAuth consent screen and create a **Web application** OAuth client. Add `https://YOUR_APP_DOMAIN/api/gmail/callback` as an authorized redirect URI. For local testing, add `http://127.0.0.1:3001/api/gmail/callback` and use that exact host for the frontend too.
2. Create a Cloud Pub/Sub topic and grant `gmail-api-push@system.gserviceaccount.com` permission to publish to it.
3. Create an authenticated push subscription to `https://YOUR_APP_DOMAIN/api/gmail/webhook`. Set its OIDC service account and audience to match `PUBSUB_PUSH_SERVICE_ACCOUNT` and `PUBSUB_PUSH_OIDC_AUDIENCE`. The Pub/Sub service agent needs permission to mint an OIDC token for that account.
4. Set the variables in `.env.example` in the backend's local environment and in Vercel's **Production** environment. Generate `GMAIL_SESSION_SECRET` and `GMAIL_CRON_SECRET` as random secrets. Generate `GMAIL_TOKEN_ENCRYPTION_KEY` with `openssl rand -base64 32`; keep it stable because it decrypts stored refresh tokens. Set `GOOGLE_REDIRECT_URI` and `APP_ORIGIN` to the exact app host, and `GMAIL_ALLOWED_EMAIL` to the creator account.
5. The additive migration [`supabase/migrations/20261024061151_gmail_inbox_sync.sql`](supabase/migrations/20261024061151_gmail_inbox_sync.sql) has been applied to the connected project. For another Supabase project, apply the same file. The tables have RLS enabled and no browser-role grants; backend service-key access is required. Keep `SUPABASE_SECRET_KEY` server-only.
6. Redeploy after setting the Vercel variables. Once Google OAuth returns to `/inbox`, Gmail starts its initial sync. The Vercel Cron job calls `/api/gmail/renew` daily; set `GMAIL_CRON_SECRET` to Vercel's `CRON_SECRET` value or set both to the same secret.

Gmail push notifications carry a history cursor, not the email body. CollabDesk uses Gmail's history API to fetch the actual changes. Google may delay or drop a notification, so scheduled watch renewal also performs a catch-up sync. Google's `gmail.readonly` scope is restricted and requires OAuth app verification for public use; storing or transmitting restricted-scope data can require a security assessment. Review [Gmail scope requirements](https://developers.google.com/workspace/gmail/api/auth/scopes), [server-side OAuth](https://developers.google.com/workspace/gmail/api/auth/web-server), and [push notification setup](https://developers.google.com/workspace/gmail/api/guides/push) before inviting other users.

### Voice assistant

The Voice assistant page shows the incoming Twilio webhook URL and reports whether signature validation, human transfer, and an AI provider are configured. Set `TWILIO_AUTH_TOKEN` and `VOICE_TRANSFER_NUMBER` as private Vercel Production variables, then point the Twilio number's incoming call webhook to `https://YOUR_APP_DOMAIN/api/voice/incoming` with HTTP POST. `VOICE_WEBHOOK_BASE_URL` should use the app's HTTPS origin. Without an AI provider, calls use the built-in short response fallback. For AI responses, configure `OPENAI_API_KEY` or an internet-reachable Ollama-compatible `OLLAMA_CHAT_URL`; set `OLLAMA_API_KEY` if that endpoint requires a bearer token. `localhost` is not reachable from Vercel. The webhook verifies Twilio signatures and rejects requests until the auth token is configured.
