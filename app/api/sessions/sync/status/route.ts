import { jsonSuccess } from "@/lib/api-response";
import { isSupabaseAuthConfigured, isSupabaseSyncConfigured } from "@/lib/supabase/config";

export async function GET() {
  return jsonSuccess({
    enabled: isSupabaseSyncConfigured(),
    authConfigured: isSupabaseAuthConfigured(),
    authRequired: true,
  });
}