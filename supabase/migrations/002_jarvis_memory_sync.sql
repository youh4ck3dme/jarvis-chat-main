-- Jarvis memory cloud sync (Prompt 17)

CREATE TABLE IF NOT EXISTS jarvis_conversation_memory (
  sync_key TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  conversation_memory JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (sync_key, conversation_id)
);

CREATE TABLE IF NOT EXISTS jarvis_user_memory_profile (
  sync_key TEXT PRIMARY KEY,
  profile JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jarvis_conversation_memory_updated_idx
  ON jarvis_conversation_memory (sync_key, updated_at DESC);

COMMENT ON TABLE jarvis_conversation_memory IS 'Per-conversation Jarvis memory bundles synced from IndexedDB';