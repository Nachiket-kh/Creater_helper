# System architecture

## Stack and boundaries

CollabDesk is a single-repository JavaScript application. The browser UI uses React 18 and Vite. The API is a Node.js 20+ process using Hono and `@hono/node-server`. Vite proxies `/api` to the API on loopback during development. There is no separate frontend server in production configuration here; `npm run build` emits static assets to `dist/`, while the API remains a separate process.

Persistence defaults to `server/data/db.json`. Optional Supabase Postgres persistence stores the whole single-creator state document in one JSONB row. OpenAI Chat Completions is optional for email extraction and reply drafting; deterministic fallback code runs when unavailable. No auth, social platform connection, upload system, payment provider, or message delivery integration exists.

```mermaid
flowchart LR
  U[Creator] --> B[Browser]
  B --> R[React routes in src/App.jsx]
  R --> C[API client src/api.js]
  C -->|/api requests| V[Vite proxy during development]
  V --> H[Hono API server/index.js]
  H --> M[Body limit, CORS, error handler]
  M --> S[Handlers and rate helpers]
  S -->|default| J[JSON state file]
  S -->|optional| SB[Supabase REST API]
  S -->|email parse / reply| L[OpenAI API, optional]
  J --> S
  SB --> S
  L --> S
  S --> H
  H --> C
  C --> R
```

## Runtime and entry points

- Browser document: [`index.html`](../../index.html)
- React mount and stylesheet: [`src/main.jsx`](../../src/main.jsx)
- Route selection, pages, and UI state: [`src/App.jsx`](../../src/App.jsx)
- Browser API wrapper: [`src/api.js`](../../src/api.js)
- API app and standalone server entry: [`server/index.js`](../../server/index.js); the listener starts only when invoked directly.
- Development proxy and host/port: [`vite.config.js`](../../vite.config.js)
- Build/test scripts: [`package.json`](../../package.json)

## Overall application request

The app currently has no authentication stage. Hono applies a 16 KB body limit, an exact-origin CORS allowlist, and centralized JSON errors under `/api/*`. Request-specific validation happens in route handlers. Those handlers call store operations, calculation helpers, or OpenAI. Responses are JSON and the UI handles local loading/error/success state.

```mermaid
sequenceDiagram
  actor Creator
  participant UI as React UI
  participant Client as src/api.js
  participant API as Hono server
  participant Logic as handler/helper
  participant Store as file or Supabase
  Creator->>UI: Open page or submit action
  UI->>Client: Call api method
  Client->>API: JSON HTTP request via /api
  API->>API: body limit, CORS, JSON error boundary
  API->>Logic: Validate and execute route
  Logic->>Store: Read/update state when needed
  Store-->>Logic: State/result
  Logic-->>API: JSON response
  API-->>Client: HTTP status + JSON
  Client-->>UI: Resolve or throw user-safe error
  UI-->>Creator: Render result or error
```

## Important operating constraints

The API defaults to `127.0.0.1:3001`, because there is no login or user isolation. Supabase service credentials bypass RLS and are server-side only. The application data is seeded demo content, not live creator analytics. Do not expose the API to a network or use this data model for multiple creators before adding authenticated ownership boundaries.
