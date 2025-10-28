import { test, expect } from "bun:test";
import { VeqliteDB, type BaseMetadata } from "../src/db";
import { type IEmbeddingModel } from "../src/embedding";
import { BunSQLiteAdapter } from "../src/adapters/BunSQLiteAdapter";

// カスタムメタデータ型の定義
type TestMetadata = BaseMetadata & {
  category: string;
  tags: string[];
};

// モックのembeddingモデルを作成
class MockEmbeddingModel implements IEmbeddingModel {
  modelname: string = "mock-model";
  dim: number = 2;

  async embedding(text: string): Promise<Float32Array> {
    const embedding = new Float32Array(this.dim);
    if (text.includes("test chunk")) {
      embedding[0] = 1.0;
      embedding[1] = 0.5;
    } else if (text.includes("First test")) {
      embedding[0] = 1.0;
      embedding[1] = 0.5;
    } else if (text.includes("Second test")) {
      embedding[0] = 2.0;
      embedding[1] = 1.5;
    }
    return embedding;
  }
}

test("VeqliteDB initialization", () => {
  const embeddingModel = new MockEmbeddingModel();
  const bunDB = new BunSQLiteAdapter(":memory:")
  const ragDb = new VeqliteDB<TestMetadata>(embeddingModel,bunDB);

  expect(ragDb).toBeDefined();
  ragDb.close();
});

test("insertChunk and searchSimilar", async () => {
  const embeddingModel = new MockEmbeddingModel();
  const dbAdapter = new BunSQLiteAdapter(":memory:");
  const ragDb = new VeqliteDB<TestMetadata>(embeddingModel, dbAdapter, {
    embeddingDim: 2
  });

  // チャンクを挿入
  const chunk = {
    content: "This is a test chunk",
    filepath: "/test/file.ts",
    category: "test",
    tags: ["tag1", "tag2"]
  };

  const id = await ragDb.insertChunk(chunk);
  expect(id).toBe(1);

  // 検索クエリ
  const results = await ragDb.searchSimilar("test query", 5);
  expect(results.length).toBe(1);

  const result = results[0];
  expect(result?.content).toBe("This is a test chunk");
  expect(result?.filepath).toBe("/test/file.ts");
  expect(result?.category).toBe("test");
  expect(result?.tags).toEqual(["tag1", "tag2"]);
  expect(result?.distance).toBeLessThan(0.001);

  ragDb.close();
});

test("bulkInsertChunks", async () => {
  const embeddingModel = new MockEmbeddingModel();
  const dbAdapter = new BunSQLiteAdapter(":memory:");
  const ragDb = new VeqliteDB<TestMetadata>(embeddingModel, dbAdapter, {
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

  // バルク挿入
  await ragDb.bulkInsertChunks(chunks);

  // 検索クエリ
  const results = await ragDb.searchSimilar("test query", 5);
  expect(results.length).toBe(2);

  // ソートして距離が近い順に並べる
  const sortedResults = results.sort((a, b) => a.distance - b.distance);

  const firstResult = sortedResults[0];
  expect(firstResult?.content).toBe("First test chunk");
  expect(firstResult?.filepath).toBe("/test/file1.ts");
  expect(firstResult?.category).toBe("test1");
  expect(firstResult?.tags).toEqual(["tag1"]);

  const secondResult = sortedResults[1];
  expect(secondResult?.content).toBe("Second test chunk");
  expect(secondResult?.filepath).toBe("/test/file2.ts");
  expect(secondResult?.category).toBe("test2");
  expect(secondResult?.tags).toEqual(["tag2"]);

  ragDb.close();
});
