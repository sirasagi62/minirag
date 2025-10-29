import type { ISQLDatabse, VectorDBAdapter, ChunkRow, SearchResult, BaseMetadata } from "../db";

/**
 * SQLite (vec0) 向けのデータ操作アダプター
 */
export class SQLiteDBAdapter<T extends BaseMetadata = BaseMetadata> implements VectorDBAdapter<T> {
  private db: ISQLDatabse;
  private embeddingDim: number;

  constructor(db: ISQLDatabse, embeddingDim: number) {
    this.db = db;
    this.embeddingDim = embeddingDim;
  }

  async initSchema(): Promise<void> {
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

  async insertChunk(chunk: ChunkRow<T>): Promise<void> {
    this.assertEmbeddingDim(chunk.embedding);
    const { content, filepath, id, ...metadata } = chunk;
    const metadataStr = JSON.stringify(metadata);
    const buf = Buffer.from(chunk.embedding.buffer, chunk.embedding.byteOffset, chunk.embedding.byteLength);
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
        const buf = Buffer.from(c.embedding.buffer, c.embedding.byteOffset, c.embedding.byteLength);
        await stmt.run(content, filepath, metadataStr, buf);
      }
    });
    for (let i = 0; i < chunks.length; i += batchSize) {
      await insertMany(chunks.slice(i, i + batchSize));
    }
  }

  async searchSimilarByEmbedding(queryEmbedding: Float32Array, k: number): Promise<SearchResult<T>[]> {
    this.assertEmbeddingDim(queryEmbedding);
    const qBuf = Buffer.from(queryEmbedding.buffer, queryEmbedding.byteOffset, queryEmbedding.byteLength);
    const stmt = await this.db.prepare(`
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
    `);
    const rows = await stmt.all([qBuf, k, k]);
    return rows.map(r => ({
      ...JSON.parse(r.metadata),
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
