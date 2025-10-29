// User-defined metadata type
export type BaseMetadata = {
  content: string;
  filepath: string;
  id?: number;
};

// Chunk data type (metadata can be extended)
export type ChunkRow<T extends BaseMetadata = BaseMetadata> = T & {
  embedding: Float32Array;
};

// Initialization options
export type RAGOptions = {
  dbPath?: string;
  embeddingDim?: number;
};

// default value
export const DEFAULT_EMBEDDING_DIM = 384;

// Search result type (supports generics)
export type SearchResult<T extends BaseMetadata = BaseMetadata> = T & {
  id: number;
  distance: number;
};

// Abstract DB driver definition
export interface IDatabaseDriver {
  /**
   * データベースの種類（"sqlite" | "pglite"）
   */
  readonly type: "sqlite" | "pglite";
  exec(sql: string): Promise<void>;
  prepare(sql: string): Promise<DatabaseStatement>;
  transaction(fn: (batch: any[]) => Promise<void>): (batch: any[]) => Promise<void>;
  close(): Promise<void>;
}

export interface DatabaseStatement {
  run(...params: any[]): Promise<void>;
  all(...params: any[]): Promise<any[]>;
}

/**
 * ベクトル操作の実装方式（SQLite vec0 / pgvector など）
 */
export interface VectorEngine<T extends BaseMetadata = BaseMetadata> {
  initSchema(): Promise<void>;
  insertChunk(chunk: ChunkRow<T>): Promise<void>;
  bulkInsertChunks(chunks: ChunkRow<T>[], batchSize: number): Promise<void>;
  searchSimilarByEmbedding(queryEmbedding: Float32Array, k: number): Promise<SearchResult<T>[]>;
}
