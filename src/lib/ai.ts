import OpenAI from 'openai';

interface AIItem {
  name: string;
}

function buildPollinationsUrl(prompt: string): string {
  const q = encodeURIComponent(prompt.trim() || 'image');
  const apiKey = process.env.NEXT_PUBLIC_POLLINATIONS_API_KEY?.trim();
  const keyParams = apiKey
    ? `&apikey=${encodeURIComponent(apiKey)}&key=${encodeURIComponent(apiKey)}`
    : '';
  return `https://image.pollinations.ai/prompt/${q}?width=1024&height=1024&nologo=true${keyParams}`;
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
        Each item must have a concise 'name' string.
        Do not include extra fields.`
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

  // 2. Return contenders with a placeholder image.
  // The server will attempt to replace this with Wikipedia/Commons images.
  return items.map((item, index) => ({
    id: `ai-${index}-${Date.now()}`,
    name: item.name,
    imageUrl: buildPollinationsUrl(item.name),
  }));
}
