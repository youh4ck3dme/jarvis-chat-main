-- Jarvis chat session sync (Prompt 16)
-- Apply in Supabase SQL editor or via `supabase db push`

CREATE TABLE IF NOT EXISTS jarvis_chat_sessions (
  session_id TEXT NOT NULL,
  sync_key TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nová konverzácia',
  project_name TEXT NOT NULL DEFAULT 'Jarvis',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (sync_key, session_id)
);

CREATE INDEX IF NOT EXISTS jarvis_chat_sessions_updated_idx
  ON jarvis_chat_sessions (sync_key, updated_at DESC);

COMMENT ON TABLE jarvis_chat_sessions IS 'Device-scoped Jarvis chat sessions synced from browser localStorage';