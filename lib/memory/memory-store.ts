/**
 * Memory Store Implementation
 * IndexedDB-based long-term memory storage for Jarvis-Chat
 */

import { 
  MemoryEntry, 
  MemoryType, 
  MemoryMetadata, 
  MemoryContext,
  MemoryStats,
  UserProfile,
  ConversationMemory,
  MemoryStore 
} from './types';

// Database configuration
const DB_NAME = 'JarvisChatMemory';
const DB_VERSION = 1;

// Store names
const STORES = {
  MEMORIES: 'memories',
  USER_PROFILE: 'userProfile',
  CONVERSATION_MEMORY: 'conversationMemory',
  INDEXES: 'indexes',
};

// Indexes for efficient querying
const INDEXES = {
  TYPE: 'type',
  CONVERSATION_ID: 'metadata.sourceConversationId',
  TAGS: 'metadata.tags',
  CREATED_AT: 'createdAt',
  LAST_ACCESSED: 'lastAccessed',
  IMPORTANCE: 'importance',
};

class JarvisMemoryStore implements MemoryStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    // Only initialize on client side
    if (typeof window !== 'undefined' && window.indexedDB) {
      this.dbPromise = this.openDatabase();
    }
  }

  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Memory store: Failed to open database');
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.MEMORIES)) {
          const store = db.createObjectStore(STORES.MEMORIES, { keyPath: 'id' });
          Object.values(INDEXES).forEach(index => {
            if (index === INDEXES.TAGS) {
              store.createIndex(index, INDEXES.TAGS, { multiEntry: true });
            } else {
              store.createIndex(index, index, { unique: false });
            }
          });
        }

        if (!db.objectStoreNames.contains(STORES.USER_PROFILE)) {
          db.createObjectStore(STORES.USER_PROFILE, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.CONVERSATION_MEMORY)) {
          const convStore = db.createObjectStore(STORES.CONVERSATION_MEMORY, { keyPath: 'id' });
          convStore.createIndex('conversationId', 'conversationId', { unique: true });
        }
      };
    });
  }

  // ==================== CORE OPERATIONS ====================

  private async getDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      throw new Error('IndexedDB is not available. Memory operations are only supported in the browser.');
    }
    return this.dbPromise;
  }

  // Check if memory store is available
  private isAvailable(): boolean {
    return this.dbPromise !== null;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private createEntryData(data: Omit<MemoryEntry, 'id' | 'createdAt' | 'lastAccessed'>): MemoryEntry {
    return {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
      lastAccessed: new Date(),
    };
  }

  async getEntry(id: string): Promise<MemoryEntry | null> {
    try {
      if (!this.isAvailable()) return null;
      
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.MEMORIES, 'readonly');
        const store = transaction.objectStore(STORES.MEMORIES);
        const request = store.get(id);

        request.onsuccess = () => {
          const entry = request.result;
          if (entry) {
            // Update last accessed time
            this.updateEntry(id, { lastAccessed: new Date() }).catch(() => {});
          }
          resolve(entry || null);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Memory store: Failed to get entry', error);
      return null;
    }
  }

  async putEntry(entry: MemoryEntry): Promise<void> {
    try {
      if (!this.isAvailable()) {
        console.warn('Memory store: IndexedDB not available, skipping putEntry');
        return;
      }

      const db = await this.getDb();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.MEMORIES, 'readwrite');
        const store = transaction.objectStore(STORES.MEMORIES);
        const request = store.put(entry);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Memory store: Failed to put entry', error);
      throw error;
    }
  }

  async addEntry(data: Omit<MemoryEntry, 'id' | 'createdAt' | 'lastAccessed'>): Promise<string> {
    try {
      if (!this.isAvailable()) {
        console.warn('Memory store: IndexedDB not available, skipping addEntry');
        return '';
      }
      
      const db = await this.getDb();
      const entry = this.createEntryData(data);

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.MEMORIES, 'readwrite');
        const store = transaction.objectStore(STORES.MEMORIES);
        const request = store.add(entry);

        request.onsuccess = () => resolve(entry.id);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Memory store: Failed to add entry', error);
      throw error;
    }
  }

  async addMultiple(entries: Omit<MemoryEntry, 'id' | 'createdAt' | 'lastAccessed'>[]): Promise<string[]> {
    try {
      const db = await this.getDb();
      const ids: string[] = [];

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.MEMORIES, 'readwrite');
        const store = transaction.objectStore(STORES.MEMORIES);

        entries.forEach(entry => {
          const fullEntry = this.createEntryData(entry);
          const request = store.add(fullEntry);
          
          request.onsuccess = () => {
            ids.push(fullEntry.id);
          };
        });

        transaction.oncomplete = () => resolve(ids);
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Memory store: Failed to add multiple entries', error);
      throw error;
    }
  }

  async updateEntry(id: string, updates: Partial<MemoryEntry>): Promise<void> {
    try {
      const db = await this.getDb();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.MEMORIES, 'readwrite');
        const store = transaction.objectStore(STORES.MEMORIES);
        const request = store.get(id);

        request.onsuccess = () => {
          const entry = request.result;
          if (!entry) {
            reject(new Error(`Entry with id ${id} not found`));
            return;
          }

          const updatedEntry = { ...entry, ...updates, lastAccessed: new Date() };
          const updateRequest = store.put(updatedEntry);

          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Memory store: Failed to update entry', error);
      throw error;
    }
  }

  async deleteEntry(id: string): Promise<void> {
    try {
      const db = await this.getDb();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.MEMORIES, 'readwrite');
        const store = transaction.objectStore(STORES.MEMORIES);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Memory store: Failed to delete entry', error);
      throw error;
    }
  }

  // ==================== QUERY OPERATIONS ====================

  async queryByType(type: MemoryType): Promise<MemoryEntry[]> {
    try {
      if (!this.isAvailable()) return [];
      
      const db = await this.getDb();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.MEMORIES, 'readonly');
        const store = transaction.objectStore(STORES.MEMORIES);
        const index = store.index(INDEXES.TYPE);
        const request = index.getAll(type);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Memory store: Failed to query by type', error);
      return [];
    }
  }

  async queryByConversation(conversationId: string): Promise<MemoryEntry[]> {
    try {
      const db = await this.getDb();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.MEMORIES, 'readonly');
        const store = transaction.objectStore(STORES.MEMORIES);
        const index = store.index(INDEXES.CONVERSATION_ID);
        const request = index.getAll(conversationId);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Memory store: Failed to query by conversation', error);
      return [];
    }
  }

  async queryByTags(tags: string[]): Promise<MemoryEntry[]> {
    try {
      const db = await this.getDb();
      const allEntries: MemoryEntry[] = [];

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.MEMORIES, 'readonly');
        const store = transaction.objectStore(STORES.MEMORIES);
        
        tags.forEach(tag => {
          const index = store.index(INDEXES.TAGS);
          const request = index.getAll(tag);
          
          request.onsuccess = () => {
            allEntries.push(...request.result);
          };
        });

        transaction.oncomplete = () => {
          // Deduplicate entries
          const uniqueEntries = allEntries.filter(
            (entry, index, self) => index === self.findIndex(e => e.id === entry.id)
          );
          resolve(uniqueEntries);
        };

        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Memory store: Failed to query by tags', error);
      return [];
    }
  }

  async search(query: string, limit: number = 50): Promise<MemoryEntry[]> {
    try {
      const db = await this.getDb();
      const results: MemoryEntry[] = [];

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.MEMORIES, 'readonly');
        const store = transaction.objectStore(STORES.MEMORIES);
        const request = store.openCursor();

        const queryLower = query.toLowerCase();

        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            const entry = cursor.value as MemoryEntry;
            // Simple text search in content
            if (entry.content.toLowerCase().includes(queryLower)) {
              results.push(entry);
            }
            
            if (results.length >= limit) {
              resolve(results.slice(0, limit));
              return;
            }
            cursor.continue();
          } else {
            resolve(results);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Memory store: Failed to search', error);
      return [];
    }
  }

  // ==================== CONTEXT BUILDING ====================

  async buildContext(conversationId: string, limit: number = 10): Promise<MemoryContext> {
    try {
      if (!this.isAvailable()) {
        return {
          conversationId,
          summary: '',
          keyFacts: [],
          userPreferences: [],
          recentMessages: [],
        };
      }
      
      // Get conversation-specific memories
      const conversationMemories = await this.queryByConversation(conversationId);
      
      // Get user preferences
      const preferences = await this.queryByType('preference');
      
      // Get recent facts
      const allFacts = await this.queryByType('fact');
      const recentFacts = allFacts
        .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
        .slice(0, limit);

      // Get conversation summary
      const conversationMemory = await this.getConversationMemory(conversationId);

      // Get user profile
      const userProfile = await this.getUserProfile();

      // Build context
      const context: MemoryContext = {
        conversationId,
        summary: conversationMemory?.summary || '',
        keyFacts: [...conversationMemories.filter(m => m.type === 'fact'), ...recentFacts],
        userPreferences: preferences,
        recentMessages: [], // Will be populated by the chat component
      };

      return context;
    } catch (error) {
      console.error('Memory store: Failed to build context', error);
      return {
        conversationId,
        summary: '',
        keyFacts: [],
        userPreferences: [],
        recentMessages: [],
      };
    }
  }

  // ==================== USER PROFILE ====================

  async getUserProfile(): Promise<UserProfile | null> {
    try {
      if (!this.isAvailable()) return null;
      
      const db = await this.getDb();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.USER_PROFILE, 'readonly');
        const store = transaction.objectStore(STORES.USER_PROFILE);
        const request = store.get('userProfile');

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Memory store: Failed to get user profile', error);
      return null;
    }
  }

  async updateUserProfile(updates: Partial<UserProfile>): Promise<void> {
    try {
      const db = await this.getDb();
      
      let profile = await this.getUserProfile();
      if (!profile) {
        profile = {
          id: 'userProfile',
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      const updatedProfile = {
        ...profile,
        ...updates,
        id: 'userProfile', // Ensure ID is always set
        updatedAt: new Date(),
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.USER_PROFILE, 'readwrite');
        const store = transaction.objectStore(STORES.USER_PROFILE);
        const request = store.put(updatedProfile);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Memory store: Failed to update user profile', error);
      throw error;
    }
  }

  // ==================== CONVERSATION MEMORY ====================

  async getConversationMemory(conversationId: string): Promise<ConversationMemory | null> {
    try {
      if (!this.isAvailable()) return null;
      
      const db = await this.getDb();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.CONVERSATION_MEMORY, 'readonly');
        const store = transaction.objectStore(STORES.CONVERSATION_MEMORY);
        const index = store.index('conversationId');
        const request = index.get(conversationId);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Memory store: Failed to get conversation memory', error);
      return null;
    }
  }

  async updateConversationMemory(memory: ConversationMemory): Promise<void> {
    try {
      const db = await this.getDb();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.CONVERSATION_MEMORY, 'readwrite');
        const store = transaction.objectStore(STORES.CONVERSATION_MEMORY);
        const request = store.put(memory);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Memory store: Failed to update conversation memory', error);
      throw error;
    }
  }

  // ==================== CONVERSATION MANAGEMENT ====================

  async deleteByConversation(conversationId: string): Promise<void> {
    try {
      const entries = await this.queryByConversation(conversationId);
      
      await Promise.all(
        entries.map(entry => this.deleteEntry(entry.id))
      );

      // Also delete conversation memory
      const conversationMemory = await this.getConversationMemory(conversationId);
      if (conversationMemory) {
        const db = await this.getDb();
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(STORES.CONVERSATION_MEMORY, 'readwrite');
          const store = transaction.objectStore(STORES.CONVERSATION_MEMORY);
          const request = store.delete(conversationMemory.id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    } catch (error) {
      console.error('Memory store: Failed to delete by conversation', error);
      throw error;
    }
  }

  // ==================== STATS & MAINTENANCE ====================

  async getStats(): Promise<MemoryStats> {
    try {
      const db = await this.getDb();
      const stats: MemoryStats = {
        totalEntries: 0,
        byType: {
          fact: 0,
          preference: 0,
          context: 0,
          user_info: 0,
          question: 0,
          persona: 0,
          summarization: 0,
        },
        lastUpdated: new Date(0),
        storageSize: 0,
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.MEMORIES, 'readonly');
        const store = transaction.objectStore(STORES.MEMORIES);
        const request = store.openCursor();

        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            const entry = cursor.value as MemoryEntry;
            stats.totalEntries++;
            stats.byType[entry.type]++;
            
            if (entry.lastAccessed > stats.lastUpdated) {
              stats.lastUpdated = entry.lastAccessed;
            }

            // Estimate size
            const entrySize = JSON.stringify(entry).length;
            stats.storageSize += entrySize;

            cursor.continue();
          } else {
            resolve(stats);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Memory store: Failed to get stats', error);
      return {
        totalEntries: 0,
        byType: {
          fact: 0,
          preference: 0,
          context: 0,
          user_info: 0,
          question: 0,
          persona: 0,
          summarization: 0,
        },
        lastUpdated: new Date(0),
        storageSize: 0,
      };
    }
  }

  async cleanupOldEntries(maxAgeDays: number): Promise<number> {
    try {
      const db = await this.getDb();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
      
      const entriesToDelete: string[] = [];
      
      // First, find all old entries
      const allEntries = await new Promise<MemoryEntry[]>((resolve, reject) => {
        const transaction = db.transaction(STORES.MEMORIES, 'readonly');
        const store = transaction.objectStore(STORES.MEMORIES);
        const request = store.openCursor();
        const entries: MemoryEntry[] = [];

        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            entries.push(cursor.value);
            cursor.continue();
          } else {
            resolve(entries);
          }
        };

        request.onerror = () => reject(request.error);
      });

      // Filter entries older than maxAgeDays
      const oldEntries = allEntries.filter(
        entry => entry.lastAccessed < cutoffDate
      );

      // Delete them
      await Promise.all(
        oldEntries.map(entry => this.deleteEntry(entry.id))
      );

      return oldEntries.length;
    } catch (error) {
      console.error('Memory store: Failed to cleanup old entries', error);
      return 0;
    }
  }

  async clearAll(): Promise<void> {
    try {
      const db = await this.getDb();

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(
          [STORES.MEMORIES, STORES.USER_PROFILE, STORES.CONVERSATION_MEMORY],
          'readwrite'
        );

        transaction.objectStore(STORES.MEMORIES).clear();
        transaction.objectStore(STORES.USER_PROFILE).clear();
        transaction.objectStore(STORES.CONVERSATION_MEMORY).clear();

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Memory store: Failed to clear all', error);
      throw error;
    }
  }

  async clearByType(type: MemoryType): Promise<void> {
    try {
      const entries = await this.queryByType(type);
      await Promise.all(
        entries.map(entry => this.deleteEntry(entry.id))
      );
    } catch (error) {
      console.error('Memory store: Failed to clear by type', error);
      throw error;
    }
  }

  // ==================== IMPORT/EXPORT ====================

  async exportAll(): Promise<string> {
    try {
      const allEntries = await this.queryByType('fact');
      const preferences = await this.queryByType('preference');
      const userInfo = await this.queryByType('user_info');
      const questions = await this.queryByType('question');
      const persona = await this.queryByType('persona');
      const context = await this.queryByType('context');
      const summarization = await this.queryByType('summarization');
      
      const userProfile = await this.getUserProfile();
      
      const allConversationMemories: ConversationMemory[] = [];
      const db = await this.getDb();
      
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORES.CONVERSATION_MEMORY, 'readonly');
        const store = transaction.objectStore(STORES.CONVERSATION_MEMORY);
        const request = store.openCursor();

        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            allConversationMemories.push(cursor.value);
            cursor.continue();
          } else {
            resolve();
          }
        };

        request.onerror = () => reject(request.error);
      });

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        memories: [
          ...allEntries,
          ...preferences,
          ...userInfo,
          ...questions,
          ...persona,
          ...context,
          ...summarization,
        ],
        userProfile,
        conversationMemories: allConversationMemories,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Memory store: Failed to export all', error);
      return '{}';
    }
  }

  async importAll(data: string): Promise<number> {
    try {
      const importData = JSON.parse(data);
      const importedCount = await this.importEntries(importData.memories || []);
      
      if (importData.userProfile) {
        await this.updateUserProfile(importData.userProfile);
      }

      if (importData.conversationMemories) {
        const db = await this.getDb();
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(STORES.CONVERSATION_MEMORY, 'readwrite');
          const store = transaction.objectStore(STORES.CONVERSATION_MEMORY);

          importData.conversationMemories.forEach((memory: ConversationMemory) => {
            store.put(memory);
          });

          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
      }

      return importedCount + (importData.conversationMemories?.length || 0);
    } catch (error) {
      console.error('Memory store: Failed to import all', error);
      return 0;
    }
  }

  private async importEntries(entries: Partial<MemoryEntry>[]): Promise<number> {
    const validEntries = entries.filter(entry => 
      entry.content && entry.type && entry.metadata
    );

    await this.addMultiple(
      validEntries.map(entry => ({
        type: entry.type as MemoryType,
        content: entry.content!,
        metadata: entry.metadata as MemoryMetadata,
        importance: entry.importance || 50,
      }))
    );

    return validEntries.length;
  }

  async optimizeStorage(): Promise<void> {
    // For now, just cleanup old entries
    await this.cleanupOldEntries(365); // Clean entries older than 1 year
  }
}

// Singleton instance - lazy initialized to avoid SSR issues
let memoryStoreInstance: JarvisMemoryStore | null = null;

export function getMemoryStore(): JarvisMemoryStore {
  if (!memoryStoreInstance) {
    memoryStoreInstance = new JarvisMemoryStore();
  }
  return memoryStoreInstance;
}

// Don't export memoryStore at module level to avoid SSR issues
// export const memoryStore = getMemoryStore();

export default JarvisMemoryStore;
