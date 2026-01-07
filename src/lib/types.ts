export interface Item {
  id: string;
  name: string;
  imageUrl: string;
  eloScore: number;
  wins: number;
  losses: number;
}

export interface Tournament {
  id: string;
  topic: string;
  items: Item[];
  createdAt: Date;
  totalVotes: number;
}

export interface VoteResult {
  winnerId: string;
  loserId: string;
  winnerNewScore: number;
  loserNewScore: number;
}
