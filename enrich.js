import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import { connectDB } from "./src/config/mongo.js";
import Embedding from "./src/models/Embeddings.js";

import { GeminiClient as ai } from "./src/config/index.js";

const BATCH_SIZE = 100; // Process documents in batches of 100

// Read the prompt template
const PROMPT_TEMPLATE = fs.readFileSync(
  "./src/prompts/tags_extractor.txt",
  "utf-8",
);

/**
 * Generate title and tags using Gemini
 * @param {string} text - Financial text to analyze
 * @returns {Promise<{title: string, tags: string[]}>} - Title and tags
 */
const generateTitleAndTags = async (text) => {
  const prompt = `${PROMPT_TEMPLATE}\n\nFinancial text:\n${text}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
  });

  const responseText = response.text.trim();

  // Remove markdown code blocks if present
  let jsonText = responseText;
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  // Parse and validate the response
  const parsed = JSON.parse(jsonText);

  if (!parsed.title || typeof parsed.title !== "string") {
    throw new Error("Invalid response: missing or invalid title");
  }

  if (!Array.isArray(parsed.tags)) {
    throw new Error("Invalid response: tags must be an array");
  }

  if (parsed.tags.length > 10) {
    throw new Error("Invalid response: too many tags (max 10)");
  }

  return {
    title: parsed.title,
    tags: parsed.tags,
  };
};

const enrich = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    if (!process.env.GOOGLE_API_KEY) {
      console.error("Error: GOOGLE_API_KEY environment variable is not set");
      console.log("Please add GOOGLE_API_KEY to your .env file");
      process.exit(1);
    }

    console.log("Fetching items to enrich...");

    // Fetch up to BATCH_SIZE items where title does not exist
    const items = await Embedding.find({
      $or: [{ title: { $exists: false } }, { title: null }, { title: "" }],
    }).limit(BATCH_SIZE);

    if (items.length === 0) {
      console.log("No items found to enrich.");
      process.exit(0);
      return;
    }

    console.log(`Found ${items.length} items. Generating titles and tags...`);

    let successCount = 0;
    let errorCount = 0;

    // Generate title and tags for each item
    for (let i = 0; i < items.length; i++) {
      try {
        console.log(`\n[${i + 1}/${items.length}] Processing item...`);
        console.log(`Text preview: ${items[i].text.substring(0, 100)}...`);

        const result = await generateTitleAndTags(items[i].text);

        items[i].title = result.title;
        items[i].tags = result.tags;
        await items[i].save();

        console.log(`✓ Title: ${result.title}`);
        console.log(`✓ Tags: ${result.tags.join(", ")}`);
        successCount++;
      } catch (error) {
        console.error(
          `✗ Error processing item ${i + 1}:`,
          error.message || error,
        );
        errorCount++;
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Successfully enriched: ${successCount} items`);
    console.log(`Failed: ${errorCount} items`);
    console.log(`Total processed: ${items.length} items`);

    process.exit(0);
  } catch (error) {
    console.error("Error enriching data:", error.message || error);
    process.exit(1);
  }
};

enrich();
