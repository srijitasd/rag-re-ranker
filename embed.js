import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "./src/config/mongo.js";
import Embedding from "./src/models/Embeddings.js";
import { GeminiClient as ai } from "./src/config/index.js";

/**
 * Generate embeddings using Google GenAI API
 * @param {string} text - Text to embed
 * @returns {Promise<Array<number>>} - Embedding vector
 */
const generateEmbedding = async (text) => {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: {
      outputDimensionality: 1536,
    },
  });

  const embeddingLength = response.embeddings[0].values.length;
  console.log(`Length of embedding: ${embeddingLength}`);
  return response.embeddings[0].values;
};

const embed = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    if (!process.env.GOOGLE_API_KEY) {
      console.error("Error: GOOGLE_API_KEY environment variable is not set");
      console.log("Please add GOOGLE_API_KEY to your .env file");
      process.exit(1);
    }

    console.log("Fetching items to embed...");

    // Fetch up to 100 items
    const items = await Embedding.find({
      $or: [{ embedding: { $size: 0 } }, { embedding: { $exists: false } }],
    }).limit(200);

    if (items.length === 0) {
      console.log("No items found to embed.");
      process.exit(0);
      return;
    }

    console.log(`Found ${items.length} items. Generating embeddings...`);

    // Generate embeddings for each item
    for (let i = 0; i < items.length; i++) {
      console.log(`Embedding item ${i + 1}/${items.length}...`);
      console.log(items[i].text);

      const embedding = await generateEmbedding(items[i].text);
      items[i].embedding = embedding;
      await items[i].save();
    }

    console.log("Successfully embedded all items!");

    process.exit(0);
  } catch (error) {
    console.log(error);

    console.error(
      "Error embedding data:",
      error.response?.data || error.message,
    );
    process.exit(1);
  }
};

embed();
