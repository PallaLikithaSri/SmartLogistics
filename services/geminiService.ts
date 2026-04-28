import { GoogleGenAI } from "@google/genai";

// Ensure the API key is available
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const analyzeDamageImage = async (base64Image: string): Promise<string> => {
  if (!apiKey) return "API Key missing. Cannot analyze image.";

  try {
    const model = 'gemini-2.5-flash-image';
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: "Analyze this image for building or vehicle damage. Describe the damage severity and potential cause briefly."
          }
        ]
      }
    });
    return response.text || "No analysis available.";
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "Failed to analyze image.";
  }
};

export const generateShiftSummary = async (logs: string): Promise<string> => {
    if (!apiKey) return "API Key missing.";
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Summarize these daily shift logs into a concise bulleted report for the admin: ${logs}`
        });
        return response.text || "Could not generate summary.";
    } catch (e) {
        console.error(e);
        return "Error generating summary.";
    }
}
