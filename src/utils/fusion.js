/**
 * Reciprocal Rank Fusion (RRF)
 *
 * @param {Array} bm25Hits - [{chunkId, rank, bm25Score, text, ...}]
 * @param {Array} vectorHits - [{chunkId, rank, vectorScore, text, ...}]
 * @param {Object} opts
 * @param {number} opts.k0 - RRF constant (default 60)
 * @param {number} opts.topK - how many fused results to return
 */
const fuseRRF = (bm25Hits = [], vectorHits = [], opts = {}) => {
  const k0 = Number.isFinite(opts.k0) ? opts.k0 : 60;
  const topK = Number.isFinite(opts.topK) ? opts.topK : 10;

  const map = new Map();

  const addList = (hits, source) => {
    for (let i = 0; i < hits.length; i++) {
      const h = hits[i];
      const key = String(h._id);
      const rank = h.rank ?? i + 1;

      if (!map.has(key)) {
        map.set(key, {
          _id: h._id,
          text: h.text,
          bm25Score: undefined,
          vectorScore: undefined,
          fusedScore: 0,
          title: h.title,
          tags: h.tags,
          ranks: {},
        });
      }

      const row = map.get(key);

      // keep text if one list has it and the other doesn't
      if (!row.text && h.text) row.text = h.text;

      // store original scores too (for debugging/dashboard)
      if (source === "bm25") row.bm25Score = h.bm25Score;
      if (source === "vector") row.vectorScore = h.vectorScore;

      row.ranks[source] = rank;
      row.fusedScore += 1 / (k0 + rank);
    }
  };

  addList(bm25Hits, "bm25");
  addList(vectorHits, "vector");

  console.log(map.size);

  const fused = Array.from(map.values())
    .sort((a, b) => b.fusedScore - a.fusedScore)
    .slice(0, topK)
    .map((x, idx) => ({ ...x, rank: idx + 1 }));

  return fused;
};

/**
 * Fuse BM25 and vector search results using the specified method.
 *
 * @param {Array} bm25Hits
 * @param {Array} vectorHits
 * @param {Object} opts
 * @param {string} opts.method - fusion method ("rrf" | "weighted", default "rrf")
 * @param {number} opts.topK - how many fused results to return
 * @returns {Array}
 */
export const fuseResults = (bm25Hits, vectorHits, opts = {}) => {
  const method = opts.method || "rrf"; // "rrf" | "weighted"
  const topK = opts.topK ?? 10;

  if (method === "weighted") {
    return fuseWeighted(bm25Hits, vectorHits, {
      wBm25: opts.wBm25 ?? 0.4,
      wVector: opts.wVector ?? 0.6,
      topK,
    });
  }

  return fuseRRF(bm25Hits, vectorHits, {
    k0: opts.k0 ?? 60,
    topK,
  });
};
