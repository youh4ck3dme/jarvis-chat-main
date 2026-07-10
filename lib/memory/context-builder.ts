/**
 * Context Builder
 * Builds AI context from memory for better conversation understanding
 */

import { Logger } from '@/lib/logger';

import { MemoryContext, MemoryEntry, MemoryType, ConversationMemory, UserProfile } from './types';
import { getMemoryStore } from './memory-store';

// Configuration for context building
const CONTEXT_CONFIG = {
  MAX_FACTS: 20,           // Maximum number of facts to include
  MAX_PREFERENCES: 10,     // Maximum number of preferences
  MAX_CONTEXT_LENGTH: 8000, // Maximum total context length in characters
  MIN_CONFIDENCE: 0.6,      // Minimum confidence score for memory entries
  RECENT_MESSAGES_COUNT: 5, // Number of recent messages to include
};

/**
 * Format memory entries for AI context
 */
function formatMemoryEntries(entries: MemoryEntry[]): string {
  if (entries.length === 0) return '';

  const formatted = entries
    .sort((a, b) => b.importance - a.importance || b.lastAccessed.getTime() - a.lastAccessed.getTime())
    .map((entry, index) => {
      const prefix = entry.type === 'user_info' ? 'USER PROFILE' :
                   entry.type === 'preference' ? 'PREFERENCE' :
                   entry.type === 'fact' ? 'FACT' :
                   entry.type === 'question' ? 'QUESTION' : 'INFO';
      
      return `${prefix} ${index + 1}: ${entry.content}`;
    })
    .join('\n');

  return formatted;
}

/**
 * Format conversation memory for context
 */
function formatConversationMemory(memory: ConversationMemory | null): string {
  if (!memory) return '';

  const parts: string[] = [];

  if (memory.summary) {
    parts.push(`CONVERSATION SUMMARY: ${memory.summary}`);
  }

  if (memory.keyPoints && memory.keyPoints.length > 0) {
    parts.push(`KEY POINTS: ${memory.keyPoints.join(', ')}`);
  }

  if (memory.unresolvedQuestions && memory.unresolvedQuestions.length > 0) {
    parts.push(`UNRESOLVED QUESTIONS: ${memory.unresolvedQuestions.join(', ')}`);
  }

  if (memory.entities) {
    if (memory.entities.people.length > 0) {
      parts.push(`PEOPLE MENTIONED: ${memory.entities.people.join(', ')}`);
    }
    if (memory.entities.places.length > 0) {
      parts.push(`LOCATIONS: ${memory.entities.places.join(', ')}`);
    }
    if (memory.entities.organizations.length > 0) {
      parts.push(`ORGANIZATIONS: ${memory.entities.organizations.join(', ')}`);
    }
    if (memory.entities.dates.length > 0) {
      parts.push(`DATES: ${memory.entities.dates.join(', ')}`);
    }
  }

  return parts.join('\n');
}

/**
 * Format user profile for context
 */
function formatUserProfile(profile: UserProfile | null): string {
  if (!profile) return '';

  const parts: string[] = [];

  if (profile.name) {
    parts.push(`USER NAME: ${profile.name}`);
  }

  if (profile.preferences) {
    if (profile.preferences.language) {
      parts.push(`LANGUAGE: ${profile.preferences.language}`);
    }
    if (profile.preferences.personaPreferences) {
      parts.push(`PREFERRED PERSONAS: ${profile.preferences.personaPreferences.join(', ')}`);
    }
  }

  return parts.length > 0 ? parts.join('\n') : '';
}

/**
 * Build context string from MemoryContext
 */
export function buildContextString(context: MemoryContext): string {
  const parts: string[] = [];

  // Add user profile
  if (context.userPreferences && context.userPreferences.length > 0) {
    parts.push(formatMemoryEntries(context.userPreferences));
  }

  // Add conversation memory
  if (context.summary) {
    parts.push(`CONVERSATION CONTEXT: ${context.summary}`);
  }

  // Add key facts
  if (context.keyFacts && context.keyFacts.length > 0) {
    parts.push(formatMemoryEntries(context.keyFacts));
  }

  // Add recent messages
  if (context.recentMessages && context.recentMessages.length > 0) {
    const recentFormatted = context.recentMessages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
    parts.push(`RECENT MESSAGES:\n${recentFormatted}`);
  }

  return parts.length > 0 ? parts.join('\n\n') : '';
}

/**
 * Truncate context to fit within max length
 */
function truncateContext(context: string, maxLength: number): string {
  if (context.length <= maxLength) return context;

  // Try to truncate at sentence boundaries
  const sentences = context.split(/[\.\!\?]/);
  let truncated = '';
  let currentLength = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    if (currentLength + sentence.length + 1 <= maxLength) {
      truncated += sentence + (i < sentences.length - 1 ? '.' : '');
      currentLength += sentence.length + 1;
    } else {
      break;
    }
  }

  // If still too long, do a hard truncate
  if (truncated.length > maxLength) {
    truncated = context.substring(0, maxLength) + '...';
  }

  return truncated;
}

/**
 * Filter memory entries by confidence
 */
function filterByConfidence(entries: MemoryEntry[], minConfidence: number): MemoryEntry[] {
  return entries.filter(entry => entry.metadata.confidence >= minConfidence);
}

/**
 * Limit number of entries and sort by importance
 */
function limitAndSortEntries(entries: MemoryEntry[], maxCount: number): MemoryEntry[] {
  return entries
    .sort((a, b) => b.importance - a.importance || b.lastAccessed.getTime() - a.lastAccessed.getTime())
    .slice(0, maxCount);
}

/**
 * Build optimized context for AI
 */
export async function buildAICcontext(
  conversationId: string,
  recentMessages?: Array<{role: 'user' | 'assistant'; content: string}>
): Promise<{
  context: string;
  systemPrompt: string;
  fullContext: MemoryContext;
}> {
  try {
    // Get full context from memory store
    const memoryStore = getMemoryStore();
    let fullContext = await memoryStore.buildContext(conversationId, CONTEXT_CONFIG.MAX_FACTS);

    // Add recent messages if provided
    if (recentMessages) {
      fullContext.recentMessages = recentMessages.slice(-CONTEXT_CONFIG.RECENT_MESSAGES_COUNT);
    }

    // Get user profile for personalization
    const userProfile = await memoryStore.getUserProfile();

    // Get conversation memory for better context
    const conversationMemory = await memoryStore.getConversationMemory(conversationId);

    // Filter and limit entries
    const filteredFacts = filterByConfidence(fullContext.keyFacts, CONTEXT_CONFIG.MIN_CONFIDENCE);
    const limitedFacts = limitAndSortEntries(filteredFacts, CONTEXT_CONFIG.MAX_FACTS);

    const filteredPrefs = filterByConfidence(fullContext.userPreferences, CONTEXT_CONFIG.MIN_CONFIDENCE);
    const limitedPrefs = limitAndSortEntries(filteredPrefs, CONTEXT_CONFIG.MAX_PREFERENCES);

    // Build the context object
    fullContext = {
      ...fullContext,
      keyFacts: limitedFacts,
      userPreferences: limitedPrefs,
    };

    // Build context string
    let contextString = '';

    // Start with system-level context
    const systemParts: string[] = [];

    // Add user profile info
    const profileContext = formatUserProfile(userProfile);
    if (profileContext) {
      systemParts.push(profileContext);
    }

    // Add conversation context
    const conversationContext = formatConversationMemory(conversationMemory);
    if (conversationContext) {
      systemParts.push(conversationContext);
    }

    // Add preferences
    if (limitedPrefs.length > 0) {
      systemParts.push(formatMemoryEntries(limitedPrefs));
    }

    // Add facts
    if (limitedFacts.length > 0) {
      systemParts.push(formatMemoryEntries(limitedFacts));
    }

    // Add recent messages
    if (fullContext.recentMessages.length > 0) {
      const recentFormatted = fullContext.recentMessages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');
      systemParts.push(`RECENT CONVERSATION:\n${recentFormatted}`);
    }

    contextString = systemParts.join('\n\n');

    // Truncate if too long
    contextString = truncateContext(contextString, CONTEXT_CONFIG.MAX_CONTEXT_LENGTH);

    // Build system prompt with context
    const systemPrompt = buildSystemPromptWithContext(contextString, userProfile);

    return {
      context: contextString,
      systemPrompt,
      fullContext,
    };

  } catch (error) {
    Logger.error('Failed to build AI context:', error);
    return {
      context: '',
      systemPrompt: 'You are a helpful, friendly AI assistant.',
      fullContext: {
        conversationId,
        summary: '',
        keyFacts: [],
        userPreferences: [],
        recentMessages: recentMessages || [],
      },
    };
  }
}

/**
 * Build system prompt with memory context
 */
function buildSystemPromptWithContext(context: string, profile?: UserProfile | null): string {
  const basePrompt = 'You are a helpful, friendly AI assistant. You provide clear, concise, and accurate responses.';

  if (!context) {
    return basePrompt;
  }

  // Personalize based on user profile
  const personalizedParts: string[] = [basePrompt];

  if (profile?.name) {
    personalizedParts.push(`The user's name is ${profile.name}.`);
  }

  if (profile?.preferences?.language) {
    personalizedParts.push(`The user prefers to communicate in ${profile.preferences.language}.`);
  }

  // Add context instruction
  personalizedParts.push('CONTEXT: The following information is from previous conversations and user preferences.');
  personalizedParts.push('Use this context to provide more personalized and relevant responses.');
  personalizedParts.push('If the context is not relevant to the current question, ignore it.');

  return personalizedParts.join(' ') + '\n\n' + context;
}

/**
 * Get memory context for display in UI
 */
export async function getMemoryContextForDisplay(conversationId: string): Promise<{
  userProfile: UserProfile | null;
  conversationMemory: ConversationMemory | null;
  keyFacts: MemoryEntry[];
  preferences: MemoryEntry[];
  userInfo: MemoryEntry[];
  stats: {
    totalMemories: number;
    lastUpdated: Date | null;
  };
}> {
  try {
    const memoryStore = getMemoryStore();
    const [
      userProfile,
      conversationMemory,
      facts,
      preferences,
      userInfo,
      stats
    ] = await Promise.all([
      memoryStore.getUserProfile(),
      memoryStore.getConversationMemory(conversationId),
      memoryStore.queryByConversation(conversationId),
      memoryStore.queryByType('preference'),
      memoryStore.queryByType('user_info'),
      memoryStore.getStats(),
    ]);

    // Filter facts for this conversation
    const conversationFacts = facts.filter(f => f.type === 'fact');
    const conversationUserInfo = userInfo.filter(u => u.metadata.sourceConversationId === conversationId);
    const conversationPreferences = preferences.filter(p => p.metadata.sourceConversationId === conversationId);

    // Get last updated date
    const allMemories = [...conversationFacts, ...conversationUserInfo, ...conversationPreferences];
    const lastUpdated = allMemories.length > 0 
      ? new Date(Math.max(...allMemories.map(m => m.lastAccessed.getTime())))
      : null;

    return {
      userProfile,
      conversationMemory,
      keyFacts: conversationFacts,
      preferences: conversationPreferences,
      userInfo: conversationUserInfo,
      stats: {
        totalMemories: allMemories.length,
        lastUpdated,
      },
    };

  } catch (error) {
    Logger.error('Failed to get memory context for display:', error);
    return {
      userProfile: null,
      conversationMemory: null,
      keyFacts: [],
      preferences: [],
      userInfo: [],
      stats: {
        totalMemories: 0,
        lastUpdated: null,
      },
    };
  }
}

/**
 * Update user profile with extracted information
 */
export async function updateUserProfileFromMemory(
  userProfile: Partial<UserProfile> = {}
): Promise<UserProfile> {
  const memoryStore = getMemoryStore();
  const currentProfile = await memoryStore.getUserProfile();
  
  const updatedProfile: UserProfile = {
    id: 'userProfile',
    name: userProfile.name || currentProfile?.name,
    preferences: {
      language: userProfile.preferences?.language || currentProfile?.preferences?.language || 'en',
      modelPreferences: userProfile.preferences?.modelPreferences || currentProfile?.preferences?.modelPreferences || {},
      personaPreferences: userProfile.preferences?.personaPreferences || currentProfile?.preferences?.personaPreferences || [],
      notificationPreferences: userProfile.preferences?.notificationPreferences || currentProfile?.preferences?.notificationPreferences || {},
    },
    createdAt: currentProfile?.createdAt || new Date(),
    updatedAt: new Date(),
  };

  await memoryStore.updateUserProfile(updatedProfile);
  
  return updatedProfile;
}

/**
 * Clear memory for a specific conversation
 */
export async function clearConversationMemory(conversationId: string): Promise<void> {
  const memoryStore = getMemoryStore();
  await memoryStore.deleteByConversation(conversationId);
}

/**
 * Get all memories for a user
 */
export async function getAllUserMemories(): Promise<{
  allMemories: MemoryEntry[];
  byType: Record<string, MemoryEntry[]>;
}> {
  try {
    const memoryStore = getMemoryStore();
    const allTypes: MemoryType[] = ['fact', 'preference', 'context', 'user_info', 'question', 'persona', 'summarization'];
    const byType: Record<string, MemoryEntry[]> = {};

    await Promise.all(
      allTypes.map(async type => {
        byType[type] = await memoryStore.queryByType(type);
      })
    );

    const allMemories = Object.values(byType).flat();

    return {
      allMemories,
      byType,
    };

  } catch (error) {
    Logger.error('Failed to get all user memories:', error);
    return {
      allMemories: [],
      byType: {},
    };
  }
}

export {
  CONTEXT_CONFIG,
};
