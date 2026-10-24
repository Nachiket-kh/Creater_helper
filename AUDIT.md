# CollabDesk project audit

## Current full-project review — 2026-10-24

The latest GitHub `main` commit was fetched and checked. The production Vercel project lists the deployments for recent commits (`3064586`, `5cfaeca`, and `e0e689f`) as **ERROR**; Vercel's deployment-detail/log endpoints returned 404, so the exact platform-side failure is not available from this connection. Local build and tests pass, which means those results alone do not prove the deployment is healthy.

| User-facing feature | Result | Real limit |
| --- | --- | --- |
| Today, Inbox, Deals, deal detail, media kit | Working against the demo API | Single creator and seeded demo workspace; local JSON by default. |
| Email parsing, rate check, reply drafting | Working with deterministic fallbacks | AI requires a configured provider; reply drafts are copied, not sent or saved. |
| Reel script writer | Working | 3 hooks, 4 timed scenes, caption, CTA; tests cover 4 durations and all goals. |
| GitHub Creator Studio | Live public-repository activity verified | Public GitHub only; no publishing. |
| Gmail | Code implemented, not connected here | Local runtime reports `configured: false`, `connected: false`; Google/Pub/Sub/Supabase/Vercel setup required. |
| Voice assistant | Code implemented, not live-call ready here | Local runtime reports Twilio, transfer, and AI providers unconfigured. |
| Supabase | Adapter tested with mocked REST, not live here | No local `.env`; the local server uses JSON file storage. Vercel secret configuration was not readable/verified. |
| Content metrics | Demo only | Seeded post metrics, not connected social analytics. |
| New page modules in `src/pages` | Not wired into the active app | `src/App.jsx` still renders its existing inline pages. Their missing API aliases were added, but these duplicate modules are not the live screens. |

### Fixes and checks in this review

- Production API auth is now applied across workspace routes, not Gmail alone; tests cover missing config, missing session, approved account, and a different account.
- Added missing API aliases and display helpers used by the newly added page modules.
- `npm test`: 23 passed. `npm run build`: passed. The six added page modules were separately bundled to catch missing imports.
- The stale local API process was restarted. The app at `http://127.0.0.1:5173` now serves the current source, and the local API smoke checks return successfully.
- Browser interaction was unavailable in this environment. No real Gmail, Supabase, Twilio, OpenAI, or Vercel deployment request was exercised.

---

## Historical audit notes — 2026-10-23

Audit scope: checked out branch `backend/collabdesk`, repository contents available on 2026-10-23. The Git history shows the branch contains a Node.js 20+ API using Hono, React/Vite dependencies, TypeScript pricing helpers, and JSON seed data. This audit added an optional Supabase Postgres adapter and migration. The checked-out project has no `index.html`, React app entry point, frontend components, Vite config, authentication, or voice-agent files. The `main` branch available locally contains only `README.md`, `src/lib/collab/{engine.ts,types.ts}`, and `src/styles.css`; the voice work was not present in either branch when inspected.

## Feature inventory

| Workflow | Status | Evidence and limits |
| --- | --- | --- |
| Creator profile read/update | Partially Working | `GET`/`PUT /api/creator` persist the demo profile in local JSON or the configured Supabase state. Validation added. No account boundary or UI in this checkout. |
| Deal list/detail/status | Partially Working | API reads/updates locally stored or configured Supabase deals. No frontend workflow to exercise; no authorization. |
| Email parsing | Partially Working | `POST /api/inbox/parse` calls the configured model or deterministic demo fallback and saves a deal. Fallback only recognizes a few seeded examples. |
| Rate quotes | Partially Working | Deterministic code uses creator rates and extended usage. Extended usage lowball threshold was corrected. Not a general rate-card service. |
| Draft replies | Partially Working | Model or deterministic fallback supports four intents; provider-backed behavior requires a key. Drafts are returned, not sent. |
| Content analytics | Not Verified | `/api/content` calculates averages from seeded static rows. These are demo fixtures, not verified social data. |
| Today actions | Partially Working | `/api/today` derives basic suggestions/counts from demo deals and posts. No reminders or notification delivery. |
| Voice agent | Missing | No voice/audio routes or code are in the accessible branch. |
| Authentication, authorization, account isolation | Missing | API is intended for local single-user demo only and now binds to loopback by default. Do not expose publicly. |
| Publishing, calendar, media kit, invoice/payment, campaign approval, collaboration | Missing | No corresponding frontend or backend workflow in this checkout. |
| Frontend navigation, forms, accessibility, responsive behavior | Not Verified | No runnable frontend app entry point or UI components exist in this branch. |

## Changes made in this audit

- Serialized read/modify/write operations and switched JSON persistence to temporary-file plus atomic rename, preventing overlapping API mutations in one server process from clobbering each other or leaving a partially written JSON file.
- Bound the API to `127.0.0.1` by default, made allowed CORS origins configurable, and added a 16 KB request-body limit.
- Return `400` for malformed JSON and apply bounds to creator profiles, email input, model-extracted deal data, and generated reply fields.
- Corrected extended-usage lowball detection and made generated replies state the actual usage period for the deal.
- Added isolated backend integration tests and corrected the setup guide to describe the backend-only checkout accurately.
- Added optional Supabase Postgres persistence over the Supabase Data API, a locked-down SQL migration, first-use seeding from the existing JSON state, and revision-checked retries. It remains unconfigured because project credentials were not provided.

## Competitor feature comparison

Competitor claims below are based on vendor product/help pages. Review feedback is a public signal and may be self-selected; it is not a representative survey. Complexity/value ratings are our estimates for this codebase.

| Feature | Competitor example | Current support | Complexity | Creator value | Recommendation |
| --- | --- | --- | --- | --- | --- |
| Brand deal pipeline, notes, history | Beacons Brand Deals hub; Modash collaboration CRM | Basic deal statuses only; no history or notes | Medium | High | Implement Later |
| Auto-updating media kit with data provenance | Beacons media kit and source badges | Missing; profile and metrics are static | High; requires social APIs and consent | High | Implement Later |
| Creator rate calculator and outreach drafts | Beacons pricing calculator and AI brand outreach | Basic deterministic quote and email draft | Low/Medium | High | Implement Now: retain rate safety and improve usage terms, validations, and editable drafts |
| Ideas, tags, content calendar, scheduling | Buffer planner, ideas, calendar, queue | Missing | Medium; high for direct platform publishing | High | Implement Later: begin with persisted ideas/calendar; only add publishing with official API access |
| Analytics with real source connections | Beacons analytics; Modash audience analytics | Static seeded data only | High | High | Implement Later: import/connect verified sources and label provenance; never imply seeded metrics are live |
| Client journey, proposals, invoices, payments | HoneyBook client management, contracts, invoices, payments | Missing | High; payments add compliance and integration work | Medium for current inbound sponsorship focus | Implement Later |
| Creator discovery and audience vetting | Modash discovery and audience analytics | Missing | Very high and mostly brand-side use case | Low for a creator-first inbox | Skip for current scope |
| Digital storefront, email list, memberships | Beacons creator tools; Patreon memberships/community | Missing | High, requires products, delivery, and payments | Medium but expands product scope | Implement Later only after validating demand |
| Private workspace assistant | Beacons Beam-style assistant | Email parsing/reply draft only; no workspace Q&A | High; requires tenant isolation and data controls | High | Implement Later after authentication and account boundaries |

## Competitor research sources

- [Beacons creator platform](https://beacons.ai/) and [plans/features](https://home.beacons.ai/plans): media kits, brand deal tools, creator storefront, email, analytics, and AI assistant.
- [Beacons media-kit update and source badges](https://website.beacons.ai/i/whats-new): media-kit editing and identifying whether stats are connected, estimated, or manually entered.
- [Buffer pricing/features](https://buffer.com/pricing) and [content planner](https://buffer.com/features/social-media-content-planner): ideas, drafts, tags, calendar, queue, scheduling, and analytics.
- [Modash platform](https://www.modash.io/) and [help overview](https://help.modash.io/en/articles/13714522-what-is-modash-and-how-does-it-work): creator discovery, relationship management, outreach, campaign performance, and payments; primarily brand/agency-oriented.
- [HoneyBook features](https://www.honeybook.com/reviews): client management, proposals, contracts, invoicing, and payments for independent service businesses.
- [Public HoneyBook Capterra reviews](https://www.capterra.com/p/162588/HoneyBook/reviews/): examples praise the end-to-end client journey and mention support responsiveness and price increases. Reviews are self-selected.
- [Public Beacons Trustpilot reviews](https://www.trustpilot.com/review/beacons.ai): users report customer-support, billing, and branding-transparency concerns; Trustpilot itself says the reviews may not be representative.

## Priorities

1. **P0:** Add real authentication, authorization, and per-user data storage before any network deployment; currently these are missing, so the server is loopback-only.
2. **P0:** Merge the frontend/voice-agent branch and verify actual end-to-end journeys against the backend API contract.
3. **P1:** Normalize the single JSONB state into relational, owner-scoped tables and add authentication/data ownership before multiple creators use the configured Supabase database.
4. **P1:** Add editable saved reply drafts and deal notes/history to complete the sponsorship workflow.
5. **P2:** Add calendar/idea tracking, official social analytics imports, and publishing only after platform credentials, permissions, and supported API scopes are established.
6. **P2:** Consider invoicing/payment, storefront, and discovery only after validating that they fit the creator-first product scope.

## Verification

The automated suite added by this audit exercises the API using a temporary database copy and tests the Supabase adapter against a mocked REST endpoint. `npm test` passes all 9 tests. No live Supabase, browser/end-to-end, responsive, accessibility, or live OpenAI-provider tests can be run against this branch because project credentials, the frontend, and provider credentials are unavailable. No deployment was performed.
