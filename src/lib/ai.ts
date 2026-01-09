import OpenAI from 'openai';

// 1. Add your new keys to .env
// GOOGLE_SEARCH_API_KEY=...
// GOOGLE_SEARCH_ENGINE_ID=...

interface AIItem {
  name: string;
  searchQuery: string; // Changed from 'imagePrompt' to 'searchQuery'
}

// Helper to fetch one image from Google
async function fetchGoogleImage(query: string): Promise<string> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!apiKey || !cx) return "https://via.placeholder.com/400?text=No+API+Key";

  try {
    const res = await fetch(
      `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${cx}&key=${apiKey}&searchType=image&num=1&safe=high`
    );
    
    if (!res.ok) throw new Error("Google API Error");
    
    const data = await res.json();
    // Return the first image link, or a fallback if none found
    return data.items?.[0]?.link || `https://via.placeholder.com/400?text=${encodeURIComponent(query)}`;
  } catch (error) {
    console.error(`Failed to fetch image for ${query}:`, error);
    return "https://via.placeholder.com/400?text=Error";
  }
}

export async function generateAIContenders(topic: string) {
  if (!process.env.OPENAI_API_KEY) return null;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // 1. Get the list of names from OpenAI
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a tournament organizer. 
        Output valid JSON only. 
        Root object must have an 'items' array. 
        Each item has 'name' and 'searchQuery'.
        'searchQuery' should be the best Google Image search term for that item (e.g. 'Darth Vader movie still').`
      },
      {
        role: "user",
        content: `Generate 16 contenders for: "${topic}".`
      }
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0].message.content;
  if (!content) return null;
  const parsed = JSON.parse(content);
  const items = parsed.items as AIItem[];

  // 2. Fetch all images in PARALLEL (Crucial for speed)
  // We use Promise.all to fire 16 requests at once, reducing wait time from ~10s to ~1s.
  const contendersWithImages = await Promise.all(
    items.map(async (item, index) => {
      const imageUrl = await fetchGoogleImage(item.searchQuery);
      return {
        id: `ai-${index}-${Date.now()}`,
        name: item.name,
        imageUrl: imageUrl,
      };
    })
  );

  return contendersWithImages;
}