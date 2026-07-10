/**
 * Memory API Routes
 * Handles memory extraction, storage, and retrieval
 */

import { NextRequest, NextResponse } from 'next/server';

import { Logger } from '@/lib/logger';
import { 
  extractMemoryLightweight, 
  extractMemoryWithAI,
  saveExtractedMemory,
  updateConversationSummary,
  extractFromMessage,
  extractEntitiesFromText,
  getMemoryContextForDisplay,
  clearConversationMemory,
  getAllUserMemories,
  buildAICcontext
} from '@/lib/memory';

/**
 * POST /api/memory/extract
 * Extract memory from conversation messages
 */
export async function POST(req: NextRequest) {
  try {
    const { conversationId, messages, useAI } = await req.json();

    if (!conversationId || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'conversationId and messages array are required' },
        { status: 400 }
      );
    }

    // Extract memory
    const extracted = useAI 
      ? await extractMemoryWithAI(conversationId, messages)
      : extractMemoryLightweight(conversationId, messages);

    // Save extracted memory
    const savedIds = await saveExtractedMemory(conversationId, extracted);

    return NextResponse.json({
      success: true,
      extracted,
      savedIds,
      count: savedIds.length,
    });

  } catch (error) {
    Logger.error('Memory extraction error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract memory' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/memory/conversation/:id
 * Get memory context for a conversation
 */
export async function GET(req: NextRequest) {
  try {
    const conversationId = req.nextUrl.searchParams.get('conversationId');
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    const context = await getMemoryContextForDisplay(conversationId);

    return NextResponse.json({
      success: true,
      ...context,
    });

  } catch (error) {
    Logger.error('Memory context error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get memory context' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/memory/conversation/:id
 * Clear memory for a conversation
 */
export async function DELETE(req: NextRequest) {
  try {
    const conversationId = req.nextUrl.searchParams.get('conversationId');
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    await clearConversationMemory(conversationId);

    return NextResponse.json({
      success: true,
      message: `Memory cleared for conversation ${conversationId}`,
    });

  } catch (error) {
    Logger.error('Memory clear error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear memory' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/memory/all
 * Get all user memories
 */
export async function GET_ALL() {
  try {
    const memories = await getAllUserMemories();
    
    return NextResponse.json({
      success: true,
      ...memories,
    });

  } catch (error) {
    Logger.error('Get all memories error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get all memories' },
      { status: 500 }
    );
  }
}

// Handle different HTTP methods
export async function handleMemoryRequest(req: NextRequest) {
  const method = req.method;

  switch (method) {
    case 'POST':
      return POST(req);
    case 'GET':
      return GET(req);
    case 'DELETE':
      return DELETE(req);
    default:
      return NextResponse.json(
        { error: `Method ${method} not allowed` },
        { status: 405 }
      );
  }
}
