import Embedding from "../models/Embeddings.js";

export const retrieveBM25Repo = async (query, k = 10, match = {}) => {
  console.log(JSON.stringify(match, null, 2));

  const pipeline = [
    {
      $search: {
        index: "bm25", // <-- set your Atlas Search index name
        text: {
          query,
          path: {
            wildcard: "*",
          },
        },

        // OPTIONAL: Atlas Search filter (more efficient than $match)
        // You can add this later once your filters are stable.
        // filter: { equals: { path: "meta.source", value: "docs" } }
      },
    },

    // apply standard Mongo filters after $search (works fine)
    Object.keys(match).length ? { $match: match } : null,

    { $limit: k },

    {
      $project: {
        _id: 1,
        text: 1,
        title: 1,
        tags: 1,
        bm25Score: { $meta: "searchScore" },
        createdAt: 1,
        meta: 1,
      },
    },
  ].filter(Boolean);

  const rows = await Embedding.aggregate(pipeline);

  return rows;
};

export const retrieveVectorRepo = async (
  queryEmbedding,
  k = 10,
  match = {},
) => {
  const pipeline = [
    {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: k,
        limit: k,
      },
    },

    Object.keys(match).length ? { $match: match } : null,

    { $limit: k },

    {
      $project: {
        _id: 1,
        text: 1,
        title: 1,
        tags: 1,
        vectorScore: { $meta: "vectorSearchScore" },
        createdAt: 1,
        meta: 1,
      },
    },
  ].filter(Boolean);

  const rows = await Embedding.aggregate(pipeline);
  return rows;
};
