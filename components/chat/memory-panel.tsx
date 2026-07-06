/**
 * Memory Panel Component
 * Displays and manages conversation memory for Jarvis-Chat
 */

import { useState, useEffect, useCallback } from 'react';
import { Brain, X, Trash2, Search, Filter, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MemoryEntry, MemoryType } from '@/lib/memory/types';
import { useMemory } from '@/hooks/use-memory';
import { cn } from '@/lib/utils';

interface MemoryPanelProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
}

const MEMORY_TYPES: { id: MemoryType; label: string; color: string }[] = [
  { id: 'user_info', label: 'User Info', color: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'preference', label: 'Preferences', color: 'text-purple-600 dark:text-purple-400' },
  { id: 'fact', label: 'Facts', color: 'text-blue-600 dark:text-blue-400' },
  { id: 'question', label: 'Questions', color: 'text-orange-600 dark:text-orange-400' },
  { id: 'persona', label: 'People', color: 'text-pink-600 dark:text-pink-400' },
  { id: 'context', label: 'Context', color: 'text-gray-600 dark:text-gray-400' },
];

const MEMORY_TYPE_COLORS: Record<MemoryType, string> = {
  fact: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  preference: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
  user_info: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
  question: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300',
  persona: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-300',
  context: 'bg-gray-50 dark:bg-gray-800/20 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300',
  summarization: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300',
};

export function MemoryPanel({ conversationId, isOpen, onClose }: MemoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<MemoryType | 'all'>('all');
  const [showContent, setShowContent] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    getMemoryContext,
    clearConversationMemory,
    deleteEntry: deleteMemoryEntry,
    searchMemories,
    queryByType,
  } = useMemory();

  const [memoryData, setMemoryData] = useState<{
    keyFacts: MemoryEntry[];
    preferences: MemoryEntry[];
    userInfo: MemoryEntry[];
    stats: {
      totalMemories: number;
      lastUpdated: Date | null;
    };
  }>({
    keyFacts: [],
    preferences: [],
    userInfo: [],
    stats: { totalMemories: 0, lastUpdated: null },
  });

  // Load memory data
  const loadMemoryData = useCallback(async () => {
    if (!isOpen || !conversationId) return;

    setIsLoading(true);
    try {
      const context = await getMemoryContext(conversationId);
      setMemoryData(context);
    } catch (error) {
      console.error('Failed to load memory data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, conversationId, getMemoryContext]);

  useEffect(() => {
    if (isOpen) {
      loadMemoryData();
    }
  }, [isOpen, conversationId, loadMemoryData]);

  // Get all memories for display
  const getAllMemories = useCallback((): MemoryEntry[] => {
    if (!memoryData) return [];
    
    const allMemories: MemoryEntry[] = [
      ...memoryData.keyFacts,
      ...memoryData.preferences,
      ...memoryData.userInfo,
    ];

    // Sort by importance and last accessed
    return allMemories.sort((a, b) => 
      b.importance - a.importance || b.lastAccessed.getTime() - a.lastAccessed.getTime()
    );
  }, [memoryData]);

  // Filter memories by type and search query
  const filteredMemories = useCallback((): MemoryEntry[] => {
    const allMemories = getAllMemories();
    
    let filtered = allMemories;
    
    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(m => m.type === selectedType);
    }
    
    // Filter by search query
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.content.toLowerCase().includes(queryLower) ||
        m.metadata.tags.some(tag => tag.toLowerCase().includes(queryLower))
      );
    }
    
    return filtered;
  }, [getAllMemories, selectedType, searchQuery]);

  // Handle delete entry
  const handleDeleteEntry = useCallback(async (id: string) => {
    try {
      await deleteMemoryEntry(id);
      await loadMemoryData(); // Refresh data
    } catch (error) {
      console.error('Failed to delete memory entry:', error);
    }
  }, [deleteMemoryEntry, loadMemoryData]);

  // Handle clear all memory for this conversation
  const handleClearAll = useCallback(async () => {
    try {
      await clearConversationMemory(conversationId);
      await loadMemoryData(); // Refresh data
    } catch (error) {
      console.error('Failed to clear conversation memory:', error);
    }
  }, [clearConversationMemory, conversationId, loadMemoryData]);

  // Toggle content visibility
  const toggleContent = useCallback((id: string) => {
    setShowContent(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  // Format date
  const formatDate = useCallback((date: Date): string => {
    return date.toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // Get memory type label
  const getTypeLabel = useCallback((type: MemoryType): string => {
    const typeInfo = MEMORY_TYPES.find(t => t.id === type);
    return typeInfo ? typeInfo.label : type;
  }, []);

  // Get type color class
  const getTypeColorClass = useCallback((type: MemoryType): string => {
    return MEMORY_TYPE_COLORS[type] || MEMORY_TYPE_COLORS.fact;
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed right-4 top-4 z-50 w-80 h-[calc(100vh-2rem)] bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-stone-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h3 className="font-semibold text-stone-800 dark:text-zinc-50">Memory</h3>
            <p className="text-xs text-stone-500 dark:text-zinc-400">
              Long-term conversation context
            </p>
          </div>
        </div>
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-stone-500 hover:bg-stone-100 dark:hover:bg-zinc-800"
          aria-label="Close memory panel"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-stone-100 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-500 dark:text-zinc-400">Total memories</p>
            <p className="text-2xl font-bold text-stone-800 dark:text-zinc-50">
              {memoryData.stats.totalMemories}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-500 dark:text-zinc-400">Last updated</p>
            <p className="text-sm font-medium text-stone-700 dark:text-zinc-300">
              {memoryData.stats.lastUpdated ? formatDate(memoryData.stats.lastUpdated) : 'Never'}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-3 border-b border-stone-100 dark:border-zinc-800">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-8 text-sm bg-stone-50 dark:bg-zinc-950 border-stone-200 dark:border-zinc-800"
            />
          </div>
          <Button
            onClick={handleClearAll}
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-stone-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            aria-label="Clear all memory"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Type Filters */}
      <div className="px-3 py-2 border-b border-stone-100 dark:border-zinc-800">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid grid-cols-6 h-7 bg-stone-50 dark:bg-zinc-950 rounded-xl p-1">
            <TabsTrigger
              value="all"
              className={cn(
                "text-xs h-6 px-2",
                selectedType === 'all' ? 'bg-white dark:bg-zinc-800 shadow' : ''
              )}
              onClick={() => setSelectedType('all')}
            >
              All
            </TabsTrigger>
            {MEMORY_TYPES.map((type) => (
              <TabsTrigger
                key={type.id}
                value={type.id}
                className={cn(
                  "text-xs h-6 px-2",
                  selectedType === type.id ? 'bg-white dark:bg-zinc-800 shadow' : ''
                )}
                onClick={() => setSelectedType(type.id)}
              >
                {type.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Memory Entries */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-stone-300 dark:border-zinc-700 border-t-emerald-600 rounded-full" />
            </div>
          ) : filteredMemories().length === 0 ? (
            <div className="text-center py-8 text-stone-500 dark:text-zinc-400 text-sm">
              {searchQuery ? 'No memories found matching your search' : 'No memories yet. Start a conversation to build memory.'}
            </div>
          ) : (
            filteredMemories().map((memory) => (
              <div
                key={memory.id}
                className={cn(
                  "p-3 rounded-xl border border-stone-200 dark:border-zinc-800 transition-colors",
                  getTypeColorClass(memory.type)
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        getTypeColorClass(memory.type).replace('border-', 'bg-').replace('text-', '') + '20',
                        getTypeColorClass(memory.type).replace('bg-', 'text-')
                      )}>
                        {getTypeLabel(memory.type)}
                      </span>
                      <span className="text-xs text-stone-500 dark:text-zinc-400">
                        {memory.importance}% importance
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleContent(memory.id)}
                        className="text-left flex-1"
                        aria-label={showContent[memory.id] ? 'Hide content' : 'Show content'}
                      >
                        <p className={cn(
                          "text-sm text-stone-800 dark:text-zinc-50 line-clamp-2",
                          showContent[memory.id] ? '' : 'line-clamp-2'
                        )}>
                          {memory.content}
                        </p>
                      </button>
                      
                      <Button
                        onClick={() => handleDeleteEntry(memory.id)}
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-stone-400 hover:text-red-500"
                        aria-label="Delete memory entry"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    {showContent[memory.id] && (
                      <div className="mt-2 pt-2 border-t border-stone-200/50 dark:border-zinc-800/50">
                        <p className="text-xs text-stone-600 dark:text-zinc-400 mb-1">
                          {formatDate(memory.createdAt)} · Confidence: {Math.round(memory.metadata.confidence * 100)}%
                        </p>
                        {memory.metadata.sourceConversationId && (
                          <p className="text-xs text-stone-500 dark:text-zinc-500">
                            From: {memory.metadata.sourceConversationId}
                          </p>
                        )}
                        {memory.metadata.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {memory.metadata.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="text-xs px-2 py-0.5 bg-stone-100 dark:bg-zinc-800 rounded-full text-stone-600 dark:text-zinc-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t border-stone-100 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 rounded-b-2xl">
        <p className="text-xs text-center text-stone-500 dark:text-zinc-400">
          Memory is stored locally in your browser
        </p>
      </div>
    </div>
  );
}

export default MemoryPanel;
