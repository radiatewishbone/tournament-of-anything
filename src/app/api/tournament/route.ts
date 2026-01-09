import { NextRequest, NextResponse } from 'next/server';
import { createTournament, getTournament } from '@/lib/database';
import { generateDefaultContenders } from '@/lib/contenders';
import { generateAIContenders } from '@/lib/ai';

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
  } catch (error: any) {
    console.error('Error fetching tournament:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error.message 
    }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// POST Handler: Creates a new tournament (AI or Default)
// -----------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    // 1. Parse Request Body
    const body = await request.json();
    const { topic, items } = body;
    
    // 2. Validate Input
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }
    
    console.log(`[API] Received request to create tournament for topic: "${topic}"`);

    let finalItems = items;

    // 3. Generate Items (if not provided)
    if (!finalItems || finalItems.length === 0) {
      try {
        console.log('[API] Attempting to generate AI contenders...');
        // Attempt AI generation
        const aiItems = await generateAIContenders(topic);
        
        if (aiItems && aiItems.length > 0) {
          console.log(`[API] Successfully generated ${aiItems.length} AI items.`);
          finalItems = aiItems;
        } else {
          console.warn('[API] AI returned no items. Falling back to defaults.');
          finalItems = generateDefaultContenders(topic);
        }
      } catch (aiError) {
        // CRITICAL: Catch AI errors so they don't crash the whole request
        console.error('[API] AI Generation Failed:', aiError);
        console.log('[API] Falling back to default contenders due to AI error.');
        finalItems = generateDefaultContenders(topic);
      }
    }

    // 4. Save to Database
    try {
      console.log('[API] Saving tournament to database...');
      const tournament = await createTournament(topic, finalItems);
      console.log(`[API] Tournament created successfully with ID: ${tournament.id}`);
      
      return NextResponse.json({ 
        success: true, 
        tournamentId: tournament.id,
        tournament: tournament 
      });

    } catch (dbError: any) {
      // 5. Handle Database Specific Errors
      console.error('[API] Database Error:', dbError);
      
      // Check if it's the specific "Missing Credentials" error we added earlier
      if (dbError.message && dbError.message.includes('Database credentials missing')) {
         return NextResponse.json({ 
           error: 'Server Configuration Error', 
           message: 'Database credentials (UPSTASH_REDIS_REST_URL) are missing on the server.',
           details: dbError.message
         }, { status: 503 }); // 503 Service Unavailable
      }

      return NextResponse.json({ 
        error: 'Failed to save tournament', 
        details: dbError.message 
      }, { status: 500 });
    }

  } catch (error: any) {
    // 6. Catch-all for unexpected crashes
    console.error('[API] Critical Error in POST handler:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error.message 
    }, { status: 500 });
  }
}