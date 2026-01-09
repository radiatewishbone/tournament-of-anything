import { Redis } from '@upstash/redis';
import { Tournament, Item } from './types';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function createTournament(topic: string, items: Omit<Item, 'eloScore' | 'wins' | 'losses'>[]): Promise<Tournament> {
  const id = generateId();
  
  const tournament: Tournament = {
    id,
    topic,
    items: items.map(item => ({
      ...item,
      eloScore: 1500, // Standard starting ELO
      wins: 0,
      losses: 0,
    })),
    createdAt: new Date(),
    totalVotes: 0,
  };
  
  // Save to Redis (Key: "tournament:xyz123")
  await redis.set(`tournament:${id}`, tournament);
  return tournament;
}

export async function getTournament(id: string): Promise<Tournament | null> {
  // Fetch from Redis
  return await redis.get(`tournament:${id}`);
}

export async function updateItemScores(
  tournamentId: string,
  winnerId: string,
  loserId: string,
  winnerNewScore: number,
  loserNewScore: number
): Promise<void> {
  // 1. Get current data
  const tournament = await getTournament(tournamentId);
  if (!tournament) return;
  
  // 2. Update local object
  const winnerItem = tournament.items.find(item => item.id === winnerId);
  const loserItem = tournament.items.find(item => item.id === loserId);
  
  if (winnerItem && loserItem) {
    winnerItem.eloScore = winnerNewScore;
    winnerItem.wins += 1;
    loserItem.eloScore = loserNewScore;
    loserItem.losses += 1;
    tournament.totalVotes += 1;
    
    // 3. Save updated object back to Redis
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