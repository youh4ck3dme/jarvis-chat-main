-- Multi-Artifact Workspace: persist page artifacts across Supabase session sync.
-- Safe for projects where the base sessions migration has already been applied.

ALTER TABLE jarvis_chat_sessions
  ADD COLUMN IF NOT EXISTS artifacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS active_artifact_id TEXT;

COMMENT ON COLUMN jarvis_chat_sessions.artifacts IS
  'Multi-page Builder artifacts: id, slug, title, HTML, and created timestamp';

COMMENT ON COLUMN jarvis_chat_sessions.active_artifact_id IS
  'Selected artifact tab identifier for the session';
