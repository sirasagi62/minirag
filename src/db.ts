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

import type { IEmbeddingModel } from "./embedding";

export class VeqliteDB<T extends BaseMetadata = BaseMetadata> {
  private db: ISQLDatabse;
  private embeddingDim: number;
  private embeddingModel: IEmbeddingModel;

  constructor(
    embeddingModel: IEmbeddingModel,
    database: ISQLDatabse,
    options: RAGOptions = {}
  ) {
    this.embeddingModel = embeddingModel;
    this.db = database;
    this.embeddingDim = options.embeddingDim || embeddingModel.dim || DEFAULT_EMBEDDING_DIM;
  }

  async initSchema(): Promise<void> {
    if (this.db.type === "pglite") {
      await this.db.exec("CREATE EXTENSION IF NOT EXISTS vector;");
      await this.db.exec(`
      CREATE TABLE IF NOT EXISTS chunks (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        filepath TEXT NOT NULL,
        metadata JSONB,
        embedding vector(${this.embeddingDim})
      );
      `);
      await this.db.exec(`
      CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING ivfflat (embedding vector_cosine_ops);
      `);
    } else {
      await this.db.exec(`
      CREATE TABLE IF NOT EXISTS chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        filepath TEXT NOT NULL,
        metadata JSON,
        embedding BLOB NOT NULL
      );
      `);
      await this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS vec_index USING vec0(
        embedding float[${this.embeddingDim}] distance_metric=cosine
      );
      `);
      await this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS chunks_after_insert
      AFTER INSERT ON chunks
      BEGIN
        INSERT INTO vec_index(rowid, embedding) VALUES (new.id, new.embedding);
      END;
      `);
      await this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS chunks_after_delete
      AFTER DELETE ON chunks
      BEGIN
        DELETE FROM vec_index WHERE rowid = old.id;
      END;
      `);
      await this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS chunks_after_update
      AFTER UPDATE ON chunks
      BEGIN
        DELETE FROM vec_index WHERE rowid = old.id;
        INSERT INTO vec_index(rowid, embedding) VALUES (new.id, new.embedding);
      END;
      `);
    }
  }

  // --- Helpers ---
  private assertEmbeddingDim(arr: Float32Array) {
    if (arr.length !== this.embeddingDim) {
      throw new Error(`embedding must have length ${this.embeddingDim}, got ${arr.length}`);
    }
  }

  private float32ToBuffer(arr: Float32Array): Buffer {
    // ensure a copy with proper byteOffset/length
    return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
  }

  private float32ToNumberArray(arr: Float32Array): number[] {
    return Array.from(arr);
  }


  // Insert chunk with embedding (supports generics)
  async insertChunkWithEmbedding(chunk: ChunkRow<T>): Promise<void> {
    this.assertEmbeddingDim(chunk.embedding);
    const buf = this.float32ToBuffer(chunk.embedding);

    const { content, filepath, id, ...metadata } = chunk;
    const metadataStr = JSON.stringify(metadata);

    const stmt = await this.db.prepare(
      `INSERT INTO chunks (content, filepath, metadata, embedding)
       VALUES ($1, $2, $3, $4)`
    );
    await stmt.run(content, filepath, metadataStr, buf);
  }

  // Bulk insert function (supports generics)
  async bulkInsertChunksWithEmbdding(chunks: ChunkRow<T>[], batchSize = 500): Promise<void> {
    const insertMany = this.db.transaction(async (batch: ChunkRow<T>[]) => {
      const stmt = await this.db.prepare(
        `INSERT INTO chunks (content, filepath, metadata, embedding)
         VALUES ($1, $2, $3, $4)`
      );
      for (const c of batch) {
        this.assertEmbeddingDim(c.embedding);
        const buf = this.float32ToBuffer(c.embedding);

        const { content, filepath, id, ...metadata } = c;
        const metadataStr = JSON.stringify(metadata);

        await stmt.run(content, filepath, metadataStr, buf);
      }
    });

    for (let i = 0; i < chunks.length; i += batchSize) {
      const slice = chunks.slice(i, i + batchSize);
      await insertMany(slice);
    }
  }

  // Search similar chunks by embedding (supports generics)
  async searchSimilarByEmbedding(queryEmbedding: Float32Array, k = 5): Promise<SearchResult<T>[]> {
    this.assertEmbeddingDim(queryEmbedding);
    const qBuf = this.float32ToBuffer(queryEmbedding);

    let sql: string;
    if (this.db.type === "pglite") {
      sql = `
        SELECT
          id,
          content,
          filepath,
          metadata,
          embedding <=> $1 AS distance
        FROM chunks
        ORDER BY distance
        LIMIT $2
      `;
    } else {
      sql = `
        WITH q AS (SELECT ? AS embedding)
        SELECT
          c.id,
          c.content,
          c.filepath,
          json(c.metadata) as metadata,
          v.distance as distance
        FROM vec_index v
        JOIN q ON 1=1
        JOIN chunks c ON c.id = v.rowid
        WHERE v.embedding MATCH q.embedding
          AND v.k = ?
        ORDER BY distance
        LIMIT ?
      `;
    }

    const stmt = await this.db.prepare(sql);
    const rows = await stmt.all(
      this.db.type === "pglite" ? [qBuf, k] : [qBuf, k, k]
    );
    return rows.map(r => {
      const metadata = r.metadata ? (this.db.type === "pglite" ? r.metadata : JSON.parse(r.metadata)) : {};
      return {
        ...metadata,
        id: Number(r.id),
        content: r.content,
        filepath: r.filepath,
        distance: Number(r.distance)
      } as SearchResult<T>;
    });
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
    return this.db.close();
  }
}
