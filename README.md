# minirag

A minimal RAG (Retrieval-Augmented Generation) database implementation using Bun.js and SQLite with the sqlite-vec extension for vector similarity search.

Features:
- Store text chunks with metadata and embeddings
- Fast similarity search using cosine distance
- Support for custom metadata types
- Bulk insertion for improved performance
- In-memory or persistent database options

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run 
```

This project was created using `bun init` in bun v1.2.21. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

For more details about the project structure and API, see [overview.md](./overview.md) and [api.md](./api.md).
