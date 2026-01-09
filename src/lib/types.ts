export type ImageSource =
  | 'wikipedia'
  | 'commons'
  | 'pollinations'
  | 'unsplash'
  | 'google'
  | 'placeholder'
  | 'unknown';

export interface Item {
  id: string;
  name: string;
  imageUrl: string;
  /** Where the image came from (used for attribution UX). */
  imageSource?: ImageSource;
  /** A canonical attribution link (Wikipedia article, Commons file page, etc). */
  imageSourceUrl?: string;
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
