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
    model: "gemini-1.5-flash-8b"
  });

  const base64Image = imageBuffer.toString("base64");

  const prompt = `
You are an expert e-commerce product listing specialist.

Analyze this design image and generate compelling SEO optimized listing.

Return ONLY valid JSON in this format:

{
  "theme": "",
  "style": "",
  "title": "",
  "description": "",
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

  const match = text.match(/\{[\s\S]*\}/);

  if (!match) {
    throw new Error("No JSON returned from Gemini");
  }

  const parsed = JSON.parse(match[0]);

  return parsed;
}

export async function analyzeImageBasic(): Promise<AnalysisResult> {
  return {
    theme: "General Design",
    style: "Modern Graphic",
    title: "Unique Graphic Design T-Shirt",
    description: "Express yourself with this unique graphic design.",
    bullets: [
      "Original artwork",
      "High quality print",
      "Perfect gift",
      "Stylish design",
      "Comfortable wear"
    ],
    tags: [
      "graphic",
      "design",
      "tshirt",
      "modern",
      "gift",
      "fashion",
      "art",
      "trendy",
      "unique",
      "print"
    ]
  };
}
