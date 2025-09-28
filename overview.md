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

veqlite follows a simple and focused architecture:

- **Core Database**: Built on Bun's native SQLite support with sqlite-vec extension for vector operations
- **Schema Design**: Uses two main components - a regular table for storing chunk data and a virtual table for vector indexing
- **Data Flow**: Text chunks with embeddings are inserted into the chunks table, with triggers automatically synchronizing the vector index
- **Search Mechanism**: Utilizes SQLite's MATCH operator with the vec_index virtual table to perform KNN (k-nearest neighbors) searches

The design prioritizes simplicity and performance, avoiding unnecessary abstractions while providing essential RAG functionality. The use of generics allows for type-safe extension of metadata while maintaining flexibility.

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
├── src/                     # Source
│   ├── db.ts                # Core RAG database implementation
│   ├── embedding.ts         # Embedding generation and management
│   └── index.ts             # index.ts
├── tests/                   # Test suite
│   └── rag.test.ts          # Unit tests for RAG functionality
├── api.md                   # API documentation
├── overview.md              # Project overview (this file)
├── README.md                # Project quick start guide
├── package.json             # Project metadata and dependencies
├── bun.lock                 # Bun lockfile
├── tsconfig.json            # TypeScript configuration
└── tsup.config.ts           # Build configuration for tsup
```

### Key Files

- **src/db.ts**: Contains the main `RAGDatabase` class implementation with all core functionality including chunk insertion, bulk insertion, and similarity search.
- **src/embedding.ts**: Handles embedding generation and management, providing utilities for text vectorization.
- **tests/rag.test.ts**: Comprehensive tests verifying database initialization, chunk insertion, search functionality, and bulk operations.
- **api.md**: Detailed documentation of the public API with usage examples.
- **README.md**: Quick start guide with installation and basic usage instructions.
- **package.json**: Defines project dependencies and metadata.
- **tsup.config.ts**: Configuration for building/distributing the package if needed.
