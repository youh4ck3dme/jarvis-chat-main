import { readSyncKey } from "./sync-key";
import { cloudSyncFetch, readCloudSyncError } from "./cloud-sync-client";

export async function migrateDeviceDataToUserAccount(): Promise<void> {
  const deviceSyncKey = readSyncKey();
  if (!deviceSyncKey) return;

  const response = await cloudSyncFetch("/api/sessions/sync/migrate", {
    method: "POST",
    body: JSON.stringify({ deviceSyncKey }),
  });

  if (!response) return;

  if (response.status === 503 || response.status === 401) {
    return;
  }

  if (!response.ok) {
    throw new Error(await readCloudSyncError(response));
  }
}