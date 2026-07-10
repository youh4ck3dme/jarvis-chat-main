import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api-response";
import type { ChatSession } from "@/lib/chat/chat-sessions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { isSupabaseSyncConfigured } from "@/lib/supabase/config";
import { verifyRequestAuth } from "@/lib/supabase/verify-request-auth";

const sessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(z.unknown()),
  projectName: z.string(),
  updatedAt: z.string(),
});

const pushBodySchema = z.object({
  sessions: z.array(sessionSchema),
  deletedSessionIds: z.array(z.string()).optional(),
});

type RemoteSessionRow = {
  session_id: string;
  sync_key: string;
  title: string;
  project_name: string;
  messages: ChatSession["messages"];
  updated_at: string;
  deleted_at: string | null;
};

function mapRowToSession(row: RemoteSessionRow): ChatSession {
  return {
    id: row.session_id,
    title: row.title,
    messages: row.messages,
    projectName: row.project_name,
    updatedAt: row.updated_at,
  };
}

export async function GET(req: Request) {
  if (!isSupabaseSyncConfigured()) {
    return jsonError("Session sync nie je nakonfigurovaný (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).", 503);
  }

  const auth = await verifyRequestAuth(req);
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return jsonError("Supabase klient nie je dostupný.", 503);
  }

  const { data, error } = await supabase
    .from("jarvis_chat_sessions")
    .select("session_id,sync_key,title,project_name,messages,updated_at,deleted_at")
    .eq("sync_key", auth.user.userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Session sync pull error:", error);
    return jsonError("Nepodarilo sa načítať sessions zo Supabase.", 500);
  }

  const sessions = (data ?? []).map((row) => mapRowToSession(row as RemoteSessionRow));

  return jsonSuccess({
    sessions,
    activeSessionId: sessions[0]?.id ?? null,
  });
}

export async function POST(req: Request) {
  if (!isSupabaseSyncConfigured()) {
    return jsonError("Session sync nie je nakonfigurovaný (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).", 503);
  }

  const auth = await verifyRequestAuth(req);
  if (!auth.ok) {
    return auth.response;
  }

  let body: z.infer<typeof pushBodySchema>;
  try {
    body = pushBodySchema.parse(await req.json());
  } catch {
    return jsonError("Neplatný payload pre session sync.", 400);
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return jsonError("Supabase klient nie je dostupný.", 503);
  }

  const rows = body.sessions.map((session) => ({
    session_id: session.id,
    sync_key: auth.user.userId,
    title: session.title,
    project_name: session.projectName,
    messages: session.messages,
    updated_at: session.updatedAt,
    deleted_at: null,
  }));

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from("jarvis_chat_sessions")
      .upsert(rows, { onConflict: "sync_key,session_id" });

    if (upsertError) {
      console.error("Session sync push error:", upsertError);
      return jsonError("Nepodarilo sa uložiť sessions do Supabase.", 500);
    }
  }

  if (body.deletedSessionIds && body.deletedSessionIds.length > 0) {
    const deletedAt = new Date().toISOString();
    const { error: deleteError } = await supabase
      .from("jarvis_chat_sessions")
      .update({ deleted_at: deletedAt })
      .eq("sync_key", auth.user.userId)
      .in("session_id", body.deletedSessionIds);

    if (deleteError) {
      console.error("Session sync delete error:", deleteError);
      return jsonError("Nepodarilo sa označiť zmazané sessions v Supabase.", 500);
    }
  }

  return jsonSuccess({ synced: rows.length, deleted: body.deletedSessionIds?.length ?? 0 });
}