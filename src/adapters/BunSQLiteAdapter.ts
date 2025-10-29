import { Database } from "bun:sqlite";
import { load } from "sqlite-vec";
import type { DatabaseStatement, ISQLDatabse } from "../db";
export class BunSQLiteAdapter implements ISQLDatabse {
  readonly type = "sqlite";
  private db: Database;

  constructor(path: string, sqlite3DylibPath?: string) {
    if (sqlite3DylibPath) Database.setCustomSQLite(sqlite3DylibPath)
    this.db = new Database(path);
    this.loadVecExtension();
  }

  private loadVecExtension() {
    load(this.db);
  }

  async exec(sql: string): Promise<void> {
    this.db.run(sql);
  }

  async prepare(sql: string): Promise<DatabaseStatement> {
    const stmt = this.db.prepare(sql);
    return {
      run: async (...args) => { stmt.run(...args) },
      all: async (...args) => stmt.all(...args),
    };
  }

  transaction(fn: (batch: any[]) => Promise<void>): (batch: any[]) => Promise<void> {
    const tx = async (_batch: any[]) => {
      this.db.exec("BEGIN")
      await fn(_batch)
      this.db.exec("END")
    }
    return tx;

  }
  // async transaction(fn: (batch: any[]) => void): (batch: any[]) => void {
  //   const tx = this.db.transaction((batch) => fn(batch));
  //   return async (batch: any[]) => tx(batch);
  // }

  async close(): Promise<void> {
    this.db.close();
  }
}
