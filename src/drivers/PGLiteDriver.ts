import { PGlite, type PGliteOptions } from "@electric-sql/pglite";
import { vector } from '@electric-sql/pglite/vector';
import type { DatabaseStatement, IDatabaseDriver } from "../types";


/**
 * PGLite を使用した SQLiteDatabase アダプター
 * pgvector 拡張を利用してベクトル類似度検索をサポート
 */
export class PGLiteAdapter implements IDatabaseDriver {
  readonly type = "pglite";
  private db: PGlite;

  constructor(dbPath: string, options?: PGliteOptions) {
    let path: string | undefined = dbPath
    if (dbPath === ":memory:") path = undefined
    this.db = new PGlite({
      extensions: { vector }, // pgvector 拡張を有効化
      dataDir: path,
      ...options,
    });
  }

  async exec(sql: string): Promise<void> {
    await this.db.exec(sql);
  }

  /**
   * prepare はクエリを準備し、run/all を非同期で提供
   */
  async prepare(sql: string): Promise<DatabaseStatement> {
    return {
      run: async (...params) => {
        await this.db.query(sql, params);
      },
      all: async (...params) => {
        const result = await this.db.query(sql, params);
        return result.rows;
      },
    };
  }

  /**
   * トランザクションをサポート
   */
  transaction(fn: (batch: any[]) => Promise<void>): (batch: any[]) => Promise<void> {
    return async (batch: any[]) => {
      await this.db.exec("BEGIN");
      try {
        await fn(batch);
        await this.db.exec("COMMIT");
      } catch (e) {
        await this.db.exec("ROLLBACK");
        throw e;
      }
    };
  }

  async close() {
    this.db.close();
  }

  /**
   * PGLite インスタンスへの直接アクセス（高度な利用向け）
   */
  get pg(): PGlite {
    return this.db;
  }
}
