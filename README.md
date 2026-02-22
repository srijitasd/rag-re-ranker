# Re-Ranking Framework

A comprehensive information retrieval framework that combines BM25 keyword search, vector semantic search, and advanced re-ranking techniques to deliver highly relevant search results.

## Features

- **Multiple Search Strategies**
  - BM25 (keyword-based) search using MongoDB Atlas Search
  - Vector (semantic) search with Google Gemini embeddings
  - Hybrid search combining both approaches

- **Advanced Fusion Techniques**
  - Reciprocal Rank Fusion (RRF) for combining search results
  - Configurable fusion parameters

- **Re-Ranking**
  - Integration with Voyage AI for cross-encoder re-ranking
  - Configurable re-ranking models and parameters

- **Flexible Filtering**
  - Support for metadata filtering
  - Tag-based filtering
  - Custom query filters

## Tech Stack

- **Runtime**: Node.js with ES Modules
- **Framework**: Express.js
- **Database**: MongoDB with Atlas Search
- **Embeddings**: Google Gemini AI
- **Re-ranking**: Voyage AI
- **Validation**: Celebrate (Joi-based)

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account with Atlas Search configured
- Google Gemini API key
- Voyage AI API key (optional, for re-ranking)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd re-ranking-framework
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
VOYAGE_API_KEY=your_voyage_api_key
```

## MongoDB Atlas Setup

This project requires MongoDB Atlas Search indexes to be configured:

1. **Vector Search Index**: Configure a vector search index on the `embedding` field
2. **Text Search Index**: Configure a full-text search index for BM25 search

## Project Structure

```
re-ranking-framework/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Express middleware
│   ├── models/          # Mongoose models
│   ├── prompts/         # AI prompts
│   ├── repositories/    # Database access layer
│   ├── routes/          # API routes
│   ├── schema/          # Validation schemas
│   ├── services/        # Business logic
│   └── utils/           # Utility functions
├── data.json            # Sample data
├── embed.js             # Embedding generation script
├── enrich.js            # Data enrichment script
├── feed.js              # Data loading script
└── load.js              # Data import script
```

## API Usage

### Retrieve Endpoint

**Endpoint**: `GET /api/retrieve`

**Query Parameters**:

| Parameter     | Type    | Description                                    | Default           |
| ------------- | ------- | ---------------------------------------------- | ----------------- |
| `q`           | string  | Search query (required)                        | -                 |
| `strategy`    | string  | Search strategy: `bm25`, `vector`, or `hybrid` | `hybrid`          |
| `topK`        | number  | Number of results to return                    | 10                |
| `rerank`      | boolean | Enable Voyage AI re-ranking                    | false             |
| `fusion`      | string  | Fusion method for hybrid search                | `rrf`             |
| `model`       | string  | Voyage AI model for re-ranking                 | `rerank-2.5-lite` |
| `preRerankK`  | number  | Number of candidates to rerank                 | 50                |
| `maxDocChars` | number  | Max characters per document for reranking      | 1500              |

### Examples

**Basic BM25 Search**:

```bash
curl "http://localhost:3000/api/retrieve?q=machine%20learning&strategy=bm25&topK=5"
```

**Vector Search**:

```bash
curl "http://localhost:3000/api/retrieve?q=artificial%20intelligence&strategy=vector&topK=10"
```

**Hybrid Search with Re-ranking**:

```bash
curl "http://localhost:3000/api/retrieve?q=neural%20networks&strategy=hybrid&topK=10&rerank=true"
```

**Response Format**:

```json
{
  "success": true,
  "query": "machine learning",
  "strategy": "hybrid",
  "count": 10,
  "results": [
    {
      "_id": "...",
      "text": "Document content...",
      "title": "Document title",
      "tags": ["ai", "ml"],
      "fusedScore": 0.95,
      "rerankScore": 0.98,
      "rank": 1,
      "meta": {},
      "createdAt": "2026-02-22T00:00:00.000Z"
    }
  ]
}
```

## Data Pipeline Scripts

### 1. Load Data

```bash
node load.js
```

Loads data from `data.json` into MongoDB.

### 2. Generate Embeddings

```bash
node embed.js
```

Generates vector embeddings for documents using Google Gemini.

### 3. Enrich Data

```bash
node enrich.js
```

Enriches documents with additional metadata (tags, classifications, etc.).

### 4. Feed Data

```bash
node feed.js
```

Combined script for loading and processing data.

## Development

Start the development server with auto-reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

## Search Strategies

### BM25 Search

Traditional keyword-based search using MongoDB Atlas Search's text search capabilities. Best for exact matches and keyword queries.

### Vector Search

Semantic search using vector embeddings generated by Google Gemini. Best for conceptual similarity and understanding query intent.

### Hybrid Search

Combines BM25 and vector search using Reciprocal Rank Fusion (RRF). Provides balanced results leveraging both keyword relevance and semantic similarity.

#### Reciprocal Rank Fusion (RRF)

The fusion algorithm combines rankings from multiple search strategies:

```
fusedScore = Σ(1 / (k + rank))
```

where `k` is a constant (default: 60) and `rank` is the position in each result list.

## Re-Ranking

The framework supports optional re-ranking using Voyage AI's cross-encoder models, which can significantly improve result relevance by:

1. Taking top-K candidates from initial search
2. Computing precise relevance scores using cross-encoder
3. Re-ordering results based on relevance scores

Available models:

- `rerank-2.5`: High accuracy
- `rerank-2.5-lite`: Faster, lower cost

## Configuration

### Environment Variables

| Variable         | Description               | Required                     |
| ---------------- | ------------------------- | ---------------------------- |
| `PORT`           | Server port               | No (default: 3000)           |
| `MONGODB_URI`    | MongoDB connection string | Yes                          |
| `GEMINI_API_KEY` | Google Gemini API key     | Yes                          |
| `VOYAGE_API_KEY` | Voyage AI API key         | No (required for re-ranking) |

## Error Handling

The API uses standard HTTP status codes:

- `200`: Success
- `400`: Bad Request (validation error)
- `500`: Internal Server Error

All responses include a `success` field indicating the operation status.

## Performance Considerations

- **Embedding Generation**: Cached in database to avoid regeneration
- **Re-ranking**: Only applied when explicitly requested due to API cost
- **Top-K Limiting**: Configure `preRerankK` and `topK` to balance quality and performance
- **Text Truncation**: Documents are truncated before re-ranking to reduce API payload size

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue in the repository.
