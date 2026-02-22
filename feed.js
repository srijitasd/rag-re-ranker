import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "./src/config/mongo.js";
import Embedding from "./src/models/Embeddings.js";

const BATCH_SIZE = 100; // Process documents in batches of 100
const SKIP_DOCUMENTS = 1000; // Skip the first 1000 documents (already inserted)
const MAX_DOCUMENTS = 10000; // Only insert first 10 documents

const load = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    console.log("Reading and processing data.json in chunks...");

    // Read file in chunks using streams
    const readStream = fs.createReadStream("data.json", {
      encoding: "utf-8",
      highWaterMark: 64 * 1024, // 64KB chunks
    });

    let buffer = "";
    let documentBatch = [];
    let totalProcessed = 0;
    let totalRead = 0;
    let isFirstChunk = true;

    for await (const chunk of readStream) {
      buffer += chunk;

      // Remove opening bracket if first chunk
      if (isFirstChunk) {
        buffer = buffer.trim().replace(/^\[/, "");
        isFirstChunk = false;
      }

      // Process complete JSON objects
      let lastCompleteIndex = -1;
      let bracketCount = 0;

      for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] === "{") bracketCount++;
        if (buffer[i] === "}") {
          bracketCount--;
          if (bracketCount === 0) {
            lastCompleteIndex = i + 1;
          }
        }
      }

      if (lastCompleteIndex === -1) {
        continue; // Wait for more data
      }

      // Extract complete objects
      const completeBuffer = buffer.substring(0, lastCompleteIndex).trim();
      buffer = buffer.substring(lastCompleteIndex).trim();

      // Remove leading comma if present
      if (buffer.startsWith(",")) {
        buffer = buffer.substring(1).trim();
      }

      if (!completeBuffer) continue;

      // Clean and parse the buffer
      const cleanBuffer = completeBuffer
        .replace(/^,+/, "")
        .replace(/,+$/, "")
        .trim();
      if (!cleanBuffer) continue;

      try {
        // Wrap in array and parse
        const jsonString = "[" + cleanBuffer + "]";
        const documents = JSON.parse(jsonString);

        // Skip documents if we haven't reached the starting point yet
        for (const doc of documents) {
          totalRead++;
          if (totalRead <= SKIP_DOCUMENTS) {
            // Skip this document
            continue;
          }
          if (totalProcessed >= MAX_DOCUMENTS) {
            break;
          }
          documentBatch.push(doc);
        }

        // Save in batches
        while (
          documentBatch.length >= BATCH_SIZE &&
          totalProcessed < MAX_DOCUMENTS
        ) {
          const remainingSlots = MAX_DOCUMENTS - totalProcessed;
          const batchSize = Math.min(BATCH_SIZE, remainingSlots);
          const batch = documentBatch.splice(0, batchSize);
          await Embedding.insertMany(batch, { ordered: false });
          totalProcessed += batch.length;
          console.log(
            `Processed ${totalProcessed} documents (skipped ${SKIP_DOCUMENTS})...`,
          );
        }

        // Stop if we've reached the limit
        if (totalProcessed >= MAX_DOCUMENTS) {
          break;
        }
      } catch (parseError) {
        console.error("Error parsing JSON chunk:", parseError.message);
      }
    }

    // Save remaining documents (up to the limit)
    if (documentBatch.length > 0 && totalProcessed < MAX_DOCUMENTS) {
      const remainingSlots = MAX_DOCUMENTS - totalProcessed;
      const batch = documentBatch.splice(0, remainingSlots);
      await Embedding.insertMany(batch, { ordered: false });
      totalProcessed += batch.length;
      console.log(
        `Processed ${totalProcessed} documents (skipped ${SKIP_DOCUMENTS})...`,
      );
    }

    console.log(
      `Successfully loaded ${totalProcessed} documents into MongoDB (skipped first ${SKIP_DOCUMENTS})!`,
    );
    process.exit(0);
  } catch (error) {
    console.error("Error loading data:", error);
    process.exit(1);
  }
};

load();
