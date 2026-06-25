# InterviewAI

Voice-driven technical interview practice built with Next.js 16, Supabase auth, and a Groq + Deepgram + Murf AI pipeline.

## Features

- Email/Google auth with Supabase (OTP verification, password reset)
- Interview types: DSA, Frontend, Backend, Fullstack, Cybersecurity, DevOps
- Live Deepgram STT in the browser with streaming Murf TTS playback
- Session-backed interview flow with code autosave and feedback reports
- Dashboard, profile stats, and feedback history

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Auth & DB | Supabase |
| STT | Deepgram Nova-2 (live WebSocket) |
| LLM | Groq Llama 3.3 70B (structured JSON turns) |
| TTS | Murf Falcon (streamed MP3) |
| UI | React 19, Tailwind CSS 4, Monaco Editor |

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing |
| `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password` | Auth |
| `/dashboard` | User home |
| `/setup` | Configure interview |
| `/instructions/[sessionId]` | Pre-interview checklist |
| `/interview/[sessionId]` | Live voice interview |
| `/feedback`, `/feedback/[sessionId]` | Feedback list & detail |
| `/profile` | Profile & achievements |

## Getting started

1. Copy `.env.example` to `.env.local` and fill in values:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GROQ_API_KEY=
DEEPGRAM_API_KEY=
MURF_API_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:1337
CRON_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
```

2. Run `supabase/schema.sql` in the Supabase SQL editor.

3. Install and start:

```bash
npm install
npm run dev
```

Open [http://localhost:1337](http://localhost:1337).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port 1337 |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |

## API routes

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /api/sessions` | Yes | Create session + background question gen |
| `POST /api/process-turn` | Yes | Turn pipeline (text or legacy audio upload) |
| `GET /api/stt/token` | Yes | Ephemeral Deepgram key for live STT |
| `POST /api/tts/stream` | Yes | Stream Murf MP3 to client |
| `POST /api/feedback` | Yes | Generate feedback report |
| `GET /api/cron/cleanup` | Cron secret | Daily stale-session cleanup |

## Project structure

```
src/
├── app/
│   ├── (auth)/          # Login, signup, OTP flows
│   ├── (app)/           # Dashboard, setup, feedback, profile
│   ├── interview/       # Immersive interview UI
│   └── api/             # Server routes
├── components/
│   ├── auth/            # Shared auth UI
│   ├── interview/       # Interview panels
│   ├── ui/              # Design tokens & primitives
│   └── dashboard/       # Dashboard cards
├── hooks/               # useInterview*, useAuthForm, etc.
└── lib/                 # AI, Supabase, types, utils
```

## Production

- Set all env vars in Vercel (Production)
- Configure Supabase Site URL + redirect URLs for your domain
- Set `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` for daily cleanup
- Smoke test: signup → dashboard → setup → interview → feedback
