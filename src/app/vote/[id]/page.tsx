'use client';

import { useEffect, useState } from 'react';
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
  const [voteCount, setVoteCount] = useState(0);
  const [isVoting, setIsVoting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadTournament = () => {
    // Try server-side first
    let data = getTournament(tournamentId);
    
    // Fallback to localStorage if server data not available
    if (!data) {
      const storedData = getTournamentFromStorage(tournamentId);
      if (storedData) {
        data = storedData;
      }
    }
    
    if (data) {
      setTournament(data);
      setCurrentPair(getRandomPair(data.items));
      setLoading(false);
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTournament();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const getRandomPair = (items: Item[]): [Item, Item] | null => {
    if (items.length < 2) return null;
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1]];
  };

  const handleVote = async (winnerId: string, loserId: string) => {
    if (isVoting || !tournament) return;
    
    setIsVoting(true);
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId, winnerId, loserId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update localStorage with new scores
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
        }
        
        setVoteCount(prev => prev + 1);
        // Reload tournament data and get new pair
        loadTournament();
      }
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setIsVoting(false);
    }
  };

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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col">
      {/* Header */}
      <header className="p-4 md:p-6 border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{tournament.topic}</h1>
            <p className="text-sm text-gray-400 mt-1">Choose your favorite</p>
          </div>
          <button
            onClick={() => router.push(`/results/${tournamentId}`)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors text-sm md:text-base"
          >
            See Results
          </button>
        </div>
      </header>

      {/* Arena */}
      <div className="flex-1 flex flex-col md:flex-row items-stretch">
        {/* Item A */}
        <button
          onClick={() => handleVote(itemA.id, itemB.id)}
          disabled={isVoting}
          className="flex-1 relative group overflow-hidden transition-all duration-300 hover:scale-[1.02] disabled:hover:scale-100 disabled:cursor-wait"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div 
            className="h-full min-h-[50vh] md:min-h-screen bg-cover bg-center relative"
            style={{ backgroundImage: `url(${itemA.imageUrl})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <h2 className="text-3xl md:text-5xl font-bold mb-2 drop-shadow-lg">{itemA.name}</h2>
              <p className="text-sm md:text-base text-gray-300">Click to vote</p>
            </div>
          </div>
        </button>

        {/* VS Divider */}
        <div className="flex items-center justify-center bg-[var(--card)] md:w-20 py-4 md:py-0">
          <div className="text-2xl md:text-4xl font-bold text-gray-500 rotate-0 md:rotate-90">VS</div>
        </div>

        {/* Item B */}
        <button
          onClick={() => handleVote(itemB.id, itemA.id)}
          disabled={isVoting}
          className="flex-1 relative group overflow-hidden transition-all duration-300 hover:scale-[1.02] disabled:hover:scale-100 disabled:cursor-wait"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div 
            className="h-full min-h-[50vh] md:min-h-screen bg-cover bg-center relative"
            style={{ backgroundImage: `url(${itemB.imageUrl})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <h2 className="text-3xl md:text-5xl font-bold mb-2 drop-shadow-lg">{itemB.name}</h2>
              <p className="text-sm md:text-base text-gray-300">Click to vote</p>
            </div>
          </div>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="bg-[var(--card)] border-t border-[var(--border)] p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Your votes</span>
            <span className="text-sm font-semibold text-blue-400">{voteCount}</span>
          </div>
          <div className="w-full bg-[var(--background)] rounded-full h-2 overflow-hidden">
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
