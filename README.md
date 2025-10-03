# veqlite

A simple vector database library written in TypeScript using SQLite with the sqlite-vec extension.

Features:
- Store text chunks with metadata and embeddings
- High-level integration with @huggingface/transformers
- Fast similarity search using cosine distance
- Support for custom metadata types
- Bulk insertion for improved performance
- In-memory or persistent database options


For more details about the project structure and API, see [overview.md](./overview.md) and [api.md](./api.md).

# example
```typescript
import { VeqliteDB, HFLocalEmbeddingModel } from "veqlite";

// Simple example of using veqlite
async function main() {
  // Initialize the embedding model
  const embeddingModel = await HFLocalEmbeddingModel.init(
    "sirasagi62/granite-embedding-107m-multilingual-ONNX",
    384,
    "q8"
  );

  // Create RAG database instance
  const rag = new VeqliteDB(embeddingModel, {
    // Use in-memory database
    embeddingDim: 384,
    dbPath: ":memory:"
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
    content: "Minirag is a simple RAG implementation in TypeScript",
    filepath: "veqlite-intro"
  });

  const query = "What is RAG?"
  console.log(`Query: ${query}`)
  // Query the system
  const results = await rag.searchSimilar(query);
  results.forEach(r => {
    console.log(`${r.content}: ${r.distance}`)
  })

  // Close the database
  rag.close();
}

main().catch(console.error);
```

Output:
```
Query: What is RAG?
RAG stands for Retrieval Augmented Generation: 0.22028076648712158
Minirag is a simple RAG implementation in TypeScript: 0.23143449425697327
TypeScript is a typed superset of JavaScript: 0.42197686433792114
```

To run the example:

```bash
bun run examples/simple.ts
```

# install

You can use the library on Node.js/bun.

```bash
npm install veqlite

pnpm install veqlite

bun add veqlite
```

# development
We use `bun` to develop the library.

To install dependencies:

```bash
bun install
```

This project was created using `bun init` in bun v1.2.21. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
