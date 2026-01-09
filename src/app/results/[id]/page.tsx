'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Tournament, Item } from '@/lib/types';
import { getTournamentFromStorage } from '@/lib/storage';

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageMode, setStorageMode] = useState<'server' | 'local' | null>(null);

  const loadResults = useCallback(async () => {
    try {
      // 1. Try to fetch from the server (Redis) via API
      const response = await fetch(`/api/tournament?id=${tournamentId}`);

      const local = getTournamentFromStorage(tournamentId);
      let server: Tournament | null = null;

      if (response.ok) {
        server = await response.json();
      }

      // Prefer localStorage if it's newer (e.g. local-only mode)
      const data =
        local && (!server || local.totalVotes > server.totalVotes)
          ? local
          : server;

      setStorageMode(data === local ? 'local' : server ? 'server' : null);
      
      if (data) {
        setTournament(data);
        // Sort items by ELO score for leaderboard
        const sorted = [...data.items].sort((a, b) => b.eloScore - a.eloScore);
        setLeaderboard(sorted);
      }
    } catch (error) {
      console.error("Error loading results:", error);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    loadResults();
    // Auto-refresh every 3 seconds for live updates
    const interval = setInterval(loadResults, 3000);
    return () => clearInterval(interval);
  }, [loadResults]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
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

  const maxScore = leaderboard[0]?.eloScore || 1500;
  const minScore = leaderboard[leaderboard.length - 1]?.eloScore || 1500;
  const scoreRange = maxScore - minScore || 1;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold mb-2">{tournament.topic}</h1>
              <p className="text-gray-400">Live Leaderboard</p>
              {storageMode === 'local' ? (
                <p className="text-xs mt-2 text-yellow-400">
                  Local-only mode: results are stored in your browser and won&apos;t sync across devices.
                </p>
              ) : null}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/vote/${tournamentId}`)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
              >
                Vote Now
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
              >
                New Tournament
              </button>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-400">Total Votes:</span>
              <span className="ml-2 font-semibold text-blue-400">{tournament.totalVotes}</span>
            </div>
            <div>
              <span className="text-gray-400">Contenders:</span>
              <span className="ml-2 font-semibold text-purple-400">{leaderboard.length}</span>
            </div>
          </div>
        </header>

        {/* Leaderboard */}
        <div className="space-y-3">
          {leaderboard.map((item, index) => {
            const barWidth = scoreRange > 0 
              ? ((item.eloScore - minScore) / scoreRange) * 100 
              : 100;
            const isTop3 = index < 3;
            
            return (
              <div
                key={item.id}
                className={`bg-[var(--card)] rounded-xl overflow-hidden border transition-all duration-300 hover:scale-[1.01] ${
                  isTop3 ? 'border-yellow-500/50' : 'border-[var(--border)]'
                }`}
              >
                <div className="flex items-center p-4 md:p-6 relative">
                  {/* Background bar */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                  ></div>
                  
                  {/* Content */}
                  <div className="relative z-10 flex items-center gap-4 md:gap-6 w-full">
                    {/* Rank */}
                    <div className={`text-2xl md:text-3xl font-bold w-12 md:w-16 text-center ${
                      index === 0 ? 'text-yellow-400' :
                      index === 1 ? 'text-gray-300' :
                      index === 2 ? 'text-orange-400' :
                      'text-gray-500'
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </div>
                    
                    {/* Image - UPDATED */}
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 border-[var(--border)] relative">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                        unoptimized
                        sizes="(max-width: 768px) 64px, 80px"
                      />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg md:text-xl font-semibold truncate">{item.name}</h3>
                      <div className="flex gap-4 text-sm text-gray-400 mt-1">
                        <span>ELO: <span className="text-blue-400 font-semibold">{item.eloScore}</span></span>
                        <span>W: <span className="text-green-400">{item.wins}</span></span>
                        <span>L: <span className="text-red-400">{item.losses}</span></span>
                      </div>
                    </div>
                    
                    {/* Win Rate */}
                    <div className="hidden md:block text-right">
                      <div className="text-2xl font-bold">
                        {item.wins + item.losses > 0 
                          ? `${Math.round((item.wins / (item.wins + item.losses)) * 100)}%`
                          : '—'}
                      </div>
                      <div className="text-xs text-gray-400">Win Rate</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Share Section */}
        <div className="mt-12 bg-[var(--card)] rounded-xl p-6 border border-[var(--border)] text-center">
          <h3 className="text-xl font-semibold mb-3">Share This Tournament</h3>
          <p className="text-gray-400 mb-4">Get more votes by sharing the voting link:</p>
          <div className="flex gap-2 max-w-2xl mx-auto">
            <input
              type="text"
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/vote/${tournamentId}`}
              className="flex-1 px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
              onClick={(e) => e.currentTarget.select()}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/vote/${tournamentId}`);
              }}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
