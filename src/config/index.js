import dotenv from "dotenv";
dotenv.config();

import { GoogleGenAI } from "@google/genai";

// Singleton instance - cached to avoid recreating the client
let cachedGeminiClient = null;

/**
 * Get or create the cached Gemini client instance
 * @returns {GoogleGenAI} Cached Gemini client
 */
export const getGeminiClient = () => {
  if (!cachedGeminiClient) {
    cachedGeminiClient = new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY,
    });
  }
  return cachedGeminiClient;
};

// For direct import compatibility
export const GeminiClient = getGeminiClient();
