# Dependencies and integrations

## Runtime and build dependencies

| Dependency | Role | Use in project |
| --- | --- | --- |
| `react`, `react-dom` | Browser UI | Components, state, DOM mount |
| `vite`, `@vitejs/plugin-react` | Development/build | Dev server, JSX transform, production assets |
| `hono` | HTTP API | Routes, middleware, JSON responses |
| `@hono/node-server` | Node adapter | Run Hono as local HTTP server |
| `concurrently` | Local development | Starts API and Vite together |
| Node built-ins | Server support | Filesystem persistence, path/URL, UUIDs, tests |

Package versions are bounded by `package.json` and pinned by `package-lock.json`; current installed build reported Vite 6.4.5. The runtime requirement in README is Node 20+; the inspected environment had Node 24.21.0 and npm 11.19.0.

## External services

- **OpenAI Chat Completions**: `server/llm.js` requests `gpt-4o-mini` when `OPENAI_API_KEY` is present. A 10-second abort timeout applies. Missing key, provider failure, or invalid response uses deterministic fallback. No key is included in code or documentation.
- **Supabase Postgres / REST**: optional. `SUPABASE_URL` and `SUPABASE_SECRET_KEY` must be server environment values. Adapter uses HTTPS except for localhost and makes REST requests with a 10-second timeout. It stores one JSONB application-state row.
- **Social platforms, storage/CDN, payments, email delivery**: no integration found.

## Data-boundary notes

Email content can be sent to OpenAI when the server has a configured key. RepoTrace was executed locally against this repository with `--no-open`; its UI showed a graph of 15 project source files and 10 import dependencies. The official README describes local analysis without uploading the source.
