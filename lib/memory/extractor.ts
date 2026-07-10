/**
 * Memory Extractor
 * Extracts important facts, preferences, and user information from conversations
 */

import { Logger } from '@/lib/logger';
import { streamText } from 'ai';
import { createMistral } from '@ai-sdk/mistral';
import { MemoryEntry, MemoryType, MemoryMetadata, ExtractedMemory, MemoryExtractionOptions } from './types';
import { getMemoryStore } from './memory-store';

// System prompt for memory extraction
const EXTRACTION_SYSTEM_PROMPT = `
Ty si expertný extraktor informácií. Tvoja úloha je analyzovať konverzáciu a extrahovať dôležité informácie.

PRAVIDLÁ:
1. ExtrahuJ iba FAKTY a dôležité informácie, nie celú konverzáciu
2. Buď PRECÍZNY - extrahované informácie musia byť presné
3. Kategorizuj informácie podľa typov
4. Používaj slovenský jazyk na extrakciu, ak je konverzácia v slovenčine
5. Nepravidaj žiadne otázky, iba extrahuj

TYPY INFORMÁCIÍ:
- FAKTY: Skutočnosti, dátumy, udalosti, fakty o svete
- PREFERENCIE: Čo používateľ má rád/nerád, jeho nastavenia, preferencie
- USER_INFO: Osobné informácie o používateľovi (meno, vek, povolanie atď.)
- OTÁZKY: Dôležité otázky, ktoré si používateľ kladol
- OSOBY: Informácie o ľuďoch, ktorí boli spomenutí

FORMAT ODPOVEDI (JSON):
{
  "facts": ["fakt 1", "fakt 2", ...],
  "preferences": ["preferencia 1", "preferencia 2", ...],
  "user_info": ["info o používateľovi 1", "info o používateľovi 2", ...],
  "questions": ["otázka 1", "otázka 2", ...],
  "people": ["osoba 1", "osoba 2", ...],
  "places": ["miesto 1", "miesto 2", ...],
  "organizations": ["organizácia 1", "organizácia 2", ...],
  "dates": ["dátum 1", "dátum 2", ...],
  "summary": "Krátky súhrn konverzácie"
}

Dôležité: Vrať iba JSON, nič iné!
`;

// Lightweight extraction for real-time use (no AI call)
const LIGHTWEIGHT_EXTRACTION_PROMPT = `
Analyzuj nasledovnú konverzáciu a extrahuj dôležité informácie.

Pravidlá:
- Ibam extrahuj len dôležité fakty
- Buď stručný a presný
- Nepravidaj otázky

Formát (JSON):
{
  "facts": ["..."],
  "preferences": ["..."],
  "user_info": ["..."],
  "summary": "..."
}

Konverzácia:
`;

// Named entity recognition patterns
const ENTITY_PATTERNS = {
  // Date patterns
  datePatterns: [
    /\b\d{1,2}\.\s*\d{1,2}\.\s*\d{2,4}\b/g, // DD.MM.YYYY
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,       // DD/MM/YYYY
    /\b\d{4}-\d{2}-\d{2}\b/g,               // YYYY-MM-DD
    /\b(?:Január|Február|Marec|Apríl|Máj|Jún|Júl|August|September|Október|November|December)\s+\d{1,2},?\s*\d{4}\b/g,
  ],
  
  // Person patterns (names)
  personPatterns: [
    /\b[A-ZÁČĎÉÍŇÓŠŤÚÝŽ][a-záčďéíňóšťúýž]+\s+[A-ZÁČĎÉÍŇÓŠŤÚÝŽ][a-záčďéíňóšťúýž]+\b/g,
    /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
  ],
  
  // Organization patterns
  organizationPatterns: [
    /\b(?:s\.\s*r\.\s*o\.|a\.\s*s\.|spol\.\s*s\s*r\.\s*o\.)\b/gi,
    /\b(?:Inc|LLC|Ltd|GmbH|Corp|Corporation|Company)\b/gi,
  ],
  
  // Location patterns
  locationPatterns: [
    /\b(?:Bratislava|Košice|Prešov|Žilina|Banská Bystrica|Trnava|Nitra|Trenčín)\b/gi,
    /\b(?:Slovensko|Česko|Európa|USA|Europe|America)\b/gi,
  ],
};

/**
 * Extract entities from text using regex patterns
 */
export function extractEntitiesFromText(text: string) {
  const entities: {
    people: string[];
    places: string[];
    organizations: string[];
    dates: string[];
  } = {
    people: [],
    places: [],
    organizations: [],
    dates: [],
  };

  // Extract dates
  ENTITY_PATTERNS.datePatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    entities.dates.push(...matches);
  });

  // Extract people (capitalized names)
  const personMatches = text.match(/\b[A-ZÁČĎÉÍŇÓŠŤÚÝŽ][a-záčďéíňóšťúýž]+(?:\s+[A-ZÁČĎÉÍŇÓŠŤÚÝŽ][a-záčďéíňóšťúýž]+)+\b/g) || [];
  entities.people.push(...personMatches);

  // Extract organizations
  ENTITY_PATTERNS.organizationPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    entities.organizations.push(...matches);
  });

  // Extract locations
  ENTITY_PATTERNS.locationPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    entities.places.push(...matches);
  });

  // Clean and deduplicate
  Object.keys(entities).forEach(key => {
    const keyTyped = key as keyof typeof entities;
    entities[keyTyped] = entities[keyTyped].filter(
      (item, index, self) => index === self.findIndex(i => i === item) && item.length > 2
    );
  });

  return entities;
}

/**
 * Lightweight memory extraction without AI (for real-time)
 */
export function extractMemoryLightweight(
  conversationId: string,
  messages: Array<{role: 'user' | 'assistant'; content: string}>
): ExtractedMemory {
  const facts: string[] = [];
  const preferences: string[] = [];
  const userInfo: string[] = [];
  const questions: string[] = [];
  const entities = extractEntitiesFromText(
    messages.map(m => m.content).join(' ')
  );

  // Extract user messages
  const userMessages = messages.filter(m => m.role === 'user');
  
  userMessages.forEach(msg => {
    const content = msg.content;
    
    // Extract questions
    const questionMatches = content.match(/\?[^\n\.\!\?]*[\.\!\?]/g) || [];
    questionMatches.forEach(q => {
      const cleanQ = q.trim().replace(/^[\?\s]+/, '');
      if (cleanQ.length > 5) {
        questions.push(cleanQ);
      }
    });

    // Simple preference detection
    const preferenceKeywords = [
      'mám rád', 'mám rada', 'nemám rád', 'preferujem', 'uprednostňujem',
      'mám radš', 'chcem', 'potrebujem', 'nechcem', 'like', 'dislike'
    ];
    
    preferenceKeywords.forEach(keyword => {
      const index = content.toLowerCase().indexOf(keyword);
      if (index !== -1) {
        const sentence = content.substring(
          Math.max(0, index - 20),
          Math.min(content.length, index + 80)
        );
        preferences.push(sentence.trim());
      }
    });

    // Simple user info detection
    const userInfoKeywords = [
      'volám sa', 'je som', 'mám', 'rokov', 'povolaním', 'bydlím',
      'my name is', 'I am', 'I have', 'I live'
    ];
    
    userInfoKeywords.forEach(keyword => {
      const index = content.toLowerCase().indexOf(keyword);
      if (index !== -1) {
        const sentence = content.substring(
          Math.max(0, index - 10),
          Math.min(content.length, index + 60)
        );
        userInfo.push(sentence.trim());
      }
    });
  });

  // Extract facts from assistant messages
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  assistantMessages.forEach(msg => {
    // Simple fact extraction - sentences that are statements
    const sentences = msg.content.split(/[\.\!\?]/);
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length > 20 && trimmed.length < 200) {
        // Skip questions and very short sentences
        if (!trimmed.endsWith('?') && !trimmed.startsWith('http')) {
          facts.push(trimmed);
        }
      }
    });
  });

  // Generate simple summary
  const allContent = messages.map(m => m.content).join(' ');
  const summary = allContent.length > 200 
    ? allContent.substring(0, 200) + '...' 
    : allContent;

  return {
    facts,
    preferences,
    userInfo,
    questions,
    entities,
    summary,
  };
}

/**
 * Extract memory using AI (more accurate but slower)
 */
export async function extractMemoryWithAI(
  conversationId: string,
  messages: Array<{role: 'user' | 'assistant'; content: string}>
): Promise<ExtractedMemory> {
  try {
    // Check if we have API key
    const apiKey = typeof window !== 'undefined' 
      ? localStorage.getItem('settings-mistral-key')
      : null;
    
    if (!apiKey) {
      // Fallback to lightweight extraction
      return extractMemoryLightweight(conversationId, messages);
    }

    // Build conversation string
    const conversationString = messages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    // Create Mistral client
    const mistral = createMistral({ apiKey });
    const model = mistral('mistral-tiny-latest');

    // Stream the extraction
    const result = await streamText({
      model,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Konverzácia:\n${conversationString}\n\nExtrahuj dôležité informácie:`,
        },
      ],
      temperature: 0.1, // Low temperature for more deterministic results
      maxOutputTokens: 4000,
    });

    // Get full response
    const fullResponse = await result.text;

    // Parse JSON response
    try {
      // Clean up the response to extract JSON
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extracted = JSON.parse(jsonMatch[0]);
        
        // Validate and normalize
        const normalized: ExtractedMemory = {
          facts: Array.isArray(extracted.facts) ? extracted.facts : [],
          preferences: Array.isArray(extracted.preferences) ? extracted.preferences : [],
          userInfo: Array.isArray(extracted.user_info) ? extracted.user_info : [],
          questions: Array.isArray(extracted.questions) ? extracted.questions : [],
          entities: {
            people: Array.isArray(extracted.people) ? extracted.people : [],
            places: Array.isArray(extracted.places) ? extracted.places : [],
            organizations: Array.isArray(extracted.organizations) ? extracted.organizations : [],
            dates: Array.isArray(extracted.dates) ? extracted.dates : [],
          },
          summary: typeof extracted.summary === 'string' ? extracted.summary : '',
        };

        return normalized;
      }
    } catch (e) {
      Logger.warn('Failed to parse AI extraction response, falling back to lightweight', e);
    }

    // Fallback
    return extractMemoryLightweight(conversationId, messages);
    
  } catch (error) {
    Logger.error('AI extraction failed, falling back to lightweight:', error);
    return extractMemoryLightweight(conversationId, messages);
  }
}

/**
 * Save extracted memory to the store
 */
export async function saveExtractedMemory(
  conversationId: string,
  extracted: ExtractedMemory,
  options: MemoryExtractionOptions = {}
): Promise<string[]> {
  const {
    extractFacts = true,
    extractPreferences = true,
    extractUserInfo = true,
    extractQuestions = true,
    minConfidence = 0.7,
    maxEntries = 50,
  } = options;

  const entries: Array<Omit<MemoryEntry, 'id' | 'createdAt' | 'lastAccessed'>> = [];
  const addedIds: string[] = [];

  // Add facts
  if (extractFacts && extracted.facts.length > 0) {
    const factsToAdd = extracted.facts.slice(0, maxEntries);
    factsToAdd.forEach((fact, index) => {
      entries.push({
        type: 'fact',
        content: fact,
        metadata: {
          sourceConversationId: conversationId,
          tags: ['auto-extracted', 'conversation-' + conversationId],
          relatedIds: [],
          confidence: Math.min(1, 0.8 + (index * 0.01)), // Higher confidence for earlier facts
        },
        importance: Math.max(10, 100 - (index * 2)), // Higher importance for earlier facts
      });
    });
  }

  // Add preferences
  if (extractPreferences && extracted.preferences.length > 0) {
    extracted.preferences.slice(0, maxEntries).forEach((pref, index) => {
      entries.push({
        type: 'preference',
        content: pref,
        metadata: {
          sourceConversationId: conversationId,
          tags: ['preference', 'user-preference', 'conversation-' + conversationId],
          relatedIds: [],
          confidence: Math.min(1, 0.85 + (index * 0.01)),
        },
        importance: Math.max(20, 90 - (index * 2)),
      });
    });
  }

  // Add user info
  if (extractUserInfo && extracted.userInfo.length > 0) {
    extracted.userInfo.slice(0, maxEntries).forEach((info, index) => {
      entries.push({
        type: 'user_info',
        content: info,
        metadata: {
          sourceConversationId: conversationId,
          tags: ['user-info', 'personal', 'conversation-' + conversationId],
          relatedIds: [],
          confidence: Math.min(1, 0.9 + (index * 0.01)),
        },
        importance: Math.max(30, 95 - (index * 2)),
      });
    });
  }

  // Add questions
  if (extractQuestions && extracted.questions.length > 0) {
    extracted.questions.slice(0, maxEntries).forEach((question, index) => {
      entries.push({
        type: 'question',
        content: question,
        metadata: {
          sourceConversationId: conversationId,
          tags: ['question', 'user-question', 'conversation-' + conversationId],
          relatedIds: [],
          confidence: 0.7,
        },
        importance: Math.max(5, 50 - (index * 3)),
      });
    });
  }

  // Add entities as facts
  Object.entries(extracted.entities).forEach(([entityType, items]) => {
    if (items.length > 0) {
      items.slice(0, maxEntries).forEach((item, index) => {
        entries.push({
          type: entityType === 'dates' ? 'fact' : ('persona' as MemoryType),
          content: item,
          metadata: {
            sourceConversationId: conversationId,
            tags: [entityType, 'entity', 'conversation-' + conversationId],
            relatedIds: [],
            confidence: 0.8,
          },
          importance: 20,
        });
      });
    }
  });

  // Filter by confidence
  const filteredEntries = entries.filter(entry => entry.metadata.confidence >= minConfidence);

  // Save to store
  if (filteredEntries.length > 0) {
    const memoryStore = getMemoryStore();
    const ids = await memoryStore.addMultiple(filteredEntries);
    addedIds.push(...ids);
  }

  return addedIds;
}

/**
 * Update conversation memory with summary
 */
export async function updateConversationSummary(
  conversationId: string,
  messages: Array<{role: 'user' | 'assistant'; content: string}>
): Promise<void> {
  try {
    // Use lightweight extraction for summary
    const extracted = extractMemoryLightweight(conversationId, messages);
    
    // Build conversation memory
    const conversationMemory = {
      id: `conv-mem-${conversationId}`,
      conversationId,
      summary: extracted.summary,
      keyPoints: extracted.facts.slice(0, 10),
      actionItems: [], // Will be populated later
      unresolvedQuestions: extracted.questions.slice(0, 5),
      entities: extracted.entities,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const memoryStore = getMemoryStore();
    await memoryStore.updateConversationMemory(conversationMemory);
    
    // Save extracted memory
    await saveExtractedMemory(conversationId, extracted);
    
  } catch (error) {
    Logger.error('Failed to update conversation summary:', error);
  }
}

/**
 * Extract and save memory from a single message
 */
export async function extractFromMessage(
  conversationId: string,
  message: {role: 'user' | 'assistant'; content: string},
  messageId: string
): Promise<string[]> {
  // For single message, use lightweight extraction
  const extracted = extractMemoryLightweight(conversationId, [{...message}]);
  
  // Create metadata with message ID
  const entries = extracted.facts.map((fact, index) => ({
    type: 'fact' as MemoryType,
    content: fact,
    metadata: {
      sourceConversationId: conversationId,
      sourceMessageId: messageId,
      tags: ['message-' + messageId, 'conversation-' + conversationId],
      relatedIds: [],
      confidence: 0.75,
    },
    importance: Math.max(10, 80 - (index * 5)),
  }));

  // Add user info if this is a user message
  if (message.role === 'user') {
    extracted.userInfo.forEach((info, index) => {
      entries.push({
        type: 'user_info',
        content: info,
        metadata: {
          sourceConversationId: conversationId,
          sourceMessageId: messageId,
          tags: ['user-info', 'message-' + messageId],
          relatedIds: [],
          confidence: 0.85,
        },
        importance: Math.max(20, 90 - (index * 5)),
      });
    });

    extracted.preferences.forEach((pref, index) => {
      entries.push({
        type: 'preference',
        content: pref,
        metadata: {
          sourceConversationId: conversationId,
          sourceMessageId: messageId,
          tags: ['preference', 'message-' + messageId],
          relatedIds: [],
          confidence: 0.8,
        },
        importance: Math.max(15, 75 - (index * 5)),
      });
    });
  }

  // Save entries
  if (entries.length > 0) {
    const memoryStore = getMemoryStore();
    return memoryStore.addMultiple(entries);
  }
  
  return [];
}

export {
  ENTITY_PATTERNS,
  EXTRACTION_SYSTEM_PROMPT,
};
