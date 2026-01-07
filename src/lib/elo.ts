import { VoteResult } from './types';

const K_FACTOR = 32; // Standard K-factor for dynamic ratings

/**
 * Calculate expected score for a player
 * @param playerRating Current ELO rating of the player
 * @param opponentRating Current ELO rating of the opponent
 * @returns Expected score (probability of winning) between 0 and 1
 */
function getExpectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Calculate new ELO ratings after a match
 * @param winnerRating Current rating of the winner
 * @param loserRating Current rating of the loser
 * @returns New ratings for both winner and loser
 */
export function calculateEloChange(
  winnerRating: number,
  loserRating: number
): { winnerNewRating: number; loserNewRating: number } {
  const winnerExpected = getExpectedScore(winnerRating, loserRating);
  const loserExpected = getExpectedScore(loserRating, winnerRating);
  
  // Winner gets 1 point, loser gets 0 points
  const winnerNewRating = Math.round(winnerRating + K_FACTOR * (1 - winnerExpected));
  const loserNewRating = Math.round(loserRating + K_FACTOR * (0 - loserExpected));
  
  return { winnerNewRating, loserNewRating };
}

/**
 * Process a vote and return the result with updated scores
 * @param winnerId ID of the winning item
 * @param loserId ID of the losing item
 * @param winnerCurrentScore Current ELO score of winner
 * @param loserCurrentScore Current ELO score of loser
 * @returns Vote result with new scores
 */
export function processVote(
  winnerId: string,
  loserId: string,
  winnerCurrentScore: number,
  loserCurrentScore: number
): VoteResult {
  const { winnerNewRating, loserNewRating } = calculateEloChange(
    winnerCurrentScore,
    loserCurrentScore
  );
  
  return {
    winnerId,
    loserId,
    winnerNewScore: winnerNewRating,
    loserNewScore: loserNewRating,
  };
}
