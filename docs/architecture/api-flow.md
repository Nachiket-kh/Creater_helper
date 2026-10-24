# API flow

Development browser requests use relative `/api` paths; Vite forwards them to `http://127.0.0.1:3001`. `src/api.js` JSON-encodes bodies and converts network and non-success responses to thrown errors. The server response format is JSON except Hono's framework-level behavior for unsupported methods/paths.

## Endpoint inventory

| Method + path | Handler / purpose | Validation and response |
| --- | --- | --- |
| `GET /api/health` | Health probe | `{ ok: true }` |
| `GET /api/creator` | Read profile | Creator object |
| `PUT /api/creator` | Update niche, followers, rates | Bounded values; 400 on invalid input; updated creator |
| `GET /api/deals` | List newest deals with computed quotes | `{ deals: [...] }` |
| `GET /api/deals/:id` | Read one deal with quote | 404 if absent |
| `PATCH /api/deals/:id` | Change status | Status allowlist; 400 invalid, 404 absent; updated deal |
| `POST /api/inbox/parse` | Extract email and create deal | Required `rawEmail`, max 10,000 chars; 201 `{ deal, quote, source }` |
| `POST /api/deals/:id/rate` | Recalculate quote | 404 if absent; quote object |
| `POST /api/deals/:id/reply` | Create reply draft | Intent allowlist; 404 absent; `{ subject, body, quote, source }` |
| `GET /api/content` | Return seeded posts, insight and averages | `{ posts, insight, averages }` |
| `GET /api/today` | Counts and suggested actions | `{ actions, counts }` |
| `GET /api/samples` | Return sample emails | Array of samples |

## Request lifecycle examples

```mermaid
sequenceDiagram
  actor Creator
  participant Inbox as Inbox component
  participant Client as src/api.js
  participant Route as POST /api/inbox/parse
  participant Model as OpenAI optional
  participant Store as updateStore
  Creator->>Inbox: Submit email
  Inbox->>Client: api.parseEmail(rawEmail)
  Client->>Route: JSON POST
  Route->>Route: Check type and length
  Route->>Model: askJSON(parsePrompt(email))
  alt provider unavailable or invalid output
    Model-->>Route: error / invalid data
    Route->>Route: fallbackParse(email)
  else valid extraction
    Model-->>Route: validated deal fields
  end
  Route->>Store: Append new deal and compute quote
  Store-->>Route: deal + quote + source
  Route-->>Client: 201 JSON
  Client-->>Inbox: parse result
  Inbox-->>Creator: Show result; open detail is optional
```

```mermaid
sequenceDiagram
  actor Creator
  participant Detail as DealDetail
  participant Client as src/api.js
  participant Route as POST /api/deals/:id/reply
  participant Model as OpenAI optional
  Creator->>Detail: Choose Accept / Counter / Decline / Ask for brief
  Detail->>Client: api.reply(id, intent)
  Client->>Route: JSON POST
  Route->>Route: Validate intent and load deal/profile
  Route->>Model: Prompt with deal and fixed quote
  alt provider fails or output invalid
    Model-->>Route: failure
    Route->>Route: Build deterministic draft
  else provider output valid
    Model-->>Route: subject/body
  end
  Route-->>Detail: draft + quote + source
  Detail->>Detail: Allow local edits; copy to clipboard
  Note over Detail: No send endpoint or draft persistence exists
```

## API security boundary

There is no per-user authorization: any caller able to reach the API can read or modify the same creator workspace. Loopback binding and CORS are defense-in-depth for the local demo, not authentication. CORS does not prevent direct non-browser requests. See [authentication flow](authentication-flow.md).
