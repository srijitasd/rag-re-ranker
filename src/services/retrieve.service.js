import {
  retrieveBM25Repo,
  retrieveVectorRepo,
} from "../repositories/retrieve.repo.js";

import { buildMongoFilters } from "../utils/mongo.js";
import { geminiEmbed } from "../utils/embedding.js";
import { fuseResults } from "../utils/fusion.js";
import { voyageRerank } from "../utils/reranker.js";

/**
 * BM25-ish retrieval using MongoDB Atlas Search ($search.text).
 *
 * @param {string} query
 * @param {number} k
 * @param {object} filters - optional
 * @returns {Promise<Array>} candidates
 */
export async function retrieveBM25Service(query, k = 10, filters = {}) {
  if (!query || !query.trim()) return [];

  const match = buildMongoFilters(filters);

  const rows = await retrieveBM25Repo(query, k, match);

  // normalize output format
  return rows.map((r, i) => ({
    _id: r._id,
    text: r.text,
    bm25Score: r.bm25Score ?? 0,
    title: r.title,
    tags: r.tags,
    rank: i + 1,
    meta: r.meta,
    createdAt: r.createdAt,
  }));
}

/**
 * Vector retrieval using MongoDB Atlas Search ($search knn).
 *
 * @param {string} query
 * @param {number} k
 * @param {object} filters - optional
 * @returns {Promise<Array>} candidates
 */
export const retrieveVectorService = async (query, k = 10, filters = {}) => {
  if (!query || !query.trim()) return [];

  const match = buildMongoFilters(filters);

  const queryEmbedding = await geminiEmbed(query);

  console.log(queryEmbedding.length);

  const rows = await retrieveVectorRepo(queryEmbedding, k, match);

  return rows.map((r, i) => ({
    _id: r._id,
    text: r.text,
    title: r.title,
    tags: r.tags,
    vectorScore: r.vectorScore ?? 0,
    rank: i + 1,
    meta: r.meta,
    createdAt: r.createdAt,
  }));
};

/**
 * Hybrid search using MongoDB Atlas Search ($search knn) and BM25.
 *
 * @param {string} query
 * @param {number} k
 * @param {object} filters - optional
 * @returns {Promise<Array>} candidates
 */
export const hybridSearchService = async (query, k = 10, filters = {}) => {
  if (!query || !query.trim()) return [];

  let results = [];

  const bm25Results = await retrieveBM25Service(query, k, filters);
  const vectorResults = await retrieveVectorService(query, k, filters);

  const fusedResults = fuseResults(bm25Results, vectorResults, {
    method: filters.fusion || "rrf",
    topK: k,
  });

  if (filters.rerank) {
    console.log("Re-ranking using voyage");

    const rerankResults = await voyageRerank(query, fusedResults, {
      model: filters.model,
      preRerankK: filters.preRerankK,
      topK: k,
      maxDocChars: filters.maxDocChars,
    });

    return rerankResults.reranked.map((r, i) => ({
      _id: r._id,
      text: r.text,
      title: r.title,
      tags: r.tags,
      fusedScore: r.fusedScore ?? 0,
      rank: i + 1,
      rerankScore: r.rerankScore ?? 0,
      rerankRank: r.rerankRank ?? 0,
      meta: r.meta,
      createdAt: r.createdAt,
    }));
  }

  return fusedResults.map((r, i) => ({
    _id: r._id,
    text: r.text,
    title: r.title,
    tags: r.tags,
    fusedScore: r.fusedScore ?? 0,
    rank: i + 1,
    meta: r.meta,
    createdAt: r.createdAt,
  }));
};
