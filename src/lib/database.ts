import { Redis } from '@upstash/redis';
import { Tournament, Item } from './types';

// ----------------------------------------------------------------------------
// Diagnostics helpers (safe to log; never print secrets)
// ----------------------------------------------------------------------------
function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function safeIsValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function envSummary(name: string, value: string | undefined): string {
  if (!value) return `${name}=<missing>`;

  const trimmed = value.trim();
  const normalized = stripWrappingQuotes(value);
  const startsQuote = trimmed.startsWith('"') || trimmed.startsWith("'");
  const endsQuote = trimmed.endsWith('"') || trimmed.endsWith("'");
  const wrappedQuotes =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  const hasWhitespace = /\s/.test(value);

  const urlValidity = name.toUpperCase().includes('URL')
    ? ` urlValid(trimmed)=${safeIsValidUrl(trimmed)} urlValid(normalized)=${safeIsValidUrl(normalized)}`
    : '';

  // IMPORTANT: Never log the actual value.
  return `${name}=<set len=${value.length} wrappedQuotes=${wrappedQuotes} startsQuote=${startsQuote} endsQuote=${endsQuote} whitespace=${hasWhitespace}${urlValidity}>`;
}

// FIX: Do not crash if keys are missing during build
// Also normalize env var values (trim + strip wrapping quotes) because many
// deploy UIs store the quotes literally, unlike dotenv.
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
  ? stripWrappingQuotes(process.env.UPSTASH_REDIS_REST_URL)
  : undefined;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN
  ? stripWrappingQuotes(process.env.UPSTASH_REDIS_REST_TOKEN)
  : undefined;

const redis = (upstashUrl && upstashToken)
  ? new Redis({
      url: upstashUrl,
      token: upstashToken,
    })
  : null; // Return null instead of crashing

// Log env shape once per runtime instance (safe summary; helps diagnose deploy-only issues)
console.log(
  `[DB] ${envSummary('UPSTASH_REDIS_REST_URL', process.env.UPSTASH_REDIS_REST_URL)} ${envSummary('UPSTASH_REDIS_REST_TOKEN', process.env.UPSTASH_REDIS_REST_TOKEN)} redisEnabled=${Boolean(redis)}`
);

export async function createTournament(topic: string, items: Omit<Item, 'eloScore' | 'wins' | 'losses'>[]): Promise<Tournament> {
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

  // LocalStorage-first fallback:
  // If Redis is not configured (or temporarily unavailable), still return a usable
  // tournament so the client can persist it in localStorage.
  if (!redis) {
    console.warn('[DB] createTournament(): Redis not configured; returning non-persisted tournament for client-side storage.');
    return tournament;
  }

  try {
    await redis.set(`tournament:${id}`, tournament);
  } catch (error) {
    console.error('[DB] createTournament(): Redis write failed; returning non-persisted tournament for client-side storage.', error);
  }

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
