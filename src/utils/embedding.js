import { GeminiClient } from "../config/index.js";

export const geminiEmbed = async (text) => {
  const response = await GeminiClient.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: {
      outputDimensionality: 1536,
    },
  });
  return response.embeddings[0].values;
};
