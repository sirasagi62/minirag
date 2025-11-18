# veqlite

A simple vector database library written in TypeScript using SQLite with the sqlite-vec extension.

## Features
- Store text chunks with metadata and embeddings
- High-level integration with @huggingface/transformers
- Fast similarity search using cosine distance
- Support for custom metadata types
- Bulk insertion for improved performance
- In-memory or persistent database options
- Multiple runtime support (Bun, Node.js)

For more details about the project structure and API, see [overview.md](./overview.md) and [api.md](./api.md).

## Usage Example

```typescript
import { VeqliteDB, HFLocalEmbeddingModel } from "veqlite";

import { PGLiteAdapter } from "veqlite/pglite"
// import { BunSQLiteAdapter } from "veqlite/bun";
// import { NodeSQLiteAdapter } from "veqlite/node"
// import { BetterSqlite3Adapter } from "veqlite/better-sqlite3"
// Simple example of using veqlite
async function main() {
  // Initialize the embedding model
  const embeddingModel = await HFLocalEmbeddingModel.init(
    "sirasagi62/granite-embedding-107m-multilingual-ONNX",
    384,
    "q8"
  );

  // On macOS with Bun (requires custom SQLite dylib)
  // const bunsqlite = new BunSQLiteAdapter(":memory:", "/opt/homebrew/lib/libsqlite3.dylib");
  // On other platforms with Bun
  // const bunsqlite = new BunSQLiteAdapter(":memory:");
  // With PGLite (PostgreSQL with pgvector)
  const dbAdapter = new PGLiteAdapter(":memory:");
  // Create RAG database instance
  const rag = await VeqliteDB.init(embeddingModel, bunsqlite, {
    embeddingDim: 384
  });

  // Add some documents
  await rag.insertChunk({
    content: "TypeScript is a typed superset of JavaScript",
    filepath: "typescript-intro"
  });
  await rag.insertChunk({
    content: "RAG stands for Retrieval Augmented Generation",
    filepath: "rag-intro"
  });
  await rag.insertChunk({
    content: "Veqlite is a simple RAG implementation in TypeScript",
    filepath: "veqlite-intro"
  });

  const query = "What is RAG?";
  console.log(`Query: ${query}`);
  // Query the system
  const results = await rag.searchSimilar(query);

  console.log("🎉 Search results:");
  results.forEach((r, i) => {
    console.log(`#${i + 1}: ${r.content}`);
    console.log(`   Similarity score: ${r.distance.toFixed(4)}`);
    console.log(`   File: ${r.filepath}\n`);
  });

  // Close the database
  rag.close();
}

main().catch(console.error);
```

### Output
```
Query: "What is RAG?"
Searching for similar content...

🎉 Search results:
#1: RAG stands for Retrieval Augmented Generation
   Similarity score: 0.2203
   File: rag-intro

#2: Veqlite is a simple RAG implementation in TypeScript
   Similarity score: 0.3020
   File: veqlite-intro

#3: TypeScript is a typed superset of JavaScript
   Similarity score: 0.4220
   File: typescript-intro
```

### Run the example
```bash
bun run examples/simple.ts
```

## Adapter Selection Guide

VeqliteDB supports multiple SQLite adapter implementations depending on your runtime environment:

| Runtime | Adapter | Installation | Notes |
|--------|--------|-------------|-------|
| Bun | `BunSQLiteAdapter` | Built-in | On macOS, specify path to `libsqlite3.dylib` |
| Node.js | `NodeSQLiteAdapter` | Built-in | Requires Node v24+ |
| Node.js (high performance) | `BetterSqlite3Adapter` | `npm install better-sqlite3` | Native bindings, faster bulk operations |

### Example Adapter Usage

**BunSQLiteAdapter (Bun runtime)**
```typescript
import { BunSQLiteAdapter } from "veqlite/bun";

// On macOS
const adapter = new BunSQLiteAdapter(":memory:", "/opt/homebrew/lib/libsqlite3.dylib");
// On other platforms
const adapter = new BunSQLiteAdapter(":memory:");
```

**NodeSQLiteAdapter (Node.js runtime)**
```typescript
import { NodeSQLiteAdapter } from "veqlite/node";

const adapter = new NodeSQLiteAdapter("chunks.db");
```

**BetterSqlite3Adapter (Node.js runtime)**
```typescript
import { BetterSqlite3Adapter } from "veqlite/better-sqlite3";

const adapter = new BetterSqlite3Adapter("chunks.db");
```

## Installation

```bash
# For Bun or Node.js with built-in SQLite
npm install veqlite

# For Node.js with better-sqlite3 (recommended for high performance)
npm install veqlite better-sqlite3
```

## Development

We use `bun` to develop the library.

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build the library
bun run build
```

This project was created using `bun init`. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
