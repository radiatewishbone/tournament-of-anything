import OpenAI from 'openai';

// FIX: Remove top-level initialization that requires the key immediately
// const openai = new OpenAI({ ... }); <--- This was causing the build error

interface AIItem {
  name: string;
  imagePrompt: string;
}

export async function generateAIContenders(topic: string) {
  // Check for key inside the function execution, not at file load
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY is missing. Falling back to default data.");
    return null;
  }

  // Initialize client only when needed
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a creative assistant that generates tournament contenders. 
          Output valid JSON only. 
          The JSON must contain a root object with an 'items' array. 
          Each item in the array must have a 'name' (string) and 'imagePrompt' (string).`
        },
        {
          role: "user",
          content: `Generate 16 diverse, popular, and distinct contenders for a tournament about: "${topic}". 
          For the 'imagePrompt', provide a detailed visual description suitable for AI image generation (visuals only, no text).`
        }
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content returned from OpenAI");

    const parsed = JSON.parse(content);
    
    if (!parsed.items || !Array.isArray(parsed.items)) {
      console.error("OpenAI returned unexpected structure:", parsed);
      return null;
    }

    const items = parsed.items as AIItem[];

    return items.map((item, index) => ({
      id: `ai-${index}-${Date.now()}`,
      name: item.name,
      imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(item.imagePrompt)}?nologo=true&private=true&model=flux`,
    }));

  } catch (error) {
    console.error("OpenAI Generation Failed:", error);
    return null;
  }
}