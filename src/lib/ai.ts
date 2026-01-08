import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Initialize API with the key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Define the structure we want Gemini to return
const schema = {
  description: "List of tournament contenders",
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      name: {
        type: SchemaType.STRING,
        description: "Name of the contender",
        nullable: false,
      },
      imagePrompt: {
        type: SchemaType.STRING,
        description: "Visual description for AI image generation. Visuals only, no text. (e.g. 'cinematic lighting, hyperrealistic apple on a table')",
        nullable: false,
      },
    },
    required: ["name", "imagePrompt"],
  },
};

export async function generateAIContenders(topic: string) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is missing. Falling back to default data.");
    return null;
  }

  try {
    // Use Gemini 1.5 Flash (Fast & Free Tier friendly)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const prompt = `Generate 16 diverse, popular, and distinct contenders for a tournament about: "${topic}". 
    For each item, provide a 'name' and a detailed 'imagePrompt'.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const items = JSON.parse(response.text());

    // Transform into the app's internal format
    return items.map((item: any, index: number) => ({
      id: `ai-${index}-${Date.now()}`, // Unique ID
      name: item.name,
      // We use Pollinations.ai (free, no key needed) to generate images on the fly via URL
      imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(item.imagePrompt)}?nologo=true&private=true&model=flux`,
    }));
  } catch (error) {
    console.error("AI Generation Failed:", error);
    return null; // Triggers fallback to hardcoded list
  }
}