import { Tournament, Item } from './types';

// In-memory database
const tournaments = new Map<string, Tournament>();

export function createTournament(topic: string, items: Omit<Item, 'eloScore' | 'wins' | 'losses'>[]): Tournament {
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
  
  tournaments.set(id, tournament);
  return tournament;
}

export function getTournament(id: string): Tournament | undefined {
  return tournaments.get(id);
}

export function updateItemScores(
  tournamentId: string,
  winnerId: string,
  loserId: string,
  winnerNewScore: number,
  loserNewScore: number
): void {
  const tournament = tournaments.get(tournamentId);
  if (!tournament) return;
  
  const winnerItem = tournament.items.find(item => item.id === winnerId);
  const loserItem = tournament.items.find(item => item.id === loserId);
  
  if (winnerItem && loserItem) {
    winnerItem.eloScore = winnerNewScore;
    winnerItem.wins += 1;
    loserItem.eloScore = loserNewScore;
    loserItem.losses += 1;
    tournament.totalVotes += 1;
  }
}

export function getLeaderboard(tournamentId: string): Item[] {
  const tournament = tournaments.get(tournamentId);
  if (!tournament) return [];
  
  return [...tournament.items].sort((a, b) => b.eloScore - a.eloScore);
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
