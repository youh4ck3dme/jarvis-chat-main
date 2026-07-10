import { jsonSuccess } from "@/lib/api-response";
import { isSupabaseSyncConfigured } from "@/lib/supabase/config";

export async function GET() {
  return jsonSuccess({
    enabled: isSupabaseSyncConfigured(),
  });
}