import { Redis } from '@upstash/redis';
import { Tournament, Item } from './types';

// FIX: Do not crash if keys are missing during build
const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null; // Return null instead of crashing

export async function createTournament(topic: string, items: Omit<Item, 'eloScore' | 'wins' | 'losses'>[]): Promise<Tournament> {
  // Safety check inside the function
  if (!redis) throw new Error("Database credentials missing");

  const id = generateId();
  const tournament: Tournament = {
    id,
    topic,
    items: items.map(item => ({
      ...item,
      eloScore: 1500,
      wins: 0,
      losses: 0,
    })),
    createdAt: new Date(),
    totalVotes: 0,
  };
  
  await redis.set(`tournament:${id}`, tournament);
  return tournament;
}

export async function getTournament(id: string): Promise<Tournament | null> {
  if (!redis) return null; // Fail gracefully if no DB
  return await redis.get(`tournament:${id}`);
}

export async function updateItemScores(
  tournamentId: string,
  winnerId: string,
  loserId: string,
  winnerNewScore: number,
  loserNewScore: number
): Promise<void> {
  if (!redis) return;

  const tournament = await getTournament(tournamentId);
  if (!tournament) return;
  
  const winnerItem = tournament.items.find(item => item.id === winnerId);
  const loserItem = tournament.items.find(item => item.id === loserId);
  
  if (winnerItem && loserItem) {
    winnerItem.eloScore = winnerNewScore;
    winnerItem.wins += 1;
    loserItem.eloScore = loserNewScore;
    loserItem.losses += 1;
    tournament.totalVotes += 1;
    
    await redis.set(`tournament:${tournamentId}`, tournament);
  }
}

export async function getLeaderboard(tournamentId: string): Promise<Item[]> {
  const tournament = await getTournament(tournamentId);
  if (!tournament) return [];
  return [...tournament.items].sort((a, b) => b.eloScore - a.eloScore);
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}