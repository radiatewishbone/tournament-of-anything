// Generate default contenders based on topic
export function generateDefaultContenders(topic: string): Array<{ id: string; name: string; imageUrl: string }> {
  const topicLower = topic.toLowerCase();
  
  // Office Snacks
  if (topicLower.includes('snack') || topicLower.includes('office')) {
    return [
      { id: '1', name: 'Chocolate Chip Cookies', imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400' },
      { id: '2', name: 'Potato Chips', imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400' },
      { id: '3', name: 'Granola Bars', imageUrl: 'https://images.unsplash.com/photo-1606312619070-d48b4cbc5b52?w=400' },
      { id: '4', name: 'Mixed Nuts', imageUrl: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400' },
      { id: '5', name: 'Fresh Fruit', imageUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400' },
      { id: '6', name: 'Pretzels', imageUrl: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400' },
      { id: '7', name: 'Popcorn', imageUrl: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=400' },
      { id: '8', name: 'Trail Mix', imageUrl: 'https://images.unsplash.com/photo-1520967824495-b529aeba26df?w=400' },
      { id: '9', name: 'Protein Bars', imageUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400' },
      { id: '10', name: 'Crackers & Cheese', imageUrl: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=400' },
      { id: '11', name: 'Yogurt', imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400' },
      { id: '12', name: 'Candy Bars', imageUrl: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=400' },
      { id: '13', name: 'Rice Cakes', imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400' },
      { id: '14', name: 'Beef Jerky', imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400' },
      { id: '15', name: 'Veggie Sticks', imageUrl: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=400' },
      { id: '16', name: 'Cookies & Cream', imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400' },
    ];
  }
  
  // Movies
  if (topicLower.includes('movie') || topicLower.includes('film')) {
    return [
      { id: '1', name: 'The Shawshank Redemption', imageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400' },
      { id: '2', name: 'The Godfather', imageUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400' },
      { id: '3', name: 'The Dark Knight', imageUrl: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400' },
      { id: '4', name: 'Pulp Fiction', imageUrl: 'https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=400' },
      { id: '5', name: 'Forrest Gump', imageUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400' },
      { id: '6', name: 'Inception', imageUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400' },
      { id: '7', name: 'The Matrix', imageUrl: 'https://images.unsplash.com/photo-1574267432644-f610a4ab5f6c?w=400' },
      { id: '8', name: 'Interstellar', imageUrl: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=400' },
      { id: '9', name: 'Fight Club', imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400' },
      { id: '10', name: 'Goodfellas', imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400' },
      { id: '11', name: 'The Silence of the Lambs', imageUrl: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=400' },
      { id: '12', name: 'Saving Private Ryan', imageUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400' },
      { id: '13', name: 'The Green Mile', imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400' },
      { id: '14', name: 'Gladiator', imageUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400' },
      { id: '15', name: 'The Departed', imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400' },
      { id: '16', name: 'The Prestige', imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400' },
    ];
  }
  
  // Generic fallback
  return Array.from({ length: 16 }, (_, i) => ({
    id: String(i + 1),
    name: `${topic} Option ${i + 1}`,
    imageUrl: `https://images.unsplash.com/photo-1557683316-973673baf926?w=400&q=80&auto=format&fit=crop&txt=${encodeURIComponent(topic + ' ' + (i + 1))}`,
  }));
}
