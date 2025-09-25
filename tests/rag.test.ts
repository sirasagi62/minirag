import { test, expect } from "bun:test";
import { RAGDatabase, type BaseMetadata } from "../db";

// カスタムメタデータ型の定義
type TestMetadata = BaseMetadata & {
  category: string;
  tags: string[];
};

test("RAGDatabase initialization", () => {
  const ragDb = new RAGDatabase<TestMetadata>({
    dbPath: ":memory:",
    embeddingDim: 2
  });

  expect(ragDb).toBeDefined();
  ragDb.close();
});

test("insertChunk and searchSimilar", () => {
  const ragDb = new RAGDatabase<TestMetadata>({
    dbPath: ":memory:",
    embeddingDim: 2
  });

  // チャンクを挿入
  const chunk = {
    content: "This is a test chunk",
    filepath: "/test/file.ts",
    category: "test",
    tags: ["tag1", "tag2"]
  };

  const embedding = new Float32Array(2);
  embedding[0] = 1.0;
  embedding[1] = 0.5;

  const chunkWithEmbedding = {
    ...chunk,
    embedding
  };

  const id = ragDb.insertChunk(chunkWithEmbedding);
  expect(id).toBe(1);

  // 検索クエリ用のembedding
  const queryEmbedding = new Float32Array(2);
  queryEmbedding[0] = 1.0;
  queryEmbedding[1] = 0.5;

  // 類似チャンクを検索
  const results = ragDb.searchSimilar(queryEmbedding, 5);
  expect(results.length).toBe(1);

  const result = results[0];
  expect(result?.content).toBe("This is a test chunk");
  expect(result?.filepath).toBe("/test/file.ts");
  expect(result?.category).toBe("test");
  expect(result?.tags).toEqual(["tag1", "tag2"]);
  expect(result?.distance).toBeLessThan(0.001);

  ragDb.close();
});

test("bulkInsertChunks", () => {
  const ragDb = new RAGDatabase<TestMetadata>({
    dbPath: ":memory:",
    embeddingDim: 2
  });

  // 複数のチャンクを準備
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

  // embeddingを追加
  const chunksWithEmbeddings = chunks.map((chunk, index) => {
    const embedding = new Float32Array(2);
    embedding[0] = index + 1;
    embedding[1] = 0.5 + index;

    return {
      ...chunk,
      embedding
    };
  });

  // バルク挿入
  ragDb.bulkInsertChunks(chunksWithEmbeddings);

  // 検索クエリ用のembedding
  const queryEmbedding = new Float32Array(2);
  queryEmbedding[0] = 1.0;
  queryEmbedding[1] = 0.5;

  // 類似チャンクを検索
  const results = ragDb.searchSimilar(queryEmbedding, 5).sort((a, b) => a.distance - b.distance);
  expect(results.length).toBe(2);
  const firstResult = results[0];
  expect(firstResult?.content).toBe("First test chunk");
  expect(firstResult?.filepath).toBe("/test/file1.ts");
  expect(firstResult?.category).toBe("test1");
  expect(firstResult?.tags).toEqual(["tag1"]);

  const secondResult = results[1];
  expect(secondResult?.content).toBe("Second test chunk");
  expect(secondResult?.filepath).toBe("/test/file2.ts");
  expect(secondResult?.category).toBe("test2");
  expect(secondResult?.tags).toEqual(["tag2"]);

  ragDb.close();
});
