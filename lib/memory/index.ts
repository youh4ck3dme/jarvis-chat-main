/**
 * Memory System Main Export
 * Long-term Memory & Context Management for Jarvis-Chat
 */

export * from './types';
export * from './extractor';
export * from './context-builder';

// Memory store exports (lazy-initialized to avoid SSR issues)
export { default as JarvisMemoryStore, getMemoryStore } from './memory-store';
// Note: Use getMemoryStore() instead of memoryStore directly to avoid SSR issues
