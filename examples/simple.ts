import { VeqliteDB, HFLocalEmbeddingModel } from "../src";

// veqliteの簡単な使用例
async function main() {
  try {
    // 埋め込みモデルを初期化
    console.log("モデルを読み込み中...");
    const embeddingModel = await HFLocalEmbeddingModel.init(
      "sirasagi62/granite-embedding-107m-multilingual-ONNX",
      384,
      "q8"
    );
    console.log("モデルの読み込みが完了しました！\n");

    // RAGデータベースインスタンスを作成
    console.log("データベースをセットアップ中...");
    const rag = new VeqliteDB(embeddingModel, {
      // メモリ内データベースを使用
      embeddingDim: 384,
      dbPath: ":memory:"
    });
    console.log("データベースのセットアップが完了しました！\n");

    // ドキュメントを追加
    console.log("ドキュメントを追加中...");
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
    console.log("ドキュメントの追加が完了しました！\n");

    // クエリを実行
    const query = "What is RAG?";
    console.log(`クエリ: "${query}"`);
    console.log("類似コンテンツを検索中...\n");
    
    const results = await rag.searchSimilar(query);
    
    console.log("🎉 検索結果:");
    results.forEach((r, i) => {
      console.log(`#${i + 1}: ${r.content}`);
      console.log(`   類似度スコア: ${r.distance.toFixed(4)}`);
      console.log(`   ファイル: ${r.filepath}\n`);
    });

    // データベースを閉じる
    rag.close();
    console.log("データベースを正常に閉じました。");
  } catch (error) {
    console.error("エラーが発生しました:", error);
    process.exit(1);
  }
}

main();
