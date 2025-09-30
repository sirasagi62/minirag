// db.ts
// Bunの場合はbun:sqlite、Node.jsの場合はbetter-sqlite3を使用
import * as sqliteVec from "sqlite-vec";
import type { IEmbeddingModel } from "./embedding";

let Database: any;

if (process.versions.bun) {
  // Bun の場合
  const { Database: BunDatabase } = await import("bun:sqlite");
  Database = BunDatabase;
} else {
  // Node.js の場合
  const BetterSqlite3 = (await import("better-sqlite3")).default;
  Database = BetterSqlite3;
}

// ユーザー定義メタデータ型
export type BaseMetadata = {
  content: string;
  filepath: string;
  id?: number;
};

// チャンクデータ型（メタデータ拡張可能）
export type ChunkRow<T extends BaseMetadata = BaseMetadata> = T & {
  embedding: Float32Array;
};

// 初期化オプション
export type RAGOptions = {
  dbPath?: string;
  embeddingDim?: number;
};

// デフォルト値
const DEFAULT_DB_PATH = "chunks.db";
const DEFAULT_EMBEDDING_DIM = 384;

// 検索結果型（Generics対応）
export type SearchResult<T extends BaseMetadata = BaseMetadata> = T & {
  id: number;
  distance: number;
};

export class VeqliteDB<T extends BaseMetadata = BaseMetadata> {
  private db: typeof Database;
  private embeddingDim: number;
  private embeddingModel: IEmbeddingModel;

  constructor(embeddingModel: IEmbeddingModel, options: RAGOptions = {}) {
    const dbPath = options.dbPath || DEFAULT_DB_PATH;
    this.embeddingDim = options.embeddingDim || DEFAULT_EMBEDDING_DIM;

    this.db = new Database(dbPath);
    this.embeddingModel = embeddingModel

    // load sqlite-vec extension/wrapping (this registers functions / virtual tables)
    sqliteVec.load(this.db);

    // --- Schema ---
    this.db.exec(`
    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      filepath TEXT NOT NULL,
      metadata JSON,
      embedding BLOB NOT NULL
    );
    `);

    // vec0 virtual table for indexing vectors
    this.db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS vec_index USING vec0(
      embedding float[${this.embeddingDim}] distance_metric=cosine
    );
    `);

    // triggers to keep vec_index in sync with chunks
    this.db.exec(`
    CREATE TRIGGER IF NOT EXISTS chunks_after_insert
    AFTER INSERT ON chunks
    BEGIN
      INSERT INTO vec_index(rowid, embedding) VALUES (new.id, new.embedding);
    END;
    `);
    this.db.exec(`
    CREATE TRIGGER IF NOT EXISTS chunks_after_delete
    AFTER DELETE ON chunks
    BEGIN
      DELETE FROM vec_index WHERE rowid = old.id;
    END;
    `);
    this.db.exec(`
    CREATE TRIGGER IF NOT EXISTS chunks_after_update
    AFTER UPDATE ON chunks
    BEGIN
      DELETE FROM vec_index WHERE rowid = old.id;
      INSERT INTO vec_index(rowid, embedding) VALUES (new.id, new.embedding);
    END;
    `);
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

  // チャンク挿入関数（Generics対応）
  insertChunkWithEmbedding(chunk: ChunkRow<T>): number {
    this.assertEmbeddingDim(chunk.embedding);
    const buf = this.float32ToBuffer(chunk.embedding);

    // メタデータをJSON文字列に変換
    const { content, filepath, id, ...metadata } = chunk;
    const metadataStr = JSON.stringify(metadata);

    const stmt = this.db.prepare(
      `INSERT INTO chunks (content, filepath, metadata, embedding)
       VALUES (?, ?, ?, ?)`
    );
    const info = stmt.run(content, filepath, metadataStr, buf);
    return Number(info.lastInsertRowid);
  }

  // バルク挿入関数（Generics対応）
  bulkInsertChunksWithEmbdding(chunks: ChunkRow<T>[], batchSize = 500) {
    // chunked batch insert to avoid giant single statement / memory spikes
    const insertOne = this.db.prepare(
      `INSERT INTO chunks (content, filepath, metadata, embedding)
       VALUES (?, ?, ?, ?)`
    );
    const insertMany = this.db.transaction((batch: ChunkRow<T>[]) => {
      for (const c of batch) {
        this.assertEmbeddingDim(c.embedding);
        const buf = this.float32ToBuffer(c.embedding);

        // メタデータをJSON文字列に変換
        const { content, filepath, id, ...metadata } = c;
        const metadataStr = JSON.stringify(metadata);

        insertOne.run(content, filepath, metadataStr, buf);
      }
    });

    for (let i = 0; i < chunks.length; i += batchSize) {
      const slice = chunks.slice(i, i + batchSize);
      insertMany(slice);
    }
  }

  // 類似チャンク検索関数（Generics対応）
  searchSimilarByEmbedding(queryEmbedding: Float32Array, k = 5): SearchResult<T>[] {
    this.assertEmbeddingDim(queryEmbedding);
    const qBuf = this.float32ToBuffer(queryEmbedding);

    // Use vec_index.match KNN; vec_index.embedding MATCH ? accepts either JSON text or binary
    // We pass binary. k is provided via parameter for vec_index.k; LIMIT is provided too.
    const sql = `
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
    const stmt = this.db.prepare(sql);
    // parameters: qBuf, k (for v.k), k (for LIMIT). Some sqlite-vec usages pass k as v.k parameter; include both.
    const rows = stmt.all(qBuf, k, k) as any[];
    return rows.map(r => {
      const metadata = r.metadata ? JSON.parse(r.metadata) : {};
      return {
        ...metadata,
        id: Number(r.id),
        content: r.content,
        filepath: r.filepath,
        distance: Number(r.distance)
      } as SearchResult<T>;
    });
  }

  async insertChunk(inputChunk: T): Promise<number> {
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
    this.db.close();
  }
}
