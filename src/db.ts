// db.ts
import type { IEmbeddingModel } from "./embedding";
import { DEFAULT_EMBEDDING_DIM, type BaseMetadata, type ChunkRow, type IDatabaseDriver, type RAGOptions, type SearchResult, type VectorEngine } from "./types";
import { PGLiteVectorEngine } from "./engines/PGLiteVectorEngine";
import { SQLiteVectorEngine } from "./engines/SQLiteVectorEngine";
export class VeqliteDB<T extends BaseMetadata = BaseMetadata> {
  private embeddingModel: IEmbeddingModel;
  private engine: VectorEngine<T>;
  private driver: IDatabaseDriver;

  constructor(
    embeddingModel: IEmbeddingModel,
    driver: IDatabaseDriver,
    options: RAGOptions = {}
  ) {
    this.embeddingModel = embeddingModel;
    this.driver = driver;
    const embeddingDim = options.embeddingDim || embeddingModel.dim || DEFAULT_EMBEDDING_DIM;

    // Switching SQL Dialect
    this.engine = driver.type === "pglite"
      ? new PGLiteVectorEngine(driver, embeddingDim)
      : new SQLiteVectorEngine(driver, embeddingDim);
  }

  async initSchema(): Promise<void> {
    await this.engine.initSchema();
  }

  static async init<T extends BaseMetadata>(
    embeddingModel: IEmbeddingModel,
    driver: IDatabaseDriver,
    options: RAGOptions = {}
  ) {
    const _this = new VeqliteDB<T>(embeddingModel, driver, options);
    await _this.initSchema();
    return _this;
  }

  // Insert chunk with embedding (supports generics)
  async insertChunkWithEmbedding(chunk: ChunkRow<T>): Promise<void> {
    await this.engine.insertChunk(chunk);
  }

  // Bulk insert function (supports generics)
  async bulkInsertChunksWithEmbdding(chunks: ChunkRow<T>[], batchSize = 500): Promise<void> {
    await this.engine.bulkInsertChunks(chunks, batchSize);
  }

  // Search similar chunks by embedding (supports generics)
  async searchSimilarByEmbedding(queryEmbedding: Float32Array, k = 5): Promise<SearchResult<T>[]> {
    return await this.engine.searchSimilarByEmbedding(queryEmbedding, k);
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
    return this.driver.close();
  }
}
