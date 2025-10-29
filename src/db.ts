// db.ts
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
const DEFAULT_EMBEDDING_DIM = 384;

// Search result type (supports generics)
export type SearchResult<T extends BaseMetadata = BaseMetadata> = T & {
  id: number;
  distance: number;
};

// Abstract DB definition
export interface ISQLDatabse {
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
 * DB固有の操作を抽象化するアダプターインターフェース
 */
export interface VectorDBAdapter<T extends BaseMetadata = BaseMetadata> {
  initSchema(): Promise<void>;
  insertChunk(chunk: ChunkRow<T>): Promise<void>;
  bulkInsertChunks(chunks: ChunkRow<T>[], batchSize: number): Promise<void>;
  searchSimilarByEmbedding(queryEmbedding: Float32Array, k: number): Promise<SearchResult<T>[]>;
}

import type { IEmbeddingModel } from "./embedding";


export class VeqliteDB<T extends BaseMetadata = BaseMetadata> {
  private embeddingModel: IEmbeddingModel;
  private adapter: VectorDBAdapter<T>;
  private database: ISQLDatabse

  constructor(
    embeddingModel: IEmbeddingModel,
    database: ISQLDatabse,
    options: RAGOptions = {}
  ) {
    this.embeddingModel = embeddingModel;
    const embeddingDim = options.embeddingDim || embeddingModel.dim || DEFAULT_EMBEDDING_DIM;

    this.adapter = database.type === "pglite"
      ? new (require("./adapters/PGliteDBAdapter").PGLiteDBAdapter)(database, embeddingDim)
      : new (require("./adapters/SQLiteDBAdapter").SQLiteDBAdapter)(database, embeddingDim);
    this.database = database
  }

  async initSchema(): Promise<void> {
    await this.adapter.initSchema();
  }

  static async init(
    embeddingModel: IEmbeddingModel,
    database: ISQLDatabse,
    options: RAGOptions = {}
  ) {
    const _this = new VeqliteDB(embeddingModel, database, options);
    await _this.initSchema();
    return _this;
  }

  // Insert chunk with embedding (supports generics)
  async insertChunkWithEmbedding(chunk: ChunkRow<T>): Promise<void> {
    await this.adapter.insertChunk(chunk);
  }

  // Bulk insert function (supports generics)
  async bulkInsertChunksWithEmbdding(chunks: ChunkRow<T>[], batchSize = 500): Promise<void> {
    await this.adapter.bulkInsertChunks(chunks, batchSize);
  }

  // Search similar chunks by embedding (supports generics)
  async searchSimilarByEmbedding(queryEmbedding: Float32Array, k = 5): Promise<SearchResult<T>[]> {
    return await this.adapter.searchSimilarByEmbedding(queryEmbedding, k);
  }

  async insertChunk(inputChunk: T): Promise<void> {
    const embedding = await this.embeddingModel.embedding(inputChunk.content)
    return this.insertChunkWithEmbedding(
      {
        ...inputChunk,
        embedding
      }
    )
  }

  async bulkInsertChunks(inputChunks: T[], batchSize = 500) {
    const chunksWithEmbedding: ChunkRow<T>[] = await Promise.all(inputChunks.map(async c => {
      const embedding = await this.embeddingModel.embedding(c.content)
      return {
        ...c,
        embedding
      }
    }))
    return this.bulkInsertChunksWithEmbdding(chunksWithEmbedding, batchSize)
  }

  async searchSimilar(query: string, k = 5): Promise<SearchResult<T>[]> {
    const queryEmbedding = await this.embeddingModel.embedding(query)
    return this.searchSimilarByEmbedding(queryEmbedding, k)
  }

  close() {
    return this.database.close();
  }
}
