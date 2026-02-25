import { GoogleGenerativeAI } from "@google/generative-ai";

interface AnalysisResult {
  theme: string;
  style: string;
  title: string;
  description: string;
  bullets: string[];
  tags: string[];
}

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
    throw new Error(`Failed to parse image analysis: ${error}`);
  }
}

// Fallback (same as before)
export async function analyzeImageBasic(imageBuffer: Buffer): Promise<AnalysisResult> {
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
