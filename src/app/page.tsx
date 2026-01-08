'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tournament, Item } from '@/lib/types';
import { getTournament } from '@/lib/database';
import { getTournamentFromStorage, updateTournamentInStorage } from '@/lib/storage';

export default function VotePage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [currentPair, setCurrentPair] = useState<[Item, Item] | null>(null);
  const [nextPair, setNextPair] = useState<[Item, Item] | null>(null);
  const [voteCount, setVoteCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Helper to get random pair, optionally excluding specific items to avoid repeats
  const getRandomPair = useCallback((items: Item[], excludeIds: string[] = []): [Item, Item] | null => {
    if (items.length < 2) return null;
    
    // Filter out excluded items (optional, helps reduce immediate repeats)
    const pool = items.filter(item => !excludeIds.includes(item.id));
    // If pool is too small, fallback to full list
    const candidates = pool.length >= 2 ? pool : items;
    
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1]];
  }, []);

  // Preload images for the next pair so they appear instantly
  useEffect(() => {
    if (nextPair) {
      const img1 = new Image();
      const img2 = new Image();
      img1.src = nextPair[0].imageUrl;
      img2.src = nextPair[1].imageUrl;
    }
  }, [nextPair]);

  const loadTournament = useCallback(() => {
    // Try server-side first
    let data = getTournament(tournamentId);
    
    // Fallback to localStorage
    if (!data) {
      const storedData = getTournamentFromStorage(tournamentId);
      if (storedData) {
        data = storedData;
      }
    }
    
    if (data) {
      setTournament(data);
      
      // Initialize both current and next pair for "snappy" feel
      const firstPair = getRandomPair(data.items);
      setCurrentPair(firstPair);
      
      if (firstPair) {
        const secondPair = getRandomPair(data.items, [firstPair[0].id, firstPair[1].id]);
        setNextPair(secondPair);
      }
      
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [tournamentId, getRandomPair]);

  useEffect(() => {
    loadTournament();
  }, [loadTournament]);

  // WRAPPED IN USECALLBACK
  const cyclePairs = useCallback(() => {
    if (!tournament || !nextPair) return;
    
    // 1. Move next pair to current (Instant UI update)
    setCurrentPair(nextPair);
    
    // 2. Generate a new next pair in the background
    // Exclude the new current pair to avoid immediate repeats
    const newNext = getRandomPair(tournament.items, [nextPair[0].id, nextPair[1].id]);
    setNextPair(newNext);
  }, [tournament, nextPair, getRandomPair]);

  // WRAPPED IN USECALLBACK
  const handleVote = useCallback(async (winnerId: string, loserId: string) => {
    if (!tournament) return;
    
    // Optimistic UI update
    setVoteCount(prev => prev + 1);
    cyclePairs();

    // Fire and forget the API call
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId, winnerId, loserId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update local storage in background
        const updatedTournament = { ...tournament };
        const winnerItem = updatedTournament.items.find(item => item.id === winnerId);
        const loserItem = updatedTournament.items.find(item => item.id === loserId);
        
        if (winnerItem && loserItem && data.result) {
          winnerItem.eloScore = data.result.winnerNewScore;
          winnerItem.wins += 1;
          loserItem.eloScore = data.result.loserNewScore;
          loserItem.losses += 1;
          updatedTournament.totalVotes += 1;
          updateTournamentInStorage(updatedTournament);
          
          // Silently update state to keep math accurate
          setTournament(updatedTournament);
        }
      }
    } catch (error) {
      console.error('Error recording vote:', error);
    }
  }, [tournament, cyclePairs]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentPair) return;
      
      if (e.key === 'ArrowLeft') {
        handleVote(currentPair[0].id, currentPair[1].id);
      } else if (e.key === 'ArrowRight') {
        handleVote(currentPair[1].id, currentPair[0].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPair, handleVote]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (!tournament || !currentPair) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4 text-red-400">Tournament Not Found</h1>
          <p className="text-gray-400 mb-6">This tournament doesn&apos;t exist or has been removed.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Create New Tournament
          </button>
        </div>
      </div>
    );
  }

  const [itemA, itemB] = currentPair;

  return (
    // Fixed height screen container to prevent mobile scrolling
    <div className="h-screen max-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 p-4 md:p-6 border-b border-[var(--border)] z-20 bg-[var(--background)]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-bold truncate">{tournament.topic}</h1>
            <p className="text-xs md:text-sm text-gray-400 mt-1 hidden md:block">Choose your favorite (or use Arrow Keys)</p>
          </div>
          <button
            onClick={() => router.push(`/results/${tournamentId}`)}
            className="shrink-0 px-3 py-1.5 md:px-4 md:py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors text-sm md:text-base"
          >
            See Results
          </button>
        </div>
      </header>

      {/* Arena - Uses flex-1 to fill exactly the remaining space */}
      <div className="flex-1 flex flex-col md:flex-row items-stretch min-h-0">
        {/* Item A */}
        <button
          onClick={() => handleVote(itemA.id, itemB.id)}
          className="flex-1 relative group overflow-hidden transition-all duration-300 hover:brightness-110 active:scale-[0.98] outline-none focus-visible:ring-4 ring-blue-500"
          aria-label={`Vote for ${itemA.name}`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            style={{ backgroundImage: `url(${itemA.imageUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 text-left pointer-events-none">
            <h2 className="text-2xl md:text-5xl font-bold mb-1 md:mb-2 drop-shadow-lg leading-tight">{itemA.name}</h2>
            <p className="text-xs md:text-base text-gray-300 opacity-80">Click or Press Left Arrow</p>
          </div>
        </button>

        {/* VS Divider / Controls */}
        <div className="shrink-0 flex flex-row md:flex-col items-center justify-between md:justify-center bg-[var(--card)] border-y md:border-y-0 md:border-x border-[var(--border)] p-2 md:w-24 z-10 relative shadow-xl">
           <div className="text-xl md:text-4xl font-black text-gray-600 md:rotate-90 select-none">VS</div>
           
           <button 
             onClick={cyclePairs}
             className="md:mt-4 px-3 py-1 rounded-full border border-gray-600 text-xs md:text-sm text-gray-400 hover:text-white hover:border-white hover:bg-gray-800 transition-all whitespace-nowrap"
           >
             Skip
           </button>
        </div>

        {/* Item B */}
        <button
          onClick={() => handleVote(itemB.id, itemA.id)}
          className="flex-1 relative group overflow-hidden transition-all duration-300 hover:brightness-110 active:scale-[0.98] outline-none focus-visible:ring-4 ring-purple-500"
          aria-label={`Vote for ${itemB.name}`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            style={{ backgroundImage: `url(${itemB.imageUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 text-right md:text-left pointer-events-none">
            <div className="flex flex-col items-end md:items-start">
                <h2 className="text-2xl md:text-5xl font-bold mb-1 md:mb-2 drop-shadow-lg leading-tight">{itemB.name}</h2>
                <p className="text-xs md:text-base text-gray-300 opacity-80">Click or Press Right Arrow</p>
            </div>
          </div>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="shrink-0 bg-[var(--card)] border-t border-[var(--border)] p-3 md:p-4 z-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs md:text-sm text-gray-400">Votes Cast</span>
            <span className="text-xs md:text-sm font-bold text-blue-400">{voteCount}</span>
          </div>
          <div className="w-full bg-[var(--background)] rounded-full h-1.5 md:h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min((voteCount / 20) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}