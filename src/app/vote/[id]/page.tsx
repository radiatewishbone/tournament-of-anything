'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tournament, Item } from '@/lib/types';
import { getTournamentFromStorage, updateTournamentInStorage } from '@/lib/storage';
import { processVote } from '@/lib/elo';
import RemoteImage from '@/components/RemoteImage';

export default function VotePage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [items, setItems] = useState<[Item, Item] | null>(null);
  const [loading, setLoading] = useState(true);
  const [voteCount, setVoteCount] = useState(0);
  const [storageMode, setStorageMode] = useState<'server' | 'local' | null>(null);

  // Helper to pick 2 random different items
  const pickRandomPair = useCallback((itemList: Item[]) => {
    if (itemList.length < 2) return null;
    
    // Simple random selection
    const idx1 = Math.floor(Math.random() * itemList.length);
    let idx2 = Math.floor(Math.random() * itemList.length);
    
    // Ensure they are different
    while (idx1 === idx2) {
      idx2 = Math.floor(Math.random() * itemList.length);
    }
    
    return [itemList[idx1], itemList[idx2]] as [Item, Item];
  }, []);

  const loadTournament = useCallback(async () => {
    try {
      const response = await fetch(`/api/tournament?id=${tournamentId}`);
      const local = getTournamentFromStorage(tournamentId);
      let server: Tournament | null = null;

      if (response.ok) {
        server = await response.json();
      }

      // Prefer localStorage if it's newer (e.g. local-only mode or server DB down)
      const data =
        local && (!server || local.totalVotes > server.totalVotes)
          ? local
          : server;

      setStorageMode(data === local ? 'local' : server ? 'server' : null);

      if (data) {
        setTournament(data);
        setVoteCount(data.totalVotes);
        if (!items) {
          setItems(pickRandomPair(data.items));
        }
      }
    } catch (error) {
      console.error("Error loading tournament:", error);
    } finally {
      setLoading(false);
    }
  }, [tournamentId, items, pickRandomPair]);

  useEffect(() => {
    loadTournament();
  }, [loadTournament]);

  const handleVote = async (winnerId: string, loserId: string) => {
    if (!tournament) return;

    // -----------------------------------------------------------------------
    // LocalStorage-first mode:
    // Always apply the ELO update locally so voting works even when the
    // server DB is unavailable (or when /api/vote fails in production).
    // -----------------------------------------------------------------------
    const winner = tournament.items.find(item => item.id === winnerId);
    const loser = tournament.items.find(item => item.id === loserId);
    if (!winner || !loser) return;

    const result = processVote(winnerId, loserId, winner.eloScore, loser.eloScore);

    const updatedTournament: Tournament = {
      ...tournament,
      totalVotes: tournament.totalVotes + 1,
      items: tournament.items.map(item => {
        if (item.id === winnerId) {
          return {
            ...item,
            eloScore: result.winnerNewScore,
            wins: item.wins + 1,
          };
        }

        if (item.id === loserId) {
          return {
            ...item,
            eloScore: result.loserNewScore,
            losses: item.losses + 1,
          };
        }

        return item;
      }),
    };

    setTournament(updatedTournament);
    setVoteCount(updatedTournament.totalVotes);
    updateTournamentInStorage(updatedTournament);

    // Best-effort server persistence (ignored in localStorage-only mode)
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId,
          winnerId,
          loserId,
        }),
      });

      if (!res.ok) {
        console.warn('Vote was applied locally, but server persistence failed.');
      }
    } catch (e) {
      console.warn('Vote was applied locally, but server request failed.', e);
    }

    // Pick new pair immediately
    const nextPair = pickRandomPair(updatedTournament.items);
    setItems(nextPair);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!items) return;
      if (e.key === 'ArrowLeft') handleVote(items[0].id, items[1].id);
      if (e.key === 'ArrowRight') handleVote(items[1].id, items[0].id);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, tournament]); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (!tournament || !items) {
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

  const [itemA, itemB] = items;

  const sourceLabelA =
    itemA.imageSource === 'wikipedia'
      ? 'Wikipedia'
      : itemA.imageSource === 'commons'
        ? 'Wikimedia Commons'
        : itemA.imageSource === 'pollinations'
          ? 'Pollinations'
          : 'Source';

  const sourceLabelB =
    itemB.imageSource === 'wikipedia'
      ? 'Wikipedia'
      : itemB.imageSource === 'commons'
        ? 'Wikimedia Commons'
        : itemB.imageSource === 'pollinations'
          ? 'Pollinations'
          : 'Source';

  return (
    <div className="h-screen max-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 p-4 md:p-6 border-b border-[var(--border)] z-20 bg-[var(--background)]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-bold truncate">{tournament.topic}</h1>
            <p className="text-xs md:text-sm text-gray-400 mt-1 hidden md:block">Choose your favorite (or use Arrow Keys)</p>
            {storageMode === 'local' ? (
              <p className="text-xs mt-1 text-yellow-400">
                Local-only mode: this tournament is stored in your browser and won&apos;t work on other devices.
              </p>
            ) : null}
          </div>
          <button
            onClick={() => router.push(`/results/${tournamentId}`)}
            className="shrink-0 px-3 py-1.5 md:px-4 md:py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors text-sm md:text-base"
          >
            View Results
          </button>
        </div>
      </header>

      {/* Battle Arena */}
      <div className="flex-1 flex flex-col md:flex-row items-stretch min-h-0">
        
        {/* Left Option */}
        <button
          onClick={() => handleVote(itemA.id, itemB.id)}
          className="flex-1 relative group overflow-hidden transition-all duration-300 hover:brightness-110 active:scale-[0.98] outline-none focus-visible:ring-4 ring-blue-500"
        >
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20"></div>
          
           {/* Image - UPDATED */}
           <div className="absolute inset-0">
              <RemoteImage
                src={itemA.imageUrl}
                alt={itemA.name}
                fallbackText={itemA.name}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="eager"
              />
           </div>

          {/* Text Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10"></div>
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 text-left pointer-events-none z-20">
            <h2 className="text-2xl md:text-5xl font-bold mb-1 md:mb-2 drop-shadow-lg leading-tight">{itemA.name}</h2>
            <p className="text-xs md:text-base text-gray-300 opacity-80">Click or Press Left Arrow</p>
            {itemA.imageSourceUrl ? (
              <a
                href={itemA.imageSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="pointer-events-auto text-xs text-gray-200/80 underline"
                onClick={(e) => e.stopPropagation()}
              >
                Source: {sourceLabelA}
              </a>
            ) : null}
          </div>
        </button>

        {/* VS Badge */}
        <div className="shrink-0 flex flex-row md:flex-col items-center justify-between md:justify-center bg-[var(--card)] border-y md:border-y-0 md:border-x border-[var(--border)] p-2 md:w-24 z-30 relative shadow-xl">
           <div className="text-xl md:text-4xl font-black text-gray-600 md:rotate-90 select-none">VS</div>
           <button 
             onClick={() => setItems(pickRandomPair(tournament.items))}
             className="md:mt-4 px-3 py-1 rounded-full border border-gray-600 text-xs md:text-sm text-gray-400 hover:text-white hover:border-white hover:bg-gray-800 transition-all whitespace-nowrap"
           >
             Skip
           </button>
        </div>

        {/* Right Option */}
        <button
          onClick={() => handleVote(itemB.id, itemA.id)}
          className="flex-1 relative group overflow-hidden transition-all duration-300 hover:brightness-110 active:scale-[0.98] outline-none focus-visible:ring-4 ring-purple-500"
        >
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20"></div>

           {/* Image - UPDATED */}
           <div className="absolute inset-0">
              <RemoteImage
                src={itemB.imageUrl}
                alt={itemB.name}
                fallbackText={itemB.name}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="eager"
              />
           </div>

          {/* Text Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10"></div>
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 text-right md:text-left pointer-events-none z-20">
            <div className="flex flex-col items-end md:items-start">
                <h2 className="text-2xl md:text-5xl font-bold mb-1 md:mb-2 drop-shadow-lg leading-tight">{itemB.name}</h2>
                <p className="text-xs md:text-base text-gray-300 opacity-80">Click or Press Right Arrow</p>
                {itemB.imageSourceUrl ? (
                  <a
                    href={itemB.imageSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="pointer-events-auto text-xs text-gray-200/80 underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Source: {sourceLabelB}
                  </a>
                ) : null}
            </div>
          </div>
        </button>
      </div>

      {/* Footer Stats */}
      <div className="shrink-0 bg-[var(--card)] border-t border-[var(--border)] p-3 md:p-4 z-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs md:text-sm text-gray-400">Votes Cast</span>
            <span className="text-xs md:text-sm font-bold text-blue-400">{voteCount}</span>
          </div>
          <div className="w-full bg-[var(--background)] rounded-full h-1.5 md:h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min((voteCount / 100) * 100, 100)}%` }} // Arbitrary progress bar
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
