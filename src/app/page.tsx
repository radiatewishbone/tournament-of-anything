'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateDefaultContenders } from '@/lib/contenders';

export default function Home() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [items, setItems] = useState<Array<{ id: string; name: string; imageUrl: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showItems, setShowItems] = useState(false);

  const handleGenerateItems = () => {
    if (!topic.trim()) return;
    const generated = generateDefaultContenders(topic);
    setItems(generated);
    setShowItems(true);
  };

  const handleCreateTournament = async () => {
    if (!topic.trim() || items.length === 0) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, items }),
      });
      
      const data = await response.json();
      if (data.success) {
        router.push(`/vote/${data.tournamentId}`);
      }
    } catch (error) {
      console.error('Error creating tournament:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateItem = (id: string, field: 'name' | 'imageUrl', value: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Blind Ranking
          </h1>
          <p className="text-gray-400 text-lg">
            Create crowd-sourced rankings through ELO-based voting
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
              placeholder="e.g., Best Office Snacks, Top Movies, Favorite Games..."
              className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
              onKeyDown={(e) => e.key === 'Enter' && !showItems && handleGenerateItems()}
            />
          </div>

          {!showItems ? (
            <button
              onClick={handleGenerateItems}
              disabled={!topic.trim()}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors duration-200"
            >
              Generate Contenders
            </button>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">Edit Contenders ({items.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2">
                  {items.map((item) => (
                    <div key={item.id} className="bg-[var(--background)] p-3 rounded-lg border border-[var(--border)]">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        className="w-full px-2 py-1 mb-2 bg-[var(--card)] border border-[var(--border)] rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={item.imageUrl}
                        onChange={(e) => updateItem(item.id, 'imageUrl', e.target.value)}
                        placeholder="Image URL"
                        className="w-full px-2 py-1 bg-[var(--card)] border border-[var(--border)] rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-400"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowItems(false)}
                  className="flex-1 py-3 px-6 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors duration-200"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateTournament}
                  disabled={isGenerating}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all duration-200 shadow-lg"
                >
                  {isGenerating ? 'Creating...' : 'Create Tournament'}
                </button>
              </div>
            </>
          )}
        </div>

        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>Share the voting link with your community to start ranking!</p>
        </footer>
      </div>
    </div>
  );
}
