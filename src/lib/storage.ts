// Browser-side storage fallback for persistence
// This allows tournaments to persist in the browser's localStorage

import { Tournament } from './types';

const STORAGE_KEY = 'blind_ranking_tournaments';

export function saveTournamentToStorage(tournament: Tournament): void {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const tournaments = stored ? JSON.parse(stored) : {};
    tournaments[tournament.id] = tournament;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
  } catch (error) {
    console.error('Failed to save tournament to storage:', error);
  }
}

export function getTournamentFromStorage(id: string): Tournament | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const tournaments = JSON.parse(stored);
    return tournaments[id] || null;
  } catch (error) {
    console.error('Failed to get tournament from storage:', error);
    return null;
  }
}

export function updateTournamentInStorage(tournament: Tournament): void {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const tournaments = stored ? JSON.parse(stored) : {};
    tournaments[tournament.id] = tournament;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
  } catch (error) {
    console.error('Failed to update tournament in storage:', error);
  }
}

export function getAllTournamentsFromStorage(): Tournament[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const tournaments = JSON.parse(stored);
    return Object.values(tournaments);
  } catch (error) {
    console.error('Failed to get all tournaments from storage:', error);
    return [];
  }
}
