import { NextRequest, NextResponse } from 'next/server';
import { getTournament, updateItemScores } from '@/lib/database';
import { processVote } from '@/lib/elo';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tournamentId, winnerId, loserId } = body;
    
    if (!tournamentId || !winnerId || !loserId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const tournament = getTournament(tournamentId);
    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }
    
    const winner = tournament.items.find(item => item.id === winnerId);
    const loser = tournament.items.find(item => item.id === loserId);
    
    if (!winner || !loser) {
      return NextResponse.json(
        { error: 'Invalid item IDs' },
        { status: 400 }
      );
    }
    
    const result = processVote(
      winnerId,
      loserId,
      winner.eloScore,
      loser.eloScore
    );
    
    updateItemScores(
      tournamentId,
      winnerId,
      loserId,
      result.winnerNewScore,
      result.loserNewScore
    );
    
    return NextResponse.json({ 
      success: true,
      result 
    });
  } catch (error) {
    console.error('Error processing vote:', error);
    return NextResponse.json(
      { error: 'Failed to process vote' },
      { status: 500 }
    );
  }
}
