'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveTournamentToStorage } from '@/lib/storage'; // Import this utility
import { generateDefaultContenders } from '@/lib/contenders';
import type { Tournament } from '@/lib/types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export default function Home() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCreateTournament = async () => {
    if (!topic.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });

      // If the API fails (common in external deploys without DB), fall back to
      // a local-only tournament stored in the browser.
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.tournamentId) {
        // Save the tournament to localStorage immediately.
        if (data.tournament) saveTournamentToStorage(data.tournament);
        router.push(`/vote/${data.tournamentId}`);
        return;
      }

      throw new Error('API did not return a tournament');
    } catch (error) {
      console.warn('Create Tournament API failed; falling back to localStorage-only mode.', error);

      const id = generateId();
      const baseItems = generateDefaultContenders(topic);
      const tournament: Tournament = {
        id,
        topic,
        items: baseItems.map(item => ({
          ...item,
          eloScore: 1500,
          wins: 0,
          losses: 0,
        })),
        createdAt: new Date(),
        totalVotes: 0,
      };

      saveTournamentToStorage(tournament);
      router.push(`/vote/${id}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-4xl w-full mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Blind Ranking
          </h1>
          <p className="text-gray-400 text-lg">
            Create crowd-sourced rankings with AI-generated contenders.
          </p>
        </header>

        <div className="bg-[var(--card)] rounded-2xl p-6 md:p-8 shadow-2xl border border-[var(--border)]">
          <div className="mb-6">
            <label htmlFor="topic" className="block text-sm font-medium mb-2 text-gray-300">
              What would you like to rank?
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Best 80s Cartoons, Top Sci-Fi Movies..."
              className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
              onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleCreateTournament()}
            />
          </div>

          <button
            onClick={handleCreateTournament}
            disabled={!topic.trim() || isGenerating}
            className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Dreaming up contenders...</span>
              </>
            ) : (
              'Create Tournament'
            )}
          </button>
        </div>

        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>Powered by OpenAI & Pollinations.ai</p>
        </footer>
      </div>
    </div>
  );
}
