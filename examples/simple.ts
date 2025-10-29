import { VeqliteDB, HFLocalEmbeddingModel } from "../src";
import { BunSQLiteAdapter } from "../src/adapters/BunSQLiteAdapter";
import { PGLiteAdapter } from "../src/adapters/PGLiteAdapter";

// Simple usage example of veqlite
async function main() {
  try {
    // Initialize the embedding model
    console.log("Loading model...");
    const embeddingModel = await HFLocalEmbeddingModel.init(
      "sirasagi62/granite-embedding-107m-multilingual-ONNX",
      //"sirasagi62/ruri-v3-70m-ONNX",
      384,
      "q8"
    );
    console.log("Model loaded successfully!\n");
    console.log("Model Name: ",embeddingModel.modelname)
    console.log("Embedding Dimension: ",embeddingModel.dim)

    // On macOS
    // c.f. https://bun.com/docs/runtime/sqlite#for-macos-users
    //const dbAdapter = new BunSQLiteAdapter(":memory:", "/opt/homebrew/Cellar/sqlite/3.50.4/lib/libsqlite3.dylib");
    const dbAdapter = new PGLiteAdapter(":memory:")
    // On other platforms
    // const bunsqlite = new BunSQLiteAdapter(":memory:");
    // Create RAG database instance
    console.log("Setting up database...");
    console.log("Backend Type:",dbAdapter.type)
    const rag = new VeqliteDB(embeddingModel, dbAdapter, {});
    await rag.initSchema()
    console.log("Database setup completed!\n");

    // Add documents
    console.log("Adding documents...");
    await rag.insertChunk({
      content: "TypeScript is a typed superset of JavaScript",
      filepath: "typescript-intro"
    });
    await rag.insertChunk({
      content: "RAG stands for Retrieval Augmented Generation",
      filepath: "rag-intro"
    });
    await rag.insertChunk({
      content: "Minirag is a simple RAG implementation in TypeScript",
      filepath: "veqlite-intro"
    });
    console.log("Documents added successfully!\n");

    // Execute query
    const query = "What is RAG?";
    console.log(`Query: "${query}"`);
    console.log("Searching for similar content...\n");

    const results = await rag.searchSimilar(query);

    console.log("🎉 Search results:");
    results.forEach((r, i) => {
      console.log(`#${i + 1}: ${r.content}`);
      console.log(`   Similarity score: ${r.distance.toFixed(4)}`);
      console.log(`   File: ${r.filepath}\n`);
    });

    // Close the database
    rag.close();
    console.log("Database closed successfully.");
  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
}

main();
