export const buildMongoFilters = (filters = {}) => {
  const match = { title: { $exists: true } }; // Ensure title exists for BM25 search

  // Example supported filters (add as needed)
  // filters.createdAfter = ISO date string
  if (filters.createdAfter) {
    match.createdAt = match.createdAt || {};
    match.createdAt.$gte = new Date(filters.createdAfter);
  }

  if (filters.createdBefore) {
    match.createdAt = match.createdAt || {};
    match.createdAt.$lte = new Date(filters.createdBefore);
  }

  // Example: filters.meta = { source: "docs", tag: "finance" }
  // becomes: { "meta.source": "docs", "meta.tag": "finance" }
  if (filters.meta && typeof filters.meta === "object") {
    for (const [k, v] of Object.entries(filters.meta)) {
      match[`meta.${k}`] = v;
    }
  }

  // Example: filters.ids = ["...","..."]
  if (Array.isArray(filters.ids) && filters.ids.length) {
    match._id = { $in: filters.ids };
  }

  return match;
};
