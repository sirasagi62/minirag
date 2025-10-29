import type { ISQLDatabse, VectorDBAdapter, ChunkRow, SearchResult, BaseMetadata } from "../db";

/**
 * PGLite 向けのデータ操作アダプター
 */
export class PGLiteDBAdapter<T extends BaseMetadata = BaseMetadata> implements VectorDBAdapter<T> {
  private db: ISQLDatabse;
  private embeddingDim: number;

  constructor(db: ISQLDatabse, embeddingDim: number) {
    this.db = db;
    this.embeddingDim = embeddingDim;
  }

  async initSchema(): Promise<void> {
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
      CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops);
    `);
  }

  async insertChunk(chunk: ChunkRow<T>): Promise<void> {
    this.assertEmbeddingDim(chunk.embedding);
    const { content, filepath, id, ...metadata } = chunk;
    const metadataStr = JSON.stringify(metadata);
    const buf = `[${Array.from(chunk.embedding)}]`;
    const stmt = await this.db.prepare(
      `INSERT INTO chunks (content, filepath, metadata, embedding) VALUES ($1, $2, $3, $4)`
    );
    await stmt.run(content, filepath, metadataStr, buf);
  }

  async bulkInsertChunks(chunks: ChunkRow<T>[], batchSize: number): Promise<void> {
    const insertMany = this.db.transaction(async (batch: ChunkRow<T>[]) => {
      const stmt = await this.db.prepare(
        `INSERT INTO chunks (content, filepath, metadata, embedding) VALUES ($1, $2, $3, $4)`
      );
      for (const c of batch) {
        this.assertEmbeddingDim(c.embedding);
        const { content, filepath, id, ...meta } = c;
        const metadataStr = JSON.stringify(meta);
        const buf = `[${Array.from(c.embedding)}]`;
        await stmt.run(content, filepath, metadataStr, buf);
      }
    });
    for (let i = 0; i < chunks.length; i += batchSize) {
      await insertMany(chunks.slice(i, i + batchSize));
    }
  }

  async searchSimilarByEmbedding(queryEmbedding: Float32Array, k: number): Promise<SearchResult<T>[]> {
    this.assertEmbeddingDim(queryEmbedding);
    const qBuf = `[${Array.from(queryEmbedding)}]`;
    const stmt = await this.db.prepare(`
      SELECT
        id,
        content,
        filepath,
        metadata,
        embedding <=> $1 AS distance
      FROM chunks
      ORDER BY distance
      LIMIT $2
    `);
    const rows = await stmt.all(qBuf, k);
    return rows.map(r => ({
      ...r.metadata,
      id: Number(r.id),
      content: r.content,
      filepath: r.filepath,
      distance: Number(r.distance)
    }));
  }

  private assertEmbeddingDim(arr: Float32Array) {
    if (arr.length !== this.embeddingDim) {
      throw new Error(`embedding must have length ${this.embeddingDim}, got ${arr.length}`);
    }
  }
}
