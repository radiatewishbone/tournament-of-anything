import { NextRequest, NextResponse } from 'next/server';
import { createTournament } from '@/lib/database';
import { generateDefaultContenders } from '@/lib/contenders'; //
import { generateAIContenders } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, items } = body;
    
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }
    
    let finalItems = items;

    // If no manual items provided, try AI generation
    if (!finalItems || finalItems.length === 0) {
      // 1. Try AI Generation
      const aiItems = await generateAIContenders(topic);
      
      if (aiItems) {
        finalItems = aiItems;
      } else {
        // 2. Fallback to static list if AI fails
        finalItems = generateDefaultContenders(topic);
      }
    }
    
    const tournament = createTournament(topic, finalItems);
    
    return NextResponse.json({ 
      success: true, 
      tournamentId: tournament.id 
    });
  } catch (error) {
    console.error('Error creating tournament:', error);
    return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 });
  }
}