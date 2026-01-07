import { NextRequest, NextResponse } from 'next/server';
import { createTournament } from '@/lib/database';
import { generateDefaultContenders } from '@/lib/contenders';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, items } = body;
    
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }
    
    // Use provided items or generate defaults
    const contenders = items && items.length > 0 
      ? items 
      : generateDefaultContenders(topic);
    
    const tournament = createTournament(topic, contenders);
    
    return NextResponse.json({ 
      success: true, 
      tournamentId: tournament.id 
    });
  } catch (error) {
    console.error('Error creating tournament:', error);
    return NextResponse.json(
      { error: 'Failed to create tournament' },
      { status: 500 }
    );
  }
}
