import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api-response";
import { Logger } from "@/lib/logger";
import type { ChatSession } from "@/lib/chat/chat-sessions";
import { normalizeSessionArtifacts } from "@/lib/chat/session-artifacts";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { isSupabaseSyncConfigured } from "@/lib/supabase/config";
import { verifyRequestAuth } from "@/lib/supabase/verify-request-auth";

const sessionArtifactSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  html: z.string(),
  createdAt: z.string(),
});

const sessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(z.unknown()),
  projectName: z.string(),
  updatedAt: z.string(),
  artifacts: z.array(sessionArtifactSchema).optional().default([]),
  activeArtifactId: z.string().nullable().optional().default(null),
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
  artifacts?: ChatSession["artifacts"] | null;
  active_artifact_id?: string | null;
  updated_at: string;
  deleted_at: string | null;
};

const SESSION_SELECT_WITH_ARTIFACTS =
  "session_id,sync_key,title,project_name,messages,artifacts,active_artifact_id,updated_at,deleted_at";
const SESSION_SELECT_LEGACY =
  "session_id,sync_key,title,project_name,messages,updated_at,deleted_at";

function mapRowToSession(row: RemoteSessionRow): ChatSession {
  const { artifacts, activeArtifactId } = normalizeSessionArtifacts(
    row.artifacts,
    row.active_artifact_id,
  );

  return {
    id: row.session_id,
    title: row.title,
    messages: row.messages,
    projectName: row.project_name,
    updatedAt: row.updated_at,
    artifacts,
    activeArtifactId,
  };
}

/** True when migration 003 (artifacts columns) is not applied yet. */
export function isMissingArtifactColumnError(
  error: { message?: string; code?: string; details?: string } | null | undefined,
): boolean {
  if (!error) return false;
  const haystack = `${error.message ?? ""} ${error.details ?? ""} ${error.code ?? ""}`.toLowerCase();
  const mentionsColumn =
    haystack.includes("artifacts") || haystack.includes("active_artifact_id");
  return (
    mentionsColumn &&
    (haystack.includes("does not exist") ||
      haystack.includes("could not find") ||
      haystack.includes("schema cache") ||
      error.code === "42703" ||
      error.code === "PGRST204")
  );
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

  let result: {
    data: RemoteSessionRow[] | null;
    error: { message?: string; code?: string; details?: string } | null;
  } = await supabase
    .from("jarvis_chat_sessions")
    .select(SESSION_SELECT_WITH_ARTIFACTS)
    .eq("sync_key", auth.user.userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (result.error && isMissingArtifactColumnError(result.error)) {
    Logger.warn(
      "Session sync pull: artifacts columns missing — falling back until migration 003 is applied",
      { error: String(result.error.message ?? result.error) },
    );
    result = await supabase
      .from("jarvis_chat_sessions")
      .select(SESSION_SELECT_LEGACY)
      .eq("sync_key", auth.user.userId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
  }

  if (result.error) {
    Logger.error("Session sync pull error", result.error);
    return jsonError("Nepodarilo sa načítať sessions zo Supabase.", 500);
  }

  const sessions = (result.data ?? []).map((row) => mapRowToSession(row as RemoteSessionRow));

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

  const rowsWithArtifacts = body.sessions.map((session) => ({
    session_id: session.id,
    sync_key: auth.user.userId,
    title: session.title,
    project_name: session.projectName,
    messages: session.messages,
    artifacts: session.artifacts,
    active_artifact_id: session.activeArtifactId,
    updated_at: session.updatedAt,
    deleted_at: null,
  }));

  if (rowsWithArtifacts.length > 0) {
    let upsertError = (
      await supabase.from("jarvis_chat_sessions").upsert(rowsWithArtifacts, {
        onConflict: "sync_key,session_id",
      })
    ).error;

    if (upsertError && isMissingArtifactColumnError(upsertError)) {
      Logger.warn(
        "Session sync push: artifacts columns missing — falling back until migration 003 is applied",
        { error: String(upsertError.message ?? upsertError) },
      );
      const legacyRows = body.sessions.map((session) => ({
        session_id: session.id,
        sync_key: auth.user.userId,
        title: session.title,
        project_name: session.projectName,
        messages: session.messages,
        updated_at: session.updatedAt,
        deleted_at: null,
      }));
      upsertError = (
        await supabase.from("jarvis_chat_sessions").upsert(legacyRows, {
          onConflict: "sync_key,session_id",
        })
      ).error;
    }

    if (upsertError) {
      Logger.error("Session sync push error", upsertError);
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
      Logger.error("Session sync delete error", deleteError);
      return jsonError("Nepodarilo sa označiť zmazané sessions v Supabase.", 500);
    }
  }

  return jsonSuccess({
    synced: rowsWithArtifacts.length,
    deleted: body.deletedSessionIds?.length ?? 0,
  });
}