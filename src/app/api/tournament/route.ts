import { NextRequest, NextResponse } from 'next/server';
import { createTournament, getTournament } from '@/lib/database';
import { generateDefaultContenders } from '@/lib/contenders';
import { generateAIContenders } from '@/lib/ai';
import { resolveImagesForItems } from '@/lib/wikimedia';

// HELPER: Safely extract error messages without using 'any'
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// -----------------------------------------------------------------------------
// GET Handler: Fetches a tournament by ID
// -----------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 });
  }

  try {
    const tournament = await getTournament(id);
    
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    return NextResponse.json(tournament);
  } catch (error: unknown) {
    console.error('Error fetching tournament:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: getErrorMessage(error)
    }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// POST Handler: Creates a new tournament (AI or Default)
// -----------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  // Correlate logs across async steps (safe to include in responses)
  const requestId = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

  try {
    // 1. Parse Request Body
    const body = await request.json();
    const { topic, items } = body;
    
    // 2. Validate Input
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }
    
    console.log(`[API][${requestId}] Received request to create tournament for topic: "${topic}"`);

    let finalItems = items;

    // 3. Generate Items (if not provided)
    if (!finalItems || finalItems.length === 0) {
      try {
        console.log(`[API][${requestId}] Attempting to generate AI contenders...`);
        // Attempt AI generation
        const aiItems = await generateAIContenders(topic);
        
        if (aiItems && aiItems.length > 0) {
          console.log(`[API][${requestId}] Successfully generated ${aiItems.length} AI items.`);
          finalItems = aiItems;
        } else {
          console.warn(`[API][${requestId}] AI returned no items. Falling back to defaults.`);
          finalItems = generateDefaultContenders(topic);
        }
      } catch (aiError) {
        // CRITICAL: Catch AI errors so they don't crash the whole request
        console.error(`[API][${requestId}] AI Generation Failed:`, aiError);
        console.log(`[API][${requestId}] Falling back to default contenders due to AI error.`);
        finalItems = generateDefaultContenders(topic);
      }
    }

    // 3b. Resolve images (Wikipedia → Commons → Pollinations)
    // Only run for auto-generated tournaments (topic-only requests).
    if (!items || items.length === 0) {
      try {
        console.log(`[API][${requestId}] Resolving images via Wikipedia/Commons...`);
        finalItems = await resolveImagesForItems(topic, finalItems);
      } catch (imgError) {
        console.error(`[API][${requestId}] Image resolution failed (continuing with existing image URLs):`, imgError);
      }
    }

    // 4. Save to Database
    try {
      console.log(`[API][${requestId}] Saving tournament to database...`);
      const tournament = await createTournament(topic, finalItems);
      console.log(`[API][${requestId}] Tournament created successfully with ID: ${tournament.id}`);
      
      return NextResponse.json({ 
        success: true, 
        requestId,
        tournamentId: tournament.id,
        tournament: tournament 
      });

    } catch (dbError: unknown) {
      // 5. Handle Database Specific Errors
      console.error(`[API][${requestId}] Database Error:`, dbError);
      
      const message = getErrorMessage(dbError);
      
      // Check if it's the specific "Missing Credentials" error we added earlier
      if (message.includes('Database credentials missing')) {
          return NextResponse.json({ 
            error: 'Server Configuration Error', 
            message: 'Database credentials (UPSTASH_REDIS_REST_URL) are missing on the server.',
            details: message,
            requestId,
          }, { status: 503 }); // 503 Service Unavailable
       }

       return NextResponse.json({ 
         error: 'Failed to save tournament', 
         details: message,
         requestId,
       }, { status: 500 });
    }

  } catch (error: unknown) {
    // 6. Catch-all for unexpected crashes
    console.error(`[API][${requestId}] Critical Error in POST handler:`, error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: getErrorMessage(error),
      requestId,
    }, { status: 500 });
  }
}
