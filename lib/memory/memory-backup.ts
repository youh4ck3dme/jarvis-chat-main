import type { ConversationMemory, MemoryEntry, UserProfile } from "./types";
import { getMemoryStore } from "./memory-store";
import type { ConversationMemoryBundle, JarvisBackupPayload } from "@/lib/chat/jarvis-backup";

function serializeMemoryEntry(entry: MemoryEntry) {
  return {
    ...entry,
    lastAccessed: entry.lastAccessed.toISOString(),
    createdAt: entry.createdAt.toISOString(),
  };
}

function serializeConversationMemory(memory: ConversationMemory) {
  return {
    ...memory,
    createdAt: memory.createdAt.toISOString(),
    updatedAt: memory.updatedAt.toISOString(),
  };
}

function serializeUserProfile(profile: UserProfile | null) {
  if (!profile) return null;
  return {
    ...profile,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export async function exportMemorySnapshot(
  conversationIds: string[],
): Promise<JarvisBackupPayload["memory"]> {
  const memoryStore = getMemoryStore();
  const conversations: ConversationMemoryBundle[] = [];

  for (const conversationId of conversationIds) {
    const [entries, conversationMemory] = await Promise.all([
      memoryStore.queryByConversation(conversationId),
      memoryStore.getConversationMemory(conversationId),
    ]);

    if (entries.length === 0 && !conversationMemory) {
      continue;
    }

    conversations.push({
      conversationId,
      entries: entries.map(serializeMemoryEntry),
      conversationMemory: conversationMemory
        ? serializeConversationMemory(conversationMemory)
        : null,
    });
  }

  const userProfile = await memoryStore.getUserProfile();

  return {
    conversations,
    userProfile: serializeUserProfile(userProfile),
  };
}

function deserializeMemoryEntry(entry: ConversationMemoryBundle["entries"][number]): MemoryEntry {
  return {
    ...entry,
    type: entry.type as MemoryEntry["type"],
    lastAccessed: new Date(entry.lastAccessed),
    createdAt: new Date(entry.createdAt),
  };
}

function deserializeConversationMemory(
  memory: NonNullable<ConversationMemoryBundle["conversationMemory"]>,
): ConversationMemory {
  return {
    ...memory,
    createdAt: new Date(memory.createdAt),
    updatedAt: new Date(memory.updatedAt),
  };
}

function deserializeUserProfile(
  profile: NonNullable<JarvisBackupPayload["memory"]["userProfile"]>,
): UserProfile {
  return {
    id: profile.id,
    name: typeof profile.name === "string" ? profile.name : undefined,
    preferences: (profile.preferences ?? {}) as UserProfile["preferences"],
    createdAt: new Date(profile.createdAt),
    updatedAt: new Date(profile.updatedAt),
  };
}

export async function importMemorySnapshot(memory: JarvisBackupPayload["memory"]): Promise<void> {
  const memoryStore = getMemoryStore();

  for (const bundle of memory.conversations) {
    for (const entry of bundle.entries) {
      await memoryStore.putEntry(deserializeMemoryEntry(entry));
    }

    if (bundle.conversationMemory) {
      await memoryStore.updateConversationMemory(
        deserializeConversationMemory(bundle.conversationMemory),
      );
    }
  }

  if (memory.userProfile) {
    await memoryStore.updateUserProfile(deserializeUserProfile(memory.userProfile));
  }
}