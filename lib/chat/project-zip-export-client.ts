import { listBuildHistory } from "@/lib/build-history/build-history-store";
import { exportMemorySnapshot } from "@/lib/memory/memory-backup";

import type { ChatSessionsState } from "./chat-sessions";
import { readProjectName } from "./workspace-actions";
import { getOrCreateSyncKey } from "./sync-key";
import {
  buildProjectZipArchive,
  buildProjectZipFilename,
  downloadZipArchive,
} from "./project-zip-export";

export async function exportJarvisProjectZip(state: ChatSessionsState): Promise<void> {
  const projectName = readProjectName();
  const conversationIds = state.sessions.map((session) => session.id);
  const [memory, buildHistory] = await Promise.all([
    exportMemorySnapshot(conversationIds),
    listBuildHistory(50),
  ]);

  const archive = buildProjectZipArchive({
    sessions: state,
    memory,
    buildHistory,
    projectName,
    syncKey: getOrCreateSyncKey(),
  });

  downloadZipArchive(buildProjectZipFilename(projectName), archive);
}