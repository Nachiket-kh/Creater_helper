# CollabDesk architecture guide

This directory maps the checked-out CollabDesk application at branch `backend/collabdesk`. It is based on source inspection and the backend test suite; no behavior is inferred from UI labels alone. This is a single application repository, not a monorepo.

## Documents

- [System architecture](system-architecture.md) — runtime boundaries and overall flow.
- [Frontend flow](frontend-flow.md) — routes, components, state, and user interactions.
- [Backend flow](backend-flow.md) — server startup, middleware, handlers, services, and errors.
- [API flow](api-flow.md) — endpoint contracts and request lifecycles.
- [Database flow](database-flow.md) — JSON and optional Supabase persistence, schema, and access.
- [Authentication flow](authentication-flow.md) — current absence of identity and access control.
- [Feature map](feature-map.md) — complete discoverable feature inventory and verification evidence.
- [Dependencies](dependencies.md) — runtime, build, and external service dependencies.
- [Known issues](known-issues.md) — confirmed defects, limits, and unresolved risks.

## Verification snapshot

- `npm test`: 9 passed, 0 failed.
- `npm run build`: passed with Vite 6.4.5.
- Node.js `v24.21.0`; npm `11.19.0`.
- RepoTrace ran successfully against this repository and its dashboard returned HTTP 200. It displayed 15 source files and 10 import dependencies. See [known issues](known-issues.md) for commands and the limits of this static graph.
- Browser-based visual, responsive, accessibility, live OpenAI, and live Supabase checks were not run.

The top-level [`AUDIT.md`](../../AUDIT.md) predates the current frontend files and describes an earlier checkout state. This directory reflects the files currently present.
