"use client";

import { GoogleGenAI } from "@google/genai";

// Use process.env.API_KEY directly and align with latest SDK patterns for Gemini 3 series
export const generateWaterAdvice = async (userPrompt: string) => {
  // Initialize instance right before making an API call as per best practices
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: userPrompt,
    config: {
      systemInstruction: `You are floodRIx AI, a senior expert in water resource management. 
      Your tone is professional, technical, and sustainability-focused. 
      You help users with questions about rainwater harvesting, water treatment, flood management, 
      and lake rejuvenation. Keep responses concise but highly informative.`,
      temperature: 0.7,
      // Removed maxOutputTokens to avoid response truncation/errors since thinkingBudget is not explicitly configured
    }
  });

  // response.text is a getter property that returns the generated string
  return response.text;
};