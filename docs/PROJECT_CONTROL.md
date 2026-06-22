# InterviewAI — Project Control & Shared Memory

> **Purpose:** Single source of truth for architecture, known issues, priorities, schema, setup, and version-control expectations. Update this doc when scope or status changes.

**Last updated:** 2026-06-20  
**Local dev URL:** http://localhost:1337  
**Stack:** Next.js 16 · React 19 · Supabase · Groq · Deepgram · Murf

---

## Version control policy

**Every meaningful change must be committed** (config, chore, impl, feat, fix, docs):

| Type | Examples |
|------|----------|
| `feat` | New interview flow, streaming STT |
| `fix` | Message sync bug, auth IDOR |
| `chore` | Port change, env docs, schema SQL |
| `docs` | This file, README updates |
| `config` | package.json, next.config, Supabase schema |

**Never commit:** `.env.local`, API keys, service role keys.

**Suggested commit flow:**
1. `git status` + `git diff`
2. Stage only relevant files
3. One logical commit per concern when possible
4. `git status` after commit to verify

---

## 1. Product overview

**InterviewAI** is a voice-driven technical interview practice app.

| Flow | Route |
|------|-------|
| Landing | `/` |
| Auth | `/login`, `/signup`, `/auth/callback` |
| Dashboard | `/dashboard` |
| Configure interview | `/setup` |
| Instructions | `/instructions/[sessionId]` |
| Live interview | `/interview/[sessionId]` |
| Feedback | `/feedback/[sessionId]` |

**Voice pipeline (current):**
- **STT:** Deepgram Nova-2 (prerecorded `transcribeFile` on uploaded WebM)
- **LLM:** Groq Llama 3.3 70B
- **TTS:** Murf Falcon (`global.api.murf.ai/v1/speech/stream`)

**Legacy / unused:** `src/lib/tts.ts` (Python edge_tts) — not used in live flow.

---

## 2. Environment variables

```env
# Supabase (either name works in code)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # alias supported

# AI providers
GROQ_API_KEY=
DEEPGRAM_API_KEY=
MURF_API_KEY=

# App URL (required for internal API calls)
NEXT_PUBLIC_SITE_URL=http://localhost:1337
```

**Supabase Auth redirect URLs (local):**
- Site URL: `http://localhost:1337`
- Redirect: `http://localhost:1337/auth/callback`

**Supabase Auth redirect URLs (production — Vercel):**

Configure in [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **URL Configuration**:

| Setting | Value |
|---------|--------|
| **Site URL** | `https://ai-interviewer-pi-kohl.vercel.app` |
| **Redirect URLs** | `https://ai-interviewer-pi-kohl.vercel.app/auth/callback` |
| | `https://ai-interviewer-pi-kohl.vercel.app/**` |

Email confirmation and password-reset use **OTP codes** (`{{ .Token }}` in templates). OAuth (Google) uses **Redirect URLs**.

**Email templates (OTP):** Copy HTML from `supabase/templates/` into Supabase Dashboard → **Authentication** → **Email Templates**:
- **Confirm signup** → `confirmation.html`, subject: `Confirm your InterviewAI account`
- **Reset password** → `recovery.html`, subject: `{{ .Token }} is your InterviewAI password reset code`
- **Magic link** → `magic_link.html` (optional), subject: `{{ .Token }} is your InterviewAI sign-in code`

For local Supabase CLI, `supabase/config.toml` points to the same template files.

**Vercel env file:** copy from `.env.production` (local, gitignored) or `docs/env.production.example`. Set all vars for the **Production** environment, then redeploy.

---

## 3. Fresh Supabase setup checklist

1. Create Supabase project → copy URL + anon key into `.env.local`
2. Run **`supabase/schema.sql`** in SQL Editor (creates tables, RLS, triggers, `user_statistics` view)
3. Configure Auth (Email; optional Google OAuth)
4. `npm install && npm run dev` → open http://localhost:1337
5. Sign up → dashboard → setup → interview → feedback smoke test
6. Regenerate types (optional):
   ```bash
   npx supabase gen types typescript --project-id YOUR_REF > src/lib/supabase/database.types.ts
   ```

---

## 4. Current database schema (app-compatible)

File: **`supabase/schema.sql`**

| Table | Role |
|-------|------|
| `user_profiles` | User metadata; auto-created on signup via trigger |
| `interview_sessions` | Config, status, `messages` JSON, `voice_id` |
| `interview_questions` | Pre-generated questions; `status`: pending/active/completed |
| `feedback_reports` | One report per completed session |
| `user_statistics` | View for dashboard aggregates |

**Session status:** `active` | `completed` | `abandoned`

---

## 5. Target scalable schema (future migration)

When refactoring, migrate toward:

| Table | Replaces |
|-------|----------|
| `interview_sessions` | Config + lifecycle only (no `messages` JSON) |
| `session_questions` | Renamed/refined `interview_questions` |
| `session_turns` | Append-only conversation log |
| `turn_audio_assets` | Storage paths for audio (not base64 in API) |
| `session_jobs` | Async question gen + feedback |
| `user_statistics` | Computed view only (no counters on profiles) |

**Session lifecycle (target):** `draft` → `ready` → `active` → `completed` | `abandoned` | `failed`

**Migration strategy:** additive tables → dual-write → switch reads → drop `messages` JSON column.

Full SQL design was documented in chat; implement as `supabase/migrations/002_scalable_schema.sql` when ready.

---

## 6. Codebase map

```
src/
├── app/
│   ├── page.tsx                    # Landing
│   ├── dashboard/ setup/ login/ signup/
│   ├── instructions/[sessionId]/
│   ├── interview/[sessionId]/      # Main voice UI
│   ├── feedback/[sessionId]/
│   └── api/
│       ├── sessions/               # Create session + batch questions
│       ├── process-turn/           # STT → LLM → TTS (core loop)
│       ├── generate-intro/         # First/next question intro
│       ├── generate-question-batch/
│       ├── feedback/
│       ├── cleanup-interviews/
│       └── questions/
├── components/                     # CodeEditor, VoiceInterface
├── lib/supabase/                   # client, server, middleware, types
└── proxy.ts                        # Auth middleware
```

---

## 7. Honest assessment (baseline)

| Dimension | Rating | Notes |
|-----------|--------|-------|
| MVP code quality | 6.5/10 | Good structure; sync bugs and open routes |
| Scalability | 3/10 | Fine for demos; not multi-tenant production yet |
| STT speed | 4/10 | Nova-2 is good; prerecorded + upload caps latency |
| TTS speed | 3/10 | Full-buffer Murf + base64 JSON |
| Security | 4/10 | Unauthenticated AI routes; possible IDOR |
| Data integrity | 5/10 | Client/DB message drift |

### End-to-end turn latency (typical)

| Scenario | Estimate |
|----------|----------|
| Normal turn | 3–8 seconds |
| Question transition | 6–15 seconds (double LLM + TTS) |

### Architecture bottlenecks

1. Sequential god route in `process-turn` (STT → DB → LLM → TTS)
2. `messages` JSON rewritten every turn
3. No streaming STT/TTS to browser
4. Internal `fetch` to own app for question intros
5. Dashboard triggers global cleanup on every load
6. Session create blocks on batch LLM generation

---

## 8. Known bugs & flaws (track and close)

### Critical

- [x] **Message desync:** Question advance early-return in `process-turn` skips DB message save; missing `transcript` in response
- [x] **Unauthenticated routes:** `generate-intro`, `generate-question`, `cleanup-interviews`
- [x] **Feedback IDOR:** `sessions/[sessionId]/feedback` doesn't filter by `user_id` (mitigated only if RLS is strict)
- [x] **Open redirect:** `auth/callback` accepts arbitrary `redirect` param
- [ ] **Fake autosave:** UI shows "Auto-saved" but `user_code` never persisted

### Medium

- [x] Cleanup uses `created_at` not `last_activity_at`
- [ ] `database.types.ts` missing columns used in code (`voice_id`, `status`, `followup_count`, etc.)
- [ ] Stale React closure in `processAudioTurn` (`messages` state)
- [ ] Dockerfile uses pnpm but repo uses npm — broken for deploy
- [ ] Legacy files: `interview/page.tsx`, `page.tsx.bak`, unused `lib/tts.ts`
- [x] Feedback route selects `question_count` but column is `num_questions`

### Low

- [ ] Double session `completed` PATCH (feedback API + client)
- [ ] README outdated (Next 15, no Supabase docs)

---

## 9. Prioritized roadmap

### P0 — Critical (before public scale)

| # | Task | Files / area |
|---|------|----------------|
| 1 | Auth on all AI + cleanup routes | `generate-intro`, `generate-question`, `cleanup-interviews` |
| 2 | Fix message persistence on every turn incl. early return | `process-turn`, interview page |
| 3 | Feedback from DB messages, not client state | `feedback/route`, `process-turn` |
| 4 | Feedback ownership check | `sessions/[sessionId]/feedback` |
| 5 | Fix auth callback redirect whitelist | `auth/callback` |
| 6 | Sync `database.types.ts` with schema | `database.types.ts` |
| 7 | Fix Dockerfile or remove until fixed | `Dockerfile` |

### P1 — High (latency, cost, reliability)

| # | Task |
|---|------|
| 8 | Remove nested `generate-intro` fetch on question transition |
| 9 | Stream/chunk TTS to client (or storage URLs) |
| 10 | Deepgram live streaming STT |
| 11 | Persist `user_code` to DB |
| 12 | Rate limit expensive endpoints per user |
| 13 | Replace self-HTTP with direct function calls |
| 14 | Non-blocking session create (background question gen) |
| 15 | Graceful STT/TTS/LLM failures |

### P2 — Medium (ops & maintainability)

| # | Task |
|---|------|
| 16 | Cron cleanup with service role (not dashboard) |
| 17 | Split `process-turn` into modules |
| 18 | Reduce DB round trips per turn |
| 19 | Move messages to `session_turns` table |
| 20 | Observability (structured logs, Sentry) |
| 21 | Set `maxDuration` on heavy routes |
| 22 | Delete dead/duplicate code |
| 23 | STT locale from accent/voice selection |

### P3 — Polish & growth

| # | Task |
|---|------|
| 24 | TTS cache for common phrases |
| 25 | Pre-generate Q1 intro at session create |
| 26 | Structured LLM output instead of `[STATUS:COMPLETE]` tags |
| 27 | Update README |
| 28 | Tests for session lifecycle, auth, messages |
| 29 | Production deploy checklist |
| 30 | UX: modals vs confirm(), latency indicator, text fallback |

---

## 10. Sprint plan (recommended order)

| Sprint | Focus | Expected outcome |
|--------|-------|------------------|
| **1** | P0 security + message sync + types | Safe to share with testers |
| **2** | P1 remove double intro, direct calls, code save, errors | ~40–60% faster turns |
| **3** | P1 streaming STT/TTS, rate limits | Conversational feel |
| **4** | P2 cron, turn table migration, observability | Hundreds of concurrent users |
| **5** | P3 cache, tests, docs, UX | Production baseline |

---

## 11. API routes reference

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /api/sessions` | Yes | Create session + batch questions |
| `GET/PATCH /api/sessions/[id]` | Yes | Session CRUD + status |
| `POST /api/process-turn` | Yes | Voice turn pipeline |
| `POST /api/generate-intro` | **No** ⚠️ | Intro + TTS |
| `POST /api/generate-question` | **No** ⚠️ | Single question |
| `POST /api/generate-question-batch` | Yes | Batch questions |
| `POST /api/feedback` | Yes | Generate + save report |
| `POST /api/cleanup-interviews` | **No** ⚠️ | Abandon stale sessions |
| `GET /api/questions` | Yes | Fetch active question |

---

## 12. Local dev commands

```bash
npm install
npm run dev          # http://localhost:1337
npm run build
npm run lint
```

## 13. CI (GitHub Actions)

Workflow: `.github/workflows/ci.yml`

| Job | Command | Gate |
|-----|---------|------|
| **Build** | `npm ci` + `npm run build` | Required — blocks merge |
| **Lint** | `npm run lint` | Required — blocks merge |

Runs on push/PR to `main`. Uses placeholder env vars for build (no secrets in CI).

---

## 14. Changelog (doc-level)

| Date | Change |
|------|--------|
| 2026-06-20 | GitHub Actions CI (build + lint) |
| 2026-06-20 | Initial PROJECT_CONTROL.md; fresh Supabase schema; dev port 1337 |
| 2026-06-20 | Code review, roadmap, scalable schema design captured |

---

## 15. Open decisions

1. **Schema:** Stay on current `schema.sql` until P0 done, then migrate to turn-based schema?
2. **TTS:** Keep Murf vs add faster fallback for replies?
3. **Deploy:** Vercel vs Docker (fix Dockerfile first)?
4. **Auth:** Email confirmation on or off for dev?

Document decisions here when made.
