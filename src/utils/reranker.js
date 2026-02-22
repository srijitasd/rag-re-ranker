const VOYAGE_BASE_URL = "https://api.voyageai.com/v1";

function trimText(text, maxChars) {
  if (!text) return "";
  const t = String(text);
  if (t.length <= maxChars) return t;
  return t.slice(0, maxChars);
}

/**
 * Cross-encoder reranking using Voyage AI rerank endpoint.
 *
 * @param {string} query
 * @param {Array} candidates - [{chunkId, text, fusedScore, ...}]
 * @param {Object} opts
 * @param {string} opts.model - "rerank-2.5" | "rerank-2.5-lite" | etc
 * @param {number} opts.preRerankK - how many candidates to rerank (default 50)
 * @param {number} opts.topK - return topK after rerank (default 10)
 * @param {number} opts.maxDocChars - trim each candidate text (default 1500)
 */
export async function voyageRerank(query, candidates = [], opts = {}) {
  const model = opts.model || "rerank-2.5-lite";
  const preRerankK = Number.isFinite(opts.preRerankK) ? opts.preRerankK : 50;
  const topK = Number.isFinite(opts.topK) ? opts.topK : 10;
  const maxDocChars = Number.isFinite(opts.maxDocChars)
    ? opts.maxDocChars
    : 1500;

  const sliced = candidates.slice(0, preRerankK);

  // Prepare docs array (order matters; Voyage returns indices into this list)
  const docs = sliced.map((c) => trimText(c.text, maxDocChars));

  // Guard: avoid sending empty docs
  // (If you have empty texts, it's a pipeline bug; but we handle it gracefully.)
  const nonEmptyCount = docs.filter(Boolean).length;
  if (nonEmptyCount === 0) return candidates.slice(0, topK);

  const payload = {
    query,
    documents: docs,
    model,
    top_k: Math.min(topK, docs.length),
  };

  const started = Date.now();

  //   const resp = await fetch(`${VOYAGE_BASE_URL}/rerank`, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
  //     },
  //     body: JSON.stringify(payload),
  //   });

  //   if (!resp.ok) {
  //     const text = await resp.text().catch(() => "");
  //     const err = new Error(
  //       `Voyage rerank failed: ${resp.status} ${resp.statusText} ${text}`,
  //     );
  //     err.status = resp.status;
  //     throw err;
  //   }

  //   const data = await resp.json();

  const data = {
    object: "list",
    data: [
      {
        relevance_score: 0.66015625,
        index: 0,
      },
      {
        relevance_score: 0.33203125,
        index: 4,
      },
      {
        relevance_score: 0.326171875,
        index: 2,
      },
      {
        relevance_score: 0.294921875,
        index: 5,
      },
      {
        relevance_score: 0.291015625,
        index: 3,
      },
      {
        relevance_score: 0.287109375,
        index: 1,
      },
    ],
    model: "rerank-2.5-lite",
    usage: {
      total_tokens: 1018,
    },
  };

  // Voyage returns something like: { results: [{ index, relevance_score, ...}, ...] }
  const results = Array.isArray(data?.data) ? data.data : [];

  // Attach scores to sliced candidates using returned index
  const scored = results
    .map((r, rank) => {
      const idx = r.index;
      const rel = r.relevance_score;

      const base = sliced[idx];
      if (!base) return null;

      return {
        ...base,
        rerankScore: Number(rel),
        rerankRank: rank + 1,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.rerankScore ?? 0) - (a.rerankScore ?? 0))
    .slice(0, topK);

  const latencyMs = Date.now() - started;

  return { reranked: scored, rerankLatencyMs: latencyMs, model };
}
