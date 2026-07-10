import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { isSupabaseSyncConfigured } from "@/lib/supabase/config";
import { verifyRequestAuth } from "@/lib/supabase/verify-request-auth";

const bodySchema = z.object({
  deviceSyncKey: z.string().min(8),
});

type SessionRow = {
  session_id: string;
  sync_key: string;
  title: string;
  project_name: string;
  messages: unknown[];
  updated_at: string;
  deleted_at: string | null;
};

type MemoryRow = {
  conversation_id: string;
  sync_key: string;
  entries: unknown[];
  conversation_memory: unknown | null;
  updated_at: string;
  deleted_at: string | null;
};

export async function POST(req: Request) {
  if (!isSupabaseSyncConfigured()) {
    return jsonError("Session sync nie je nakonfigurovaný.", 503);
  }

  const auth = await verifyRequestAuth(req);
  if (!auth.ok) {
    return auth.response;
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return jsonError("Neplatný payload pre migráciu.", 400);
  }

  if (body.deviceSyncKey === auth.user.userId) {
    return jsonSuccess({ migratedSessions: 0, migratedMemory: 0, skipped: true });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return jsonError("Supabase klient nie je dostupný.", 503);
  }

  const userId = auth.user.userId;
  const now = new Date().toISOString();

  const [{ data: deviceSessions }, { data: userSessions }] = await Promise.all([
    supabase
      .from("jarvis_chat_sessions")
      .select("session_id,sync_key,title,project_name,messages,updated_at,deleted_at")
      .eq("sync_key", body.deviceSyncKey)
      .is("deleted_at", null),
    supabase
      .from("jarvis_chat_sessions")
      .select("session_id,sync_key,title,project_name,messages,updated_at,deleted_at")
      .eq("sync_key", userId)
      .is("deleted_at", null),
  ]);

  const mergedSessions = new Map<string, SessionRow>();
  for (const row of [...(userSessions ?? []), ...(deviceSessions ?? [])] as SessionRow[]) {
    const existing = mergedSessions.get(row.session_id);
    if (!existing) {
      mergedSessions.set(row.session_id, row);
      continue;
    }
    if (new Date(row.updated_at).getTime() >= new Date(existing.updated_at).getTime()) {
      mergedSessions.set(row.session_id, row);
    }
  }

  const sessionUpserts = [...mergedSessions.values()].map((row) => ({
    session_id: row.session_id,
    sync_key: userId,
    title: row.title,
    project_name: row.project_name,
    messages: row.messages,
    updated_at: row.updated_at,
    deleted_at: null,
  }));

  if (sessionUpserts.length > 0) {
    const { error } = await supabase
      .from("jarvis_chat_sessions")
      .upsert(sessionUpserts, { onConflict: "sync_key,session_id" });

    if (error) {
      console.error("Session migration error:", error);
      return jsonError("Nepodarilo sa migrovať sessions.", 500);
    }
  }

  await supabase
    .from("jarvis_chat_sessions")
    .update({ deleted_at: now })
    .eq("sync_key", body.deviceSyncKey);

  const [{ data: deviceMemory }, { data: userMemory }] = await Promise.all([
    supabase
      .from("jarvis_conversation_memory")
      .select("conversation_id,sync_key,entries,conversation_memory,updated_at,deleted_at")
      .eq("sync_key", body.deviceSyncKey)
      .is("deleted_at", null),
    supabase
      .from("jarvis_conversation_memory")
      .select("conversation_id,sync_key,entries,conversation_memory,updated_at,deleted_at")
      .eq("sync_key", userId)
      .is("deleted_at", null),
  ]);

  const mergedMemory = new Map<string, MemoryRow>();
  for (const row of [...(userMemory ?? []), ...(deviceMemory ?? [])] as MemoryRow[]) {
    const existing = mergedMemory.get(row.conversation_id);
    if (!existing) {
      mergedMemory.set(row.conversation_id, row);
      continue;
    }
    if (new Date(row.updated_at).getTime() >= new Date(existing.updated_at).getTime()) {
      mergedMemory.set(row.conversation_id, row);
    }
  }

  const memoryUpserts = [...mergedMemory.values()].map((row) => ({
    sync_key: userId,
    conversation_id: row.conversation_id,
    entries: row.entries,
    conversation_memory: row.conversation_memory,
    updated_at: row.updated_at,
    deleted_at: null,
  }));

  if (memoryUpserts.length > 0) {
    const { error } = await supabase
      .from("jarvis_conversation_memory")
      .upsert(memoryUpserts, { onConflict: "sync_key,conversation_id" });

    if (error) {
      console.error("Memory migration error:", error);
      return jsonError("Nepodarilo sa migrovať pamäť.", 500);
    }
  }

  await supabase
    .from("jarvis_conversation_memory")
    .update({ deleted_at: now })
    .eq("sync_key", body.deviceSyncKey);

  const { data: deviceProfile } = await supabase
    .from("jarvis_user_memory_profile")
    .select("profile,updated_at")
    .eq("sync_key", body.deviceSyncKey)
    .maybeSingle();

  if (deviceProfile?.profile) {
    await supabase.from("jarvis_user_memory_profile").upsert(
      {
        sync_key: userId,
        profile: deviceProfile.profile,
        updated_at: now,
      },
      { onConflict: "sync_key" },
    );
  }

  return jsonSuccess({
    migratedSessions: sessionUpserts.length,
    migratedMemory: memoryUpserts.length,
    skipped: false,
  });
}