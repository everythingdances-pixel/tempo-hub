# TEMPO Communication Hub — Live Build Spec

**Version:** 1.0
**Date:** 12/03/26
**Author:** Camille Chen
**Status:** Draft — for review before build

---

## 1. What We're Building

A live, hosted web app for Camille and Paul. Two functions:

1. **Capture** — send tasks, voice notes, images, and observations into a shared feed
2. **Feed** — view, action, and complete items from either device

Claude processes every item on capture: tags it, assigns it to a project, flags urgency, and extracts any embedded actions or decisions. The humans see a clean, pre-organised feed. The triage happens automatically.

---

## 2. Architecture

```
[Phone / Browser]
       ↓
[Vercel — static hosting]
   tempo-hub.vercel.app
       ↓
[Vercel Serverless Function]
   /api/claude  ←── Anthropic API key lives here (env variable)
   /api/tasks   ←── read/write tasks
       ↓
[Supabase — database]
   tasks table
   captures table
```

Three components. All free tier at Tempo's volume.

---

## 3. Component Detail

### 3.1 Vercel (Hosting + API Proxy)

**What it does:** Serves the HTML/CSS/JS app. Also runs two serverless functions that sit between the browser and external services — keeping API keys out of the browser entirely.

**Cost:** Free (Hobby plan). Tempo's usage is well within limits.

**Setup:** One GitHub repo. Vercel connects to GitHub — every push to `main` redeploys automatically.

**Repo structure:**
```
tempo-hub/
├── index.html          ← The app (current v9 prototype)
├── api/
│   ├── claude.js       ← Proxies requests to Anthropic API
│   └── tasks.js        ← Reads/writes to Supabase
└── vercel.json         ← Config (routes, env)
```

---

### 3.2 Supabase (Database)

**What it does:** Stores tasks persistently. Two devices (Paul's phone, Camille's desktop) see the same data in real time.

**Why not localStorage:** localStorage is per-device, per-browser. A task Paul captures on his phone would never appear on Camille's screen. Supabase solves this with a proper shared database.

**Cost:** Free tier (500MB, 2 projects). More than enough.

**Schema:**

```sql
-- tasks table
create table tasks (
  id          uuid default gen_random_uuid() primary key,
  created_at  timestamptz default now(),
  created_by  text,           -- 'paul' or 'camille'
  body        text,           -- the task/note text
  project     text,           -- claude-assigned: 'Kirwan', 'Portfolio', etc.
  urgent      boolean default false,
  done        boolean default false,
  type        text,           -- 'task', 'note', 'decision', 'action'
  image_url   text,           -- if camera capture, stored image URL
  actions     text[],         -- extracted action items (array)
  raw_input   text            -- original unprocessed input
);
```

**Real-time:** Supabase has built-in real-time subscriptions. When Paul adds a task, it appears on Camille's feed without refresh. One line of JavaScript to enable.

---

### 3.3 Claude Integration (Anthropic API)

**What it does:** Every item captured goes through Claude before hitting the database. Claude returns structured JSON — project tag, urgency flag, type classification, and any extracted actions.

**Flow:**

```
User types/speaks/photographs
        ↓
App sends raw input to /api/claude
        ↓
Serverless function calls Anthropic API
   with system prompt + raw input
        ↓
Claude returns JSON:
  {
    "project": "Kirwan",
    "urgent": false,
    "type": "task",
    "body": "Chase Studio53 on revised floor plan",
    "actions": ["Email Studio53 re floor plan revision"]
  }
        ↓
App writes structured task to Supabase
        ↓
Feed updates on both devices
```

**System prompt (draft):**

```
You are the triage engine for Tempo Advisory's task capture system.
Tempo Advisory is a boutique management consultancy. The two users are
Paul Lakey (founder) and Camille Chen (director).

Active projects: Kirwan, Filaro, Angove, Portfolio, FHL, WAPC, JDSI,
Bethanie, Everland, Peters, Procurement, DPLH.

When given a raw capture (text, voice transcript, or image description),
return ONLY valid JSON with these fields:
- project: closest matching project name, or "General" if unclear
- urgent: true if time-sensitive or explicitly flagged, otherwise false
- type: one of "task", "note", "decision", "action", "question"
- body: cleaned, concise version of the input (fix voice-to-text errors)
- actions: array of discrete action items extracted, empty array if none

No preamble. No explanation. JSON only.
```

**Model:** claude-haiku-4-5 — fast, cheap, right for triage. Reserve Sonnet for anything requiring deeper reasoning.

**Cost estimate:** At 50 captures/day average, Haiku at ~$0.00025/call = under $5/month.

---

## 4. Authentication

**Approach:** PIN-based, not email/password. Two PINs — one for Paul, one for Camille. Stored as environment variables, never in the database.

**Why:** This is an internal tool for two known people. Full auth (Supabase Auth, OAuth) adds complexity with no meaningful security benefit over a PIN at this scale.

**Implementation:** On first load, app checks localStorage for a valid session token. If none, shows PIN screen. PIN is verified against the serverless function (never client-side). Token stored in localStorage for 30 days.

---

## 5. Image / Voice Capture

### Images
- Browser `<input type="file" accept="image/*" capture="environment">` handles camera on mobile
- Image uploaded to Supabase Storage (free tier: 1GB)
- URL stored in the task record
- Claude receives a text description prompt: "User captured an image. Describe what you see and classify the task."

### Voice
- Web Speech API (`SpeechRecognition`) — built into Chrome/Safari, no external service needed
- Transcript sent to Claude as text input
- Claude cleans up voice-to-text errors as part of triage

---

## 6. PWA (Save to Home Screen)

One `manifest.json` file added to the repo makes the app installable on iOS and Android:

```json
{
  "name": "TEMPO",
  "short_name": "TEMPO",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [...]
}
```

Once installed, it opens full-screen with no browser chrome — looks and behaves like a native app.

---

## 7. Build Sequence

| Step | Task | Owner | Complexity |
|------|------|-------|------------|
| 1 | Create GitHub repo, push current index.html | Camille | Low |
| 2 | Connect repo to Vercel, confirm live URL | Camille | Low |
| 3 | Create Supabase project, run schema SQL | Camille | Low |
| 4 | Add Supabase and Anthropic API keys to Vercel env | Camille | Low |
| 5 | Build `/api/claude.js` serverless function | Claude | Medium |
| 6 | Build `/api/tasks.js` serverless function | Claude | Medium |
| 7 | Update `index.html` — replace localStorage with Supabase calls | Claude | Medium |
| 8 | Add Claude triage to capture flow | Claude | Medium |
| 9 | Add real-time feed subscription | Claude | Low |
| 10 | Add PIN authentication | Claude | Low |
| 11 | Add `manifest.json` for PWA | Claude | Low |
| 12 | Test on Paul's phone + Camille's desktop | Both | — |

Steps 1–4 are account setup — Camille does these once. Steps 5–11 are code — Claude builds these in sequence.

---

## 8. What You Need to Set Up

Before the build session:

1. **GitHub account** — create a repo called `tempo-hub`
2. **Vercel account** — free at vercel.com, connect to GitHub
3. **Supabase account** — free at supabase.com, create a project called `tempo-hub`
4. **Anthropic API key** — from console.anthropic.com (if not already held)

That's it. Everything else Claude builds.

---

## 9. Out of Scope (for now)

These are good ideas for later — deliberately excluded from v1:

- Claude queryable from the feed ("what's outstanding on Kirwan")
- Push notifications
- Email digest of open items
- Offline mode / service worker
- Multi-project filtering in the feed UI

---

## Document Control

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 12/03/26 | Camille Chen | Initial spec |
