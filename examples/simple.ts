import { VeqliteDB } from "../src/db";
import { HFLocalEmbeddingModel } from "../src/embedding";

// Simple example of using veqlite
async function main() {
  // Initialize the embedding model
  const embeddingModel = await HFLocalEmbeddingModel.init(
    "sirasagi62/granite-embedding-107m-multilingual-ONNX",
    384,
    "q8"
  );

  // Create RAG database instance
  const rag = new VeqliteDB(embeddingModel,{
    // Use in-memory database
    dbPath: ":memory:"
  });

  // Add some documents
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

  const query = "What is RAG?"
  console.log(`Query: ${query}`)
  // Query the system
  const results = await rag.searchSimilar(query);
  results.forEach((r,i)=>{
    console.log(`${r.content}: ${r.distance}`)
  })

  // Close the database
  rag.close();
}

main().catch(console.error);
