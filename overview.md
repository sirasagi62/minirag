# Project Overview

## Purpose

veqlite is a minimal implementation of a Retrieval-Augmented Generation (RAG) database system built on Bun.js and SQLite. It provides a lightweight solution for storing text chunks with vector embeddings and performing fast similarity searches using cosine distance. The project is designed to be simple, efficient, and easy to integrate into applications that require semantic search capabilities.

The core functionality enables developers to:
- Store documents or text chunks with their vector embeddings
- Perform fast similarity searches to find relevant content
- Extend metadata with custom fields as needed
- Use in-memory or persistent storage options

This implementation leverages SQLite's virtual table extensions through sqlite-vec to provide efficient vector similarity search capabilities without requiring external services or complex infrastructure.

## Project Structure

veqlite follows a modular and extensible architecture that supports multiple database backends:

- **Multi-Database Support**: Unified interface for both SQLite (with sqlite-vec) and PostgreSQL (with pgvector via PGLite)
- **Database Abstraction**: Uses `IDatabaseDriver` interface to abstract database operations, enabling seamless switching between SQLite and PGLite
- **Vector Engine Strategy**: Implements separate vector engines (`SQLiteVectorEngine` and `PGLiteVectorEngine`) that adapt to the underlying database system
- **Schema Design**:
  - For SQLite: Uses a regular table with triggers synchronizing to a virtual table (vec0) for vector operations
  - For PGLite: Uses a regular table with pgvector extension and HNSW index for efficient similarity search
- **Data Flow**: Text chunks with embeddings are inserted through the vector engine, which handles database-specific storage details
- **Search Mechanism**:
  - SQLite: Uses MATCH operator with vec_index virtual table for KNN search
  - PGLite: Uses cosine distance operator (<=>) with HNSW index for efficient similarity search

The design prioritizes flexibility and performance across different database systems while maintaining a consistent API. The use of generics enables type-safe extension of metadata, and the driver-based architecture allows for easy integration with different runtimes and database preferences.
## Dependencies

### Runtime Dependencies

- **sqlite-vec** (^0.1.7-alpha.2): SQLite extension that provides vector similarity search capabilities through virtual tables. This enables efficient cosine distance calculations and KNN searches directly within SQLite.

### Development Dependencies

- **@types/bun** (^1.2.22): TypeScript type definitions for Bun runtime
- **tsup** (^8.5.0): Fast TypeScript bundler and build tool

### Peer Dependencies

- **typescript** (^5): Required for type checking and compilation

The dependency list is intentionally minimal, focusing on essential components for the RAG functionality. Bun serves as the runtime environment, providing a fast JavaScript/TypeScript runtime with built-in SQLite support, while sqlite-vec adds the vector search capabilities needed for semantic similarity.

## File Structure

```
veqlite/
├── examples
│  └── simple.ts
├── overview.md
├── package.json
├── README.md
├── src
│  ├── db.ts
│  ├── drivers
│  │  ├── BetterSqlite3SQLiteDriver.ts
│  │  ├── BunSQLiteDriver.ts
│  │  ├── NodeSQLiteDriver.ts
│  │  └── PGLiteDriver.ts
│  ├── embedding.ts
│  ├── engines
│  │  ├── PGLiteVectorEngine.ts
│  │  └── SQLiteVectorEngine.ts
│  ├── index.ts
│  └── types.ts
├── tests
│  └── rag.test.ts
├── tsconfig.json
└── tsup.config.ts
```

### Key Files

- **src/db.ts**: Contains the main `VeqliteDB` class that orchestrates the embedding model, database driver, and vector engine. Implements the high-level API for chunk
operations and similarity search.
- **src/embedding.ts**: Handles embedding generation and management, providing utilities for text vectorization with Hugging Face models.
- **src/drivers/**: Contains database driver implementations (`BunSQLiteAdapter`, `NodeSQLiteAdapter`, `BetterSqlite3Adapter`, `PGLiteAdapter`) that implement the
`IDatabaseDriver` interface for different runtimes and database systems.
- **src/engines/**: Contains vector database engines (`SQLiteVectorEngine`, `PGLiteVectorEngine`) that implement database-specific schema initialization and operations for
vector similarity search.
- **tests/rag.test.ts**: Comprehensive tests verifying database initialization, chunk insertion, search functionality, and bulk operations.
- **api.md**: Detailed documentation of the public API with usage examples.
- **README.md**: Quick start guide with installation and basic usage instructions, including adapter selection guide for different runtimes.
- **package.json**: Defines project dependencies and metadata.
- **tsup.config.ts**: Configuration for building/distributing the package if needed.
