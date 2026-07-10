import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { isSupabaseSyncConfigured } from "@/lib/supabase/config";
import { verifyRequestAuth } from "@/lib/supabase/verify-request-auth";

const memoryBundleSchema = z.object({
  conversationId: z.string(),
  entries: z.array(z.unknown()),
  conversationMemory: z.unknown().nullable(),
});

const pushBodySchema = z.object({
  memory: z.object({
    conversations: z.array(memoryBundleSchema),
    userProfile: z.unknown().nullable().optional(),
  }),
});

type RemoteMemoryRow = {
  sync_key: string;
  conversation_id: string;
  entries: unknown[];
  conversation_memory: unknown | null;
  updated_at: string;
  deleted_at: string | null;
};

export async function GET(req: Request) {
  if (!isSupabaseSyncConfigured()) {
    return jsonError("Memory sync nie je nakonfigurovaný (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).", 503);
  }

  const auth = await verifyRequestAuth(req);
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return jsonError("Supabase klient nie je dostupný.", 503);
  }

  const [{ data: rows, error }, { data: profileRow, error: profileError }] = await Promise.all([
    supabase
      .from("jarvis_conversation_memory")
      .select("sync_key,conversation_id,entries,conversation_memory,updated_at,deleted_at")
      .eq("sync_key", auth.user.userId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("jarvis_user_memory_profile")
      .select("profile,updated_at")
      .eq("sync_key", auth.user.userId)
      .maybeSingle(),
  ]);

  if (error || profileError) {
    console.error("Memory sync pull error:", error ?? profileError);
    return jsonError("Nepodarilo sa načítať pamäť zo Supabase.", 500);
  }

  const conversations = (rows ?? []).map((row) => {
    const typed = row as RemoteMemoryRow;
    return {
      conversationId: typed.conversation_id,
      entries: typed.entries,
      conversationMemory: typed.conversation_memory,
    };
  });

  return jsonSuccess({
    conversations,
    userProfile: profileRow?.profile ?? null,
  });
}

export async function POST(req: Request) {
  if (!isSupabaseSyncConfigured()) {
    return jsonError("Memory sync nie je nakonfigurovaný (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).", 503);
  }

  const auth = await verifyRequestAuth(req);
  if (!auth.ok) {
    return auth.response;
  }

  let body: z.infer<typeof pushBodySchema>;
  try {
    body = pushBodySchema.parse(await req.json());
  } catch {
    return jsonError("Neplatný payload pre memory sync.", 400);
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return jsonError("Supabase klient nie je dostupný.", 503);
  }

  const now = new Date().toISOString();
  const rows = body.memory.conversations.map((bundle) => ({
    sync_key: auth.user.userId,
    conversation_id: bundle.conversationId,
    entries: bundle.entries,
    conversation_memory: bundle.conversationMemory,
    updated_at: now,
    deleted_at: null,
  }));

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from("jarvis_conversation_memory")
      .upsert(rows, { onConflict: "sync_key,conversation_id" });

    if (upsertError) {
      console.error("Memory sync push error:", upsertError);
      return jsonError("Nepodarilo sa uložiť pamäť do Supabase.", 500);
    }
  }

  if (body.memory.userProfile) {
    const { error: profileError } = await supabase.from("jarvis_user_memory_profile").upsert(
      {
        sync_key: auth.user.userId,
        profile: body.memory.userProfile,
        updated_at: now,
      },
      { onConflict: "sync_key" },
    );

    if (profileError) {
      console.error("Memory profile sync error:", profileError);
      return jsonError("Nepodarilo sa uložiť user profile do Supabase.", 500);
    }
  }

  return jsonSuccess({ syncedConversations: rows.length });
}