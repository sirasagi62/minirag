# API Documentation

## VeqliteDB<T>

A minimal RAG (Retrieval-Augmented Generation) database implementation using SQLite with the sqlite-vec extension for vector similarity search.

### Constructor

```typescript
constructor(embeddingModel: IEmbeddingModel, options: RAGOptions = {})
```

Initializes a new RAG database instance.

**Parameters:**
- `embeddingModel`: An instance of an embedding model that implements the IEmbeddingModel interface
- `options.dbPath` (string, optional): Path to the SQLite database file. Defaults to "chunks.db". Use ":memory:" for in-memory database.
- `options.embeddingDim` (number, optional): Dimension of the embeddings. Defaults to 384.

**Example:**

```typescript
// Create an embedding model instance
const embeddingModel = await HFLocalEmbeddingModel.init(
  "sirasagi62/granite-embedding-107m-multilingual-ONNX",
  384,
  "q8"
);

// Create a RAG database instance
const ragDb = new VeqliteDB(embeddingModel, {
  dbPath: ":memory:",
  embeddingDim: 384
});
```

### insertChunk()

```typescript
insertChunk(chunk: T): Promise<number>
```

Inserts a single chunk into the database. The method automatically generates the embedding for the chunk content using the provided embedding model.

**Parameters:**
- `chunk.content` (string): The text content to store
- `chunk.filepath` (string): Path or identifier for the source
- Other properties: Additional metadata fields

**Returns:** A Promise that resolves to the ID of the inserted chunk.

**Example:**

```typescript
const chunk = {
  content: "This is a test chunk",
  filepath: "/test/file.ts",
  category: "documentation",
  tags: ["test", "example"]
};

const id = await ragDb.insertChunk(chunk);
console.log(`Inserted chunk with ID: ${id}`); // Output: Inserted chunk with ID: 1
```

### bulkInsertChunks()

```typescript
bulkInsertChunks(chunks: T[], batchSize = 500): Promise<void>
```

Inserts multiple chunks into the database in batches for improved performance. The method automatically generates embeddings for all chunk contents using the provided embedding model.

**Parameters:**
- `chunks`: Array of chunk objects to insert
- `batchSize` (optional): Number of chunks to insert in each transaction. Defaults to 500.

**Returns:** A Promise that resolves when all chunks have been inserted.

**Example:**

```typescript
const chunks = [
  {
    content: "First test chunk",
    filepath: "/test/file1.ts",
    category: "test1",
    tags: ["tag1"]
  },
  {
    content: "Second test chunk",
    filepath: "/test/file2.ts",
    category: "test2",
    tags: ["tag2"]
  }
];

await ragDb.bulkInsertChunks(chunks, 100);
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

## Embedding Model

### HFLocalEmbeddingModel

```typescript
class HFLocalEmbeddingModel implements IEmbeddingModel {
  modelname: string;
  dim: number;
  dtype?: DType;

  constructor(modelname: string, dim: number, dtype?: DType);
  static async init(modelname: string, dim: number, dtype?: DType): Promise<HFLocalEmbeddingModel>;
  embedding(text: string): Promise<Float32Array>;
}
```

A class for generating embeddings using Hugging Face models locally.

**Parameters:**
- `modelname` (string): Model name on Hugging Face Hub
- `dim` (number): Dimension of the embedding vector
- `dtype` (DType, optional): Quantization method for model weights

**Type DType:**
```typescript
type DType =
  | "auto"
  | "fp32"
  | "fp16"
  | "q8"
  | "int8"
  | "uint8"
  | "q4"
  | "bnb4"
  | "q4f16";
```

**Methods:**

#### init()

```typescript
static async init(modelname: string, dim: number, dtype?: DType): Promise<HFLocalEmbeddingModel>
```

Initializes a new HFLocalEmbeddingModel instance. This static method should be used instead of the constructor to properly initialize the embedding pipeline.

**Parameters:**
- `modelname` (string): Model name on Hugging Face Hub
- `dim` (number): Dimension of the embedding vector
- `dtype` (DType, optional): Quantization method for model weights

**Returns:** A Promise that resolves to an initialized HFLocalEmbeddingModel instance.

**Example:**

```typescript
// Create an embedding model instance
const embeddingModel = await HFLocalEmbeddingModel.init(
  "sirasagi62/granite-embedding-107m-multilingual-ONNX",
  384,
  "q8"
);
```

#### embedding()

```typescript
embedding(text: string): Promise<Float32Array>
```

Generates an embedding for the given text using the specified Hugging Face model.

**Parameters:**
- `text` (string): Input text to generate embedding for

**Returns:** A Promise that resolves to a Float32Array containing the embedding vector.

**Example:**

```typescript
// Generate embedding for text
const embedding = await embeddingModel.embedding("Hello, world!");
console.log(`Generated embedding of dimension: ${embedding.length}`);
```
