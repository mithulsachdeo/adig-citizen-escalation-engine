# Adig

Citizen-side web tool that helps Indian electricity consumers (MSEDCL / Maharashtra) detect
overbilling, estimate the energy-charge overcharge, and generate the correct escalation document.

## Narrative model key (Gemini)

The `/api/narrative` serverless route calls Google Gemini to draft the facts paragraph. It needs a
server-side key — never exposed to the client.

- **Local:** copy `.env.example` to `.env.local` and set `GEMINI_API_KEY=<your key>` (`.env*.local` is gitignored). Restart the dev server.
- **Vercel:** add `GEMINI_API_KEY` under Project → Settings → Environment Variables (all environments), then redeploy.

If the key is missing or Gemini errors, the route returns a clear JSON error and the UI falls back
to a plain templated narrative — the flow never blocks on the model.
