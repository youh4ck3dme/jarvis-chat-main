/**
 * useMemory Hook
 * Client-side memory management for Jarvis-Chat
 */

import { useState, useEffect, useCallback } from 'react';

import { Logger } from '@/lib/logger';
import { 
  MemoryEntry, 
  MemoryType, 
  MemoryContext, 
  MemoryStats,
  ExtractedMemory,
  UserProfile,
  ConversationMemory,
  getMemoryStore,
  extractMemoryLightweight,
  saveExtractedMemory,
  updateConversationSummary,
  extractFromMessage,
  buildAICcontext,
  getMemoryContextForDisplay,
  clearConversationMemory,
  getAllUserMemories,
  updateUserProfileFromMemory
} from '@/lib/memory';

interface UseMemoryResult {
  // State
  isLoaded: boolean;
  error: string | null;
  stats: MemoryStats | null;
  userProfile: UserProfile | null;
  conversationMemory: ConversationMemory | null;
  
  // Actions
  extractAndSaveMemory: (conversationId: string, messages: Array<{role: 'user' | 'assistant'; content: string}>) => Promise<string[]>;
  extractFromMessage: (conversationId: string, message: {role: 'user' | 'assistant'; content: string}, messageId: string) => Promise<string[]>;
  updateConversationSummary: (conversationId: string, messages: Array<{role: 'user' | 'assistant'; content: string}>) => Promise<void>;
  buildContext: (conversationId: string, recentMessages?: Array<{role: 'user' | 'assistant'; content: string}>) => Promise<{
    context: string;
    systemPrompt: string;
    fullContext: MemoryContext;
  }>;
  getMemoryContext: (conversationId: string) => Promise<{
    userProfile: UserProfile | null;
    conversationMemory: ConversationMemory | null;
    keyFacts: MemoryEntry[];
    preferences: MemoryEntry[];
    userInfo: MemoryEntry[];
    stats: {
      totalMemories: number;
      lastUpdated: Date | null;
    };
  }>;
  clearConversationMemory: (conversationId: string) => Promise<void>;
  getAllMemories: () => Promise<{
    allMemories: MemoryEntry[];
    byType: Record<string, MemoryEntry[]>;
  }>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  deleteEntry: (id: string) => Promise<void>;
  queryByType: (type: MemoryType) => Promise<MemoryEntry[]>;
  searchMemories: (query: string) => Promise<MemoryEntry[]>;
  
  // Memory integration for chat
  getMemoryEnhancedSystem: (conversationId: string, customSystem?: string) => Promise<string>;
}

export function useMemory(): UseMemoryResult {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Initialize memory store
  useEffect(() => {
    async function init() {
      try {
        const memoryStore = getMemoryStore();
        // Load user profile
        const profile = await memoryStore.getUserProfile();
        setUserProfile(profile);

        // Load stats
        const memoryStats = await memoryStore.getStats();
        setStats(memoryStats);

        setIsLoaded(true);
      } catch (err) {
        Logger.error('Memory initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize memory');
        setIsLoaded(true);
      }
    }

    init();
  }, []);

  // Extract and save memory from conversation
  const extractAndSaveMemory = useCallback(async (
    conversationId: string,
    messages: Array<{role: 'user' | 'assistant'; content: string}>
  ): Promise<string[]> => {
    try {
      const extracted = extractMemoryLightweight(conversationId, messages);
      const savedIds = await saveExtractedMemory(conversationId, extracted);
      return savedIds;
    } catch (err) {
      Logger.error('Memory extraction error:', err);
      setError(err instanceof Error ? err.message : 'Failed to extract memory');
      return [];
    }
  }, []);

  // Extract from single message
  const extractFromSingleMessage = useCallback(async (
    conversationId: string,
    message: {role: 'user' | 'assistant'; content: string},
    messageId: string
  ): Promise<string[]> => {
    try {
      return await extractFromMessage(conversationId, message, messageId);
    } catch (err) {
      Logger.error('Message memory extraction error:', err);
      return [];
    }
  }, []);

  // Update conversation summary
  const updateConversationSummaryCallback = useCallback(async (
    conversationId: string,
    messages: Array<{role: 'user' | 'assistant'; content: string}>
  ): Promise<void> => {
    try {
      await updateConversationSummary(conversationId, messages);
      // Refresh stats
      const memoryStore = getMemoryStore();
      const memoryStats = await memoryStore.getStats();
      setStats(memoryStats);
    } catch (err) {
      Logger.error('Conversation summary update error:', err);
    }
  }, []);

  // Build AI context
  const buildContextCallback = useCallback(async (
    conversationId: string,
    recentMessages?: Array<{role: 'user' | 'assistant'; content: string}>
  ): Promise<{
    context: string;
    systemPrompt: string;
    fullContext: MemoryContext;
  }> => {
    try {
      return await buildAICcontext(conversationId, recentMessages);
    } catch (err) {
      Logger.error('Context building error:', err);
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
  }, []);

  // Get memory context for display
  const getMemoryContext = useCallback(async (conversationId: string) => {
    try {
      return await getMemoryContextForDisplay(conversationId);
    } catch (err) {
      Logger.error('Memory context error:', err);
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
  }, []);

  // Clear conversation memory
  const clearConversationMemoryCallback = useCallback(async (conversationId: string) => {
    try {
      await clearConversationMemory(conversationId);
      // Refresh user profile
      const memoryStore = getMemoryStore();
      const profile = await memoryStore.getUserProfile();
      setUserProfile(profile);
    } catch (err) {
      Logger.error('Clear memory error:', err);
    }
  }, []);

  // Get all memories
  const getAllMemoriesCallback = useCallback(async () => {
    try {
      return await getAllUserMemories();
    } catch (err) {
      Logger.error('Get all memories error:', err);
      return {
        allMemories: [],
        byType: {},
      };
    }
  }, []);

  // Update user profile
  const updateUserProfileCallback = useCallback(async (updates: Partial<UserProfile>) => {
    try {
      const profile = await updateUserProfileFromMemory(updates);
      setUserProfile(profile);
      return profile;
    } catch (err) {
      Logger.error('User profile update error:', err);
      throw err;
    }
  }, []);

  // Delete memory entry
  const deleteEntryCallback = useCallback(async (id: string) => {
    try {
      const memoryStore = getMemoryStore();
      await memoryStore.deleteEntry(id);
      // Refresh stats
      const memoryStats = await memoryStore.getStats();
      setStats(memoryStats);
    } catch (err) {
      Logger.error('Delete entry error:', err);
      throw err;
    }
  }, []);

  // Query by type
  const queryByTypeCallback = useCallback(async (type: MemoryType) => {
    try {
      const memoryStore = getMemoryStore();
      return await memoryStore.queryByType(type);
    } catch (err) {
      Logger.error('Query by type error:', err);
      return [];
    }
  }, []);

  // Search memories
  const searchMemoriesCallback = useCallback(async (query: string) => {
    try {
      const memoryStore = getMemoryStore();
      return await memoryStore.search(query, 50);
    } catch (err) {
      Logger.error('Search memories error:', err);
      return [];
    }
  }, []);

  // Get memory-enhanced system prompt
  const getMemoryEnhancedSystem = useCallback(async (
    conversationId: string,
    customSystem?: string
  ): Promise<string> => {
    try {
      // Build context
      const { systemPrompt } = await buildAICcontext(conversationId);
      
      // Combine with custom system if provided
      if (customSystem) {
        // Remove the base prompt from systemPrompt to avoid duplication
        const contextOnly = systemPrompt.replace(
          'You are a helpful, friendly AI assistant. You provide clear, concise, and accurate responses.',
          ''
        ).trim();
        
        return `${customSystem}${contextOnly ? '\n\n' + contextOnly : ''}`;
      }
      
      return systemPrompt;
    } catch (err) {
      Logger.error('Memory-enhanced system error:', err);
      return customSystem || 'You are a helpful, friendly AI assistant. You provide clear, concise, and accurate responses.';
    }
  }, []);

  return {
    // State
    isLoaded,
    error,
    stats,
    userProfile,
    conversationMemory: null, // Will be populated per conversation
    
    // Actions
    extractAndSaveMemory,
    extractFromMessage: extractFromSingleMessage,
    updateConversationSummary: updateConversationSummaryCallback,
    buildContext: buildContextCallback,
    getMemoryContext,
    clearConversationMemory: clearConversationMemoryCallback,
    getAllMemories: getAllMemoriesCallback,
    updateUserProfile: updateUserProfileCallback,
    deleteEntry: deleteEntryCallback,
    queryByType: queryByTypeCallback,
    searchMemories: searchMemoriesCallback,
    
    // Memory integration for chat
    getMemoryEnhancedSystem,
  };
}

export default useMemory;
