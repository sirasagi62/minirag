# API Documentation

## RAGDatabase<T>

A minimal RAG (Retrieval-Augmented Generation) database implementation using SQLite with the sqlite-vec extension for vector similarity search.

### Constructor

```typescript
constructor(options: RAGOptions = {})
```

Initializes a new RAG database instance.

**Parameters:**
- `options.dbPath` (string, optional): Path to the SQLite database file. Defaults to "chunks.db". Use ":memory:" for in-memory database.
- `options.embeddingDim` (number, optional): Dimension of the embeddings. Defaults to 384.

**Example:**

```typescript
// Create an in-memory database with custom embedding dimension
const ragDb = new RAGDatabase({
  dbPath: ":memory:",
  embeddingDim: 2 // for testing purposes
});
```

### insertChunk()

```typescript
insertChunk(chunk: ChunkRow<T>): number
```

Inserts a single chunk into the database.

**Parameters:**
- `chunk.content` (string): The text content to store
- `chunk.filepath` (string): Path or identifier for the source
- `chunk.embedding` (Float32Array): Vector embedding of the content
- Other properties: Additional metadata fields

**Returns:** The ID of the inserted chunk.

**Example:**

```typescript
const embedding = new Float32Array(2);
embedding[0] = 1.0;
embedding[1] = 0.5;

const chunk = {
  content: "This is a test chunk",
  filepath: "/test/file.ts",
  category: "documentation",
  tags: ["test", "example"],
  embedding
};

const id = ragDb.insertChunk(chunk);
console.log(`Inserted chunk with ID: ${id}`); // Output: Inserted chunk with ID: 1
```

### bulkInsertChunks()

```typescript
bulkInsertChunks(chunks: ChunkRow<T>[], batchSize = 500)
```

Inserts multiple chunks into the database in batches for improved performance.

**Parameters:**
- `chunks`: Array of chunk objects to insert
- `batchSize` (optional): Number of chunks to insert in each transaction. Defaults to 500.

**Example:**

```typescript
const chunks = [
  {
    content: "First test chunk",
    filepath: "/test/file1.ts",
    category: "test1",
    tags: ["tag1"],
    embedding: new Float32Array([1.0, 0.5])
  },
  {
    content: "Second test chunk",
    filepath: "/test/file2.ts",
    category: "test2",
    tags: ["tag2"],
    embedding: new Float32Array([2.0, 1.5])
  }
];

ragDb.bulkInsertChunks(chunks, 100);
```

### searchSimilar()

```typescript
searchSimilar(queryEmbedding: Float32Array, k = 5): SearchResult<T>[]
```

Finds the k most similar chunks to the query embedding using cosine distance.

**Parameters:**
- `queryEmbedding` (Float32Array): The query vector for similarity search
- `k` (number, optional): Maximum number of results to return. Defaults to 5.

**Returns:** Array of search results sorted by ascending distance (most similar first).

**Example:**

```typescript
// Create query embedding
const queryEmbedding = new Float32Array(2);
queryEmbedding[0] = 1.0;
queryEmbedding[1] = 0.5;

// Search for similar chunks
const results = ragDb.searchSimilar(queryEmbedding, 5);

// Process results
results.forEach(result => {
  console.log(`Content: ${result.content}`);
  console.log(`Filepath: ${result.filepath}`);
  console.log(`Category: ${result.category}`);
  console.log(`Tags: ${result.tags.join(', ')}`);
  console.log(`Distance: ${result.distance}`);
  console.log('---');
});
```

### close()

```typescript
close()
```

Closes the database connection and releases resources.

**Example:**

```typescript
// Always close the database when done
ragDb.close();
```

## Type Definitions

### BaseMetadata

```typescript
type BaseMetadata = {
  content: string;
  filepath: string;
  id?: number;
}
```

Base interface for chunk metadata.

### ChunkRow<T>

```typescript
type ChunkRow<T extends BaseMetadata = BaseMetadata> = T & {
  embedding: Float32Array;
}
```

Interface for chunks being inserted, extending BaseMetadata with an embedding.

### SearchResult<T>

```typescript
type SearchResult<T extends BaseMetadata = BaseMetadata> = T & {
  id: number;
  distance: number;
}
```

Interface for search results, including the similarity distance.
