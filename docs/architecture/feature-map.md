# Feature map and verification inventory

Status reflects evidence gathered from source and tests. “Working” is reserved for behavior exercised by meaningful tests. The existing suite exercises API behavior, not browser journeys.

| Feature | User entry | Frontend | Backend / data dependency | Auth | Existing tests | Status / verification | Bugs or follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Today dashboard, counts, actions | `/` | `Today` in `src/App.jsx` | `GET /today`, deals + posts in store | None | API response tested | Partially working — API verified; browser UI not run | Actions are derived demo suggestions, not notifications |
| Recent deals | `/` | `RecentDeals` | `GET /deals`, deal state | None | Deal listing tested | Partially working — API verified; UI not run | Demo single-creator data |
| Sample inbox and email parse | `/inbox` | `Inbox` | `GET /samples`, `POST /inbox/parse`, optional OpenAI; appends deal | None | Fallback parse, validation, concurrent append tested | Partially working — fallback path verified | Fallback parser only recognizes a few patterns; unknown text creates generic “Unknown brand” deal |
| Deal board and status changes | `/deals` | `Deals`, `DealCard` | `GET/PATCH /deals`, store | None | Listing/status/invalid/missing paths tested | Partially working — API verified; browser controls not run | No history/audit trail; arbitrary stage changes allowed |
| Deal details and quotes | `/deals/:id` | `DealDetail` | `GET /deals/:id`; deterministic `quote()` | None | Rate helper and reply fixture tested | Partially working — API paths exercised | Quote applies format rate and >30-day usage uplift; multi-deliverable pricing is not itemized |
| Reply drafting | Deal detail | `DealDetail` editable local form and clipboard | `POST /deals/:id/reply`, optional OpenAI/fallback | None | Fallback counter and invalid intent tested | Partially working — fallback verified; provider unavailable | Draft is neither saved nor sent; UI copy action only |
| Content library and reach averages | `/content` | `Content` table | `GET /content`, seeded `posts[]` | None | Endpoint response tested | Unverified — endpoint shape test only; metrics are fixtures | Must not be represented as live analytics |
| Media kit / profile settings | `/kit` | `Kit` | `GET/PUT /creator`, file or Supabase | None | Validation and persistence tested | Partially working — API verified; browser form not run | Profile is global and single-creator |
| Supabase persistence | Configured server | No direct browser access | `server/supabase-store.js`, singleton JSONB migration | Server secret only | Mock REST bootstrap/update/retry tested | Partially working — adapter behavior tested against mock | Live database unavailable; no multi-tenant ownership |
| Authentication / authorization | None | None | None | — | None | Missing — confirmed by source inspection | P0 before any network exposure or multiple users |
| Social analytics connections | None | None | None | — | None | Missing | Seeded metrics only |
| Publishing / content calendar / uploads | None | None | None | — | None | Missing | No routes, storage, or provider integrations |
| Payments / invoices / notifications | Today text only; no operational actions | No payment action or send UI | No provider or delivery service | — | None | Missing | Today payment wording is a suggested task only |
| Voice/audio assistant | None | None | None | — | None | Missing | No implementation in checkout |
| Unknown route handling | Any unsupported path | Not-found view | No API call | None | No browser test | Partially working after fix — source/build verified, browser behavior unverified | Add a browser route check |
| Workspace refresh | Header refresh button | Remounts active view | Existing read endpoints | None | No browser test | Partially working after fix — source/build verified | UI behavior not browser-tested |

## Summary

Nine automated tests pass across backend API and the mocked Supabase adapter. The frontend build passes. This does not establish end-to-end browser behavior, live-provider behavior, responsive behavior, or accessibility conformance.
