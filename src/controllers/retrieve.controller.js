import {
  hybridSearchService,
  retrieveBM25Service,
  retrieveVectorService,
} from "../services/retrieve.service.js";

/**
 * Handler for /retrieve endpoint
 */
export const retrieveController = async (req, res) => {
  try {
    const { q, strategy, topK = 10 } = req.query;

    let results = [];

    if (strategy === "bm25") {
      results = await retrieveBM25Service(q, topK);
    } else if (strategy === "vector") {
      results = await retrieveVectorService(q, topK);
    } else {
      results = await hybridSearchService(q, topK, req.query);
    }

    return res.status(200).json({
      success: true,
      query: q,
      strategy,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Error in retrieveController:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};
