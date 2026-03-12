# TEMPO Communication Hub

Internal task capture and feed app for Tempo Advisory. Two users (Paul Lakey, Camille Chen) capture tasks via text, voice, or camera. Claude triages every item automatically — tagging project, urgency, type, and extracting actions.

## Architecture

- **Frontend:** Single-page HTML/CSS/JS app (`index.html`)
- **API proxy:** Vercel serverless functions (`/api/claude`, `/api/tasks`)
- **Database:** Supabase (PostgreSQL + real-time subscriptions)
- **AI triage:** Anthropic API (Claude Haiku)

## Repo Structure

```
tempo-hub/
├── index.html          ← The app (rename from prototype)
├── api/
│   ├── claude.js       ← Proxies requests to Anthropic API
│   └── tasks.js        ← Reads/writes to Supabase
├── vercel.json         ← Vercel routing config
└── README.md
```

## Environment Variables (set in Vercel dashboard)

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `SUPABASE_URL` | Supabase project URL (e.g. `https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |

## Setup

1. Push this repo to GitHub
2. Connect to Vercel — auto-deploys on push to `main`
3. Create Supabase project and run the schema SQL (see build spec)
4. Add environment variables in Vercel dashboard
5. Rename `tempo-tasks-v9.html` to `index.html` when ready to go live

## Build Spec

See `Tempo_CommHub_BuildSpec_120326.md` for full architecture and build sequence.
