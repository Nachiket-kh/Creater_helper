# Known issues, confirmed bugs, and unresolved risks

## Current status — 2026-10-24

The latest Vercel deployment records are in `ERROR` state even though the checked-out project's `npm test` and `npm run build` both pass. Vercel's deployment detail/log APIs returned 404 in this session, so the cause still needs inspection in Vercel's deployment UI. The most recent ready production deployment in the visible list used the older `22cb0d6` commit.

The local app runs with demo JSON data because no `.env` file is present: Gmail status is unconfigured/disconnected, and Twilio, call transfer, and AI provider flags are all false. Supabase and live provider workflows are therefore not verified as connected. The latest `src/pages/*` additions are not imported by `src/App.jsx`; they are alternate screens, not currently active features.

---

## Historical notes — 2026-10-23

## Confirmed fixes in this audit

1. **Unsupported paths rendered Today.** `routeFor()` previously returned the Today route for every unknown URL. It now returns a dedicated not-found page with navigation back to Today. Evidence: route handling in `src/App.jsx`; production build succeeds.
2. **Workspace refresh did not refresh page data.** The header refresh counter previously only reran the creator-profile effect. Active data views now remount on that counter and reload their API reads. Evidence: app-level refresh in `src/App.jsx`; production build succeeds. Browser interaction was not exercised.

## Confirmed product and architecture limitations

- **No authentication or authorization:** every caller shares one creator profile and deal collection. The API is loopback-bound by default; do not expose it publicly. Add identity, per-user authorization, and owner-scoped persistence before deployment to a shared network.
- **Demo analytics:** `server/data/db.json` contains seeded posts and reach metrics. The app displays them as a library/insight without a persistent data-provenance label. No connected analytics exist.
- **No send/save reply operation:** the app creates an editable transient draft and copies it to the clipboard. There is no send endpoint or saved draft table.
- **Fallback email parser is narrow:** `fallbackParse()` recognizes three sample-like cases and otherwise emits an “Unknown brand” follow-up record. It is a deterministic demo fallback, not a general parser.
- **Supabase adapter is unverified against a live project:** tests mock the REST API. Configuration requires credentials that were not available. Current single JSONB row is not multi-tenant.
- **File concurrency is process-local:** JSON write queue prevents overlapping mutations only within one server process; multiple processes sharing the file can overwrite each other's state.
- **Rate model is simplified:** one format base rate is selected; deliverables are not separately priced. Usage beyond 30 days applies a fixed 40% uplift.

## Verification limits and tool setup

RepoTrace official README documents `npx repotrace`, a local dashboard defaulting to port 4242, and options `--no-open` and `--help` ([official repository README](https://github.com/somcpp/RepoTrace)). The package was fetched ephemerally through npm and run from the repository root; no project dependency or lockfile was changed. The dashboard returned HTTP 200 and its UI showed **15 files and 10 dependencies**, including `src/App.jsx`, `src/api.js`, and `server/index.js`. Commands used:

```sh
npm exec --yes --package=repotrace -- repotrace --help
npm exec --yes --package=repotrace -- repotrace . --no-open
curl --fail --silent --show-error --output /tmp/repotrace-dashboard.html --write-out 'HTTP %{http_code}; content-type %{content_type}; bytes %{size_download}\n' http://127.0.0.1:4242/
```

The dashboard remains available at `http://localhost:4242` while its process is running. RepoTrace visualizes static imports and is not a request-level call trace; the diagrams in this directory were written from verified source and are separate from RepoTrace output. Its UI reported 15 source files and 10 edges. Note that its graph includes two `src/lib/collab` TypeScript files that are not imported into the current React app; their presence does not establish a live feature.

Other unverified areas: browser navigation and console/network errors, responsive layouts, screen-reader/accessibility behavior, OpenAI live calls, Supabase live persistence, and multi-process JSON writes. No production data or credentials were used.

## Priorities

1. **P0:** Add authentication, authorization, and per-creator data ownership before shared/network deployment.
2. **P1:** Label seeded analytics clearly and add provenance for any future connected metrics.
3. **P1:** Define whether reply drafts should persist or be sent; current UI supports editing and clipboard copy only.
4. **P1:** Add browser end-to-end and accessibility checks for critical inbox, deal, and profile flows.
5. **P2:** Replace the single-row JSONB model and narrow parser when product requirements and actual data sources are established.
