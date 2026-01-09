import { NextRequest, NextResponse } from 'next/server';
import { createTournament, getTournament } from '@/lib/database'; // Import getTournament
import { generateDefaultContenders } from '@/lib/contenders';
import { generateAIContenders } from '@/lib/ai';

// NEW: Add a GET handler to fetch tournament data
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
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Existing POST handler...
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, items } = body;
    
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }
    
    let finalItems = items;

    if (!finalItems || finalItems.length === 0) {
      const aiItems = await generateAIContenders(topic);
      if (aiItems) {
        finalItems = aiItems;
      } else {
        finalItems = generateDefaultContenders(topic);
      }
    }
    
    const tournament = await createTournament(topic, finalItems);
    
    return NextResponse.json({ 
      success: true, 
      tournamentId: tournament.id,
      tournament: tournament 
    });
  } catch (error) {
    console.error('Error creating tournament:', error);
    return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 });
  }
}