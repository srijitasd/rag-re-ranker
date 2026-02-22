import { Schema, model } from "mongoose";

const embeddingSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    title: {
      type: String,
    },
    tags: {
      type: [String],
    },
  },
  {
    timestamps: true,
  },
);

export default model("embeddings", embeddingSchema);
