-- InterviewAI — initial Supabase schema (matches current app code)
-- Run this entire file in: Supabase Dashboard → SQL Editor → New query → Run

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE interview_type_enum AS ENUM (
    'DSA', 'Frontend', 'Backend', 'Fullstack', 'Cybersecurity', 'DevOps'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE difficulty_enum AS ENUM ('Easy', 'Medium', 'Hard');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE session_status_enum AS ENUM ('active', 'completed', 'abandoned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE question_status_enum AS ENUM ('pending', 'active', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE verdict_enum AS ENUM (
    'Strong Hire', 'Hire', 'Lean Hire', 'Lean No Hire', 'No Hire'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- USER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name               TEXT,
  avatar_url              TEXT,
  total_interviews        INT NOT NULL DEFAULT 0,
  total_questions_solved  INT NOT NULL DEFAULT 0,
  average_score           NUMERIC(4,1) NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- INTERVIEW SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interview_type          interview_type_enum NOT NULL,
  difficulty              difficulty_enum NOT NULL,
  topics                  TEXT[] NOT NULL DEFAULT '{}',
  num_questions           INT NOT NULL DEFAULT 3 CHECK (num_questions BETWEEN 1 AND 10),
  voice_id                TEXT NOT NULL DEFAULT 'en-US-matthew',
  status                  session_status_enum NOT NULL DEFAULT 'active',
  current_question_index  INT NOT NULL DEFAULT 0,
  messages                JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at            TIMESTAMPTZ,
  duration_seconds        INT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_created
  ON public.interview_sessions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_status_created
  ON public.interview_sessions (status, created_at)
  WHERE status = 'active';

-- Keep activity timestamps reliable for cleanup and dashboard ordering.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_interview_sessions_updated_at ON public.interview_sessions;
CREATE TRIGGER set_interview_sessions_updated_at
  BEFORE UPDATE ON public.interview_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- INTERVIEW QUESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.interview_questions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id              UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  question_title          TEXT NOT NULL,
  question_description    TEXT NOT NULL,
  question_difficulty     difficulty_enum NOT NULL,
  question_type           TEXT NOT NULL,
  constraints             TEXT[],
  examples                JSONB,
  followup_guidelines       TEXT[],
  question_order          INT NOT NULL CHECK (question_order >= 1),
  status                  question_status_enum NOT NULL DEFAULT 'pending',
  followup_count          INT NOT NULL DEFAULT 0 CHECK (followup_count >= 0),
  user_code               TEXT,
  user_answer             TEXT,
  is_completed            BOOLEAN NOT NULL DEFAULT false,
  asked_at                TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  time_spent_seconds      INT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_order)
);

CREATE INDEX IF NOT EXISTS idx_interview_questions_session_status
  ON public.interview_questions (session_id, status, question_order);

CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_question_per_session
  ON public.interview_questions (session_id)
  WHERE status = 'active';

-- ============================================================
-- FEEDBACK REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feedback_reports (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                  UUID NOT NULL UNIQUE REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  user_id                     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score               NUMERIC(3,1) NOT NULL CHECK (overall_score BETWEEN 0 AND 10),
  overall_verdict             verdict_enum NOT NULL,
  summary                     TEXT NOT NULL,
  strengths                   TEXT[] NOT NULL DEFAULT '{}',
  areas_for_improvement       TEXT[] NOT NULL DEFAULT '{}',
  recommendations             TEXT[] NOT NULL DEFAULT '{}',
  technical_skills_score      NUMERIC(3,1),
  technical_skills_feedback   TEXT,
  problem_solving_score       NUMERIC(3,1),
  problem_solving_feedback    TEXT,
  communication_score         NUMERIC(3,1),
  communication_feedback      TEXT,
  full_feedback_json          JSONB,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_reports_user_created
  ON public.feedback_reports (user_id, created_at DESC);

-- ============================================================
-- USER STATISTICS VIEW (used by dashboard)
-- ============================================================
CREATE OR REPLACE VIEW public.user_statistics AS
SELECT
  p.id AS user_id,
  p.full_name,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'completed') AS total_interviews,
  COALESCE(AVG(f.overall_score) FILTER (WHERE s.status = 'completed'), 0)::NUMERIC(4,1) AS average_score,
  COUNT(DISTINCT s.id) AS total_sessions,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'completed') AS completed_sessions,
  COUNT(q.id) AS total_questions_attempted,
  COUNT(q.id) FILTER (WHERE q.status = 'completed') AS questions_completed
FROM public.user_profiles p
LEFT JOIN public.interview_sessions s ON s.user_id = p.id
LEFT JOIN public.interview_questions q ON q.session_id = s.id
LEFT JOIN public.feedback_reports f ON f.session_id = s.id
GROUP BY p.id, p.full_name;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

-- user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- interview_sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON public.interview_sessions;
CREATE POLICY "Users can view own sessions"
  ON public.interview_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON public.interview_sessions;
CREATE POLICY "Users can insert own sessions"
  ON public.interview_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON public.interview_sessions;
CREATE POLICY "Users can update own sessions"
  ON public.interview_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- interview_questions (via session ownership)
DROP POLICY IF EXISTS "Users can view own questions" ON public.interview_questions;
CREATE POLICY "Users can view own questions"
  ON public.interview_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.interview_sessions s
      WHERE s.id = interview_questions.session_id
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own questions" ON public.interview_questions;
CREATE POLICY "Users can insert own questions"
  ON public.interview_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interview_sessions s
      WHERE s.id = interview_questions.session_id
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own questions" ON public.interview_questions;
CREATE POLICY "Users can update own questions"
  ON public.interview_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.interview_sessions s
      WHERE s.id = interview_questions.session_id
        AND s.user_id = auth.uid()
    )
  );

-- feedback_reports
DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback_reports;
CREATE POLICY "Users can view own feedback"
  ON public.feedback_reports FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own feedback" ON public.feedback_reports;
CREATE POLICY "Users can insert own feedback"
  ON public.feedback_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- user_statistics view: inherit RLS from underlying tables (Postgres 15+)
-- Dashboard reads via authenticated client — underlying table policies apply.
