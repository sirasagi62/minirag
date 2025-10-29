import type { ISQLDatabse, DatabaseStatement } from "../db";
import { DatabaseSync } from "node:sqlite";
import { load } from "sqlite-vec"
export class NodeSQLiteAdapter implements ISQLDatabse {
  private db: DatabaseSync;
  readonly type = "sqlite";

  constructor(path: string) {
    this.db = new DatabaseSync(path, {
      allowExtension: true
    });
    this.loadVecExtension();
  };

  private loadVecExtension() {
    load(this.db);
  }

  async exec(sql: string) {
    this.db.exec(sql);
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

  async close() {
    this.db.close();
  }
}
