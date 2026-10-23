# CollabDesk

A local AI desk demo for one micro-creator. CollabDesk turns brand emails into priced collaboration deals, drafts replies, tracks each deal, and surfaces content performance.

## Run locally

1. Install dependencies with `npm install`.
2. For live AI drafts, start Ollama locally with the `qwen3.5:4b` model available. CollabDesk sends model requests from its backend to `http://localhost:11434/api/chat`; no API key is needed. You can override the endpoint, model, or 60-second request timeout with `OLLAMA_CHAT_URL`, `OLLAMA_MODEL`, and `OLLAMA_TIMEOUT_MS`.

   If Ollama is unavailable or a request fails, CollabDesk uses deterministic offline parsing and reply drafts.
3. Start both the API and frontend with `npm run dev`.
4. Open http://localhost:5173.

## Demo path

Inbox → Café Ramwadi → Parse → Counter → move to Negotiating.

Rates are computed in code from the creator’s media kit. The model only extracts deal details and writes email text; it never sets or changes a suggested rate.

The frontend runs on port 5173 and the API on port 3001. Data is stored in `server/data/db.json` for this local demo. Ollama listens on port 11434; the server uses HTTP because the local Ollama endpoint does not provide HTTPS.

## Deploy to Vercel

Import the repository root as a Vite project. `vercel.json` sets the install and build commands, publishes `dist`, and routes the app pages to the SPA entry point. API handlers live in `api/` and run as Node.js functions. No API key is required for the offline parser and reply fallback. For live model calls, set `OLLAMA_CHAT_URL` to a publicly reachable Ollama-compatible endpoint; `localhost` on your computer is not reachable by a Vercel function.

The JSON file remains the local demo store. Vercel functions cannot persist writes to the deployment filesystem, so deployed edits are best-effort in function memory and may reset after a cold start. Add a persistent store before using this with real creator data or relying on saved changes across deployments.
