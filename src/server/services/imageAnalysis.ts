<<<<<<< HEAD
import OpenAI from "openai";
=======
import { GoogleGenerativeAI } from "@google/generative-ai";
>>>>>>> 5102279d4bcd3f92ff63fb9ad4df7b2184e19394

interface AnalysisResult {
  theme: string;
  style: string;
  title: string;
  description: string;
  bullets: string[];
  tags: string[];
}

<<<<<<< HEAD
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  return new OpenAI({ apiKey });
}

export async function analyzeImage(imageBuffer: Buffer): Promise<AnalysisResult> {
  const openai = getOpenAIClient();
  const base64Image = imageBuffer.toString("base64");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Cost-effective vision model
    messages: [
      {
        role: "system",
        content: `You are an expert e-commerce product listing specialist. Analyze design images and generate compelling, SEO-optimized product listings for print-on-demand products like t-shirts, hoodies, mugs, and posters.

Your output must be valid JSON with this exact structure:
{
  "theme": "Brief theme description (spiritual, funny, typography, artistic, etc.)",
  "style": "Visual style description (modern, vintage, minimal, bold, etc.)",
  "title": "SEO-optimized product title, 60-80 characters, include key descriptors",
  "description": "2-3 sentence product description that sells the design",
  "bullets": ["Bullet 1", "Bullet 2", "Bullet 3", "Bullet 4", "Bullet 5"],
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"]
}

Guidelines:
- Title: Include design theme, style, and product type hints. Make it catchy and searchable.
- Description: Focus on who would love this, the mood/vibe, and quality.
- Bullets: Highlight design features, ideal recipients, occasions, versatility, and print quality.
- Tags: Mix broad and specific terms. Include style, theme, audience, and occasion keywords.
- Keep language natural and human-sounding, not robotic or keyword-stuffed.`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this design image and generate a complete product listing. Return only valid JSON."
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${base64Image}`,
              detail: "high"
            }
          }
        ]
      }
    ],
    max_tokens: 1000,
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  // Parse JSON from response (handle potential markdown code blocks)
  let jsonStr = content;
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  } else {
    // Try to find JSON object directly
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }
  }

  try {
    const result = JSON.parse(jsonStr) as AnalysisResult;
    
    // Validate required fields
    if (!result.title || !result.description || !result.bullets || !result.tags) {
      throw new Error("Missing required fields in analysis result");
    }
    
    return result;
  } catch (error) {
    console.error("Failed to parse AI response:", content);
=======
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeImage(imageBuffer: Buffer): Promise<AnalysisResult> {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash"
  });

  const base64Image = imageBuffer.toString("base64");

  const prompt = `
You are an expert e-commerce product listing specialist. Analyze design images and generate compelling, SEO-optimized product listings for print-on-demand products like t-shirts, hoodies, mugs, and posters.

Return ONLY valid JSON in this exact structure:

{
  "theme": "Brief theme description",
  "style": "Visual style description",
  "title": "SEO optimized title",
  "description": "2-3 sentence product description",
  "bullets": ["", "", "", "", ""],
  "tags": ["", "", "", "", "", "", "", "", "", ""]
}
`;

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: "image/png",
    },
  };

  const result = await model.generateContent([prompt, imagePart]);

  const text = result.response.text();

  if (!text) {
    throw new Error("No response from Gemini");
  }

  // Extract JSON safely
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    console.error("Gemini raw output:", text);
    throw new Error("No JSON returned from Gemini");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as AnalysisResult;

    if (!parsed.title || !parsed.description || !parsed.bullets || !parsed.tags) {
      throw new Error("Missing required fields in Gemini response");
    }

    return parsed;

  } catch (error) {
    console.error("Failed to parse Gemini response:", text);
>>>>>>> 5102279d4bcd3f92ff63fb9ad4df7b2184e19394
    throw new Error(`Failed to parse image analysis: ${error}`);
  }
}

<<<<<<< HEAD
// Alternative: Use a free/cheaper model for basic analysis
export async function analyzeImageBasic(imageBuffer: Buffer): Promise<AnalysisResult> {
  // This is a fallback that generates generic content
  // Could be replaced with a local model or cheaper API
  
=======
// Fallback (same as before)
export async function analyzeImageBasic(imageBuffer: Buffer): Promise<AnalysisResult> {
>>>>>>> 5102279d4bcd3f92ff63fb9ad4df7b2184e19394
  return {
    theme: "General Design",
    style: "Modern Graphic",
    title: "Unique Graphic Design T-Shirt | Original Artwork Tee",
    description: "Express yourself with this unique graphic design. Perfect for casual wear or making a statement.",
    bullets: [
      "Original graphic design artwork",
      "High-quality print that lasts",
      "Perfect gift for any occasion",
      "Available in multiple sizes and colors",
      "Comfortable everyday wear"
    ],
    tags: [
      "graphic tee",
      "unique design",
      "original art",
      "casual wear",
      "gift idea",
      "trendy",
      "statement shirt",
      "artistic",
      "print on demand",
      "fashion"
    ]
  };
}
