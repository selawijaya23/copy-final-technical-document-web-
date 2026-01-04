
import { GoogleGenAI, Type } from "@google/genai";
import { CATEGORY_STRUCTURE } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const suggestMetadata = async (snippet: string) => {
  const categoriesJson = JSON.stringify(CATEGORY_STRUCTURE);
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a technical documentation expert for TM Robot (Techman Robot). 
      Analyze the following article snippet/link and provide highly accurate metadata.
      
      TM Robot Context: Collaborative robots (cobots), AI vision, Palletizing, Welding, and PLC communication.
      
      Available Categories (Structure): ${categoriesJson}
      
      Input: "${snippet}"
      
      Rules:
      1. title: Professional technical title.
      2. mainCategory: MUST be one of the keys in the structure or a highly logical new technical category.
      3. subCategory: MUST be a specific sub-topic related to the main category.
      4. author: Detect the author or suggest 'TM Technical Team'.
      5. description: A concise 1-2 sentence technical summary.
      6. hashtags: Suggest 3-5 relevant technical hashtags (e.g., #AI, #Modbus, #Safety).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            mainCategory: { type: Type.STRING },
            subCategory: { type: Type.STRING },
            author: { type: Type.STRING },
            description: { type: Type.STRING },
            hashtags: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["title", "mainCategory", "author", "hashtags"]
        }
      }
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) {
      throw new Error("No text content returned from the model.");
    }
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return null;
  }
};

export const generateAutoSummary = async (link: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a 1-2 sentence professional technical summary/hook for the following article link. 
      The tone should be engaging for technical professionals on LinkedIn.
      Link: "${link}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING }
          },
          required: ["summary"]
        }
      }
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) return null;
    return JSON.parse(jsonStr).summary;
  } catch (error) {
    console.error("Gemini Summary Error:", error);
    return null;
  }
};
