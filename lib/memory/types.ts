/**
 * Memory System Types for Jarvis-Chat
 * Long-term Memory & Context Management
 */

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  metadata: MemoryMetadata;
  importance: number; // 0-100
  lastAccessed: Date;
  createdAt: Date;
}

export type MemoryType = 
  | 'fact'           // Facts and information
  | 'preference'     // User preferences
  | 'context'        // Conversation context
  | 'user_info'      // User personal info (name, etc.)
  | 'question'       // Historical questions
  | 'persona'        // Information about people mentioned
  | 'summarization'; // Auto-generated conversation summaries

export interface MemoryMetadata {
  sourceConversationId?: string;
  sourceMessageId?: string;
  relatedIds: string[]; // IDs of related memory entries
  tags: string[];
  confidence: number; // 0-1, how confident we are in this memory
}

export interface MemoryContext {
  conversationId: string;
  summary: string;
  keyFacts: MemoryEntry[];
  userPreferences: MemoryEntry[];
  recentMessages: Array<{role: 'user' | 'assistant'; content: string}>;
}

export interface MemoryStats {
  totalEntries: number;
  byType: Record<MemoryType, number>;
  lastUpdated: Date;
  storageSize: number; // in bytes
}

export interface UserProfile {
  id: string;
  name?: string;
  preferences: {
    language?: string;
    modelPreferences?: Record<string, number>;
    personaPreferences?: string[];
    notificationPreferences?: {
      sound?: boolean;
      desktopNotifications?: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMemory {
  id: string;
  conversationId: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  unresolvedQuestions: string[];
  entities: {
    people: string[];
    places: string[];
    organizations: string[];
    dates: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryStore {
  // Core operations
  getEntry(id: string): Promise<MemoryEntry | null>;
  addEntry(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'lastAccessed'>): Promise<string>;
  updateEntry(id: string, updates: Partial<MemoryEntry>): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  
  // Query operations
  queryByType(type: MemoryType): Promise<MemoryEntry[]>;
  queryByTags(tags: string[]): Promise<MemoryEntry[]>;
  queryByConversation(conversationId: string): Promise<MemoryEntry[]>;
  search(query: string, limit?: number): Promise<MemoryEntry[]>;
  
  // Bulk operations
  addMultiple(entries: Omit<MemoryEntry, 'id' | 'createdAt' | 'lastAccessed'>[]): Promise<string[]>;
  deleteByConversation(conversationId: string): Promise<void>;
  
  // Context building
  buildContext(conversationId: string, limit?: number): Promise<MemoryContext>;
  getUserProfile(): Promise<UserProfile | null>;
  updateUserProfile(updates: Partial<UserProfile>): Promise<void>;
  
  // Conversation summaries
  getConversationMemory(conversationId: string): Promise<ConversationMemory | null>;
  updateConversationMemory(memory: ConversationMemory): Promise<void>;
  
  // Stats and maintenance
  getStats(): Promise<MemoryStats>;
  cleanupOldEntries(maxAgeDays: number): Promise<number>; // Returns count of deleted entries
  optimizeStorage(): Promise<void>;
  
  // Import/Export
  exportAll(): Promise<string>; // JSON string
  importAll(data: string): Promise<number>; // Returns count of imported entries
  
  // Clear
  clearAll(): Promise<void>;
  clearByType(type: MemoryType): Promise<void>;
}

export interface MemoryExtractionOptions {
  extractFacts?: boolean;
  extractPreferences?: boolean;
  extractUserInfo?: boolean;
  extractQuestions?: boolean;
  extractEntities?: boolean;
  minConfidence?: number;
  maxEntries?: number;
}

export interface ExtractedMemory {
  facts: string[];
  preferences: string[];
  userInfo: string[];
  questions: string[];
  entities: {
    people: string[];
    places: string[];
    organizations: string[];
    dates: string[];
  };
  summary: string;
}
