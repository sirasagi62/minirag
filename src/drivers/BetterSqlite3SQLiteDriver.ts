import BetterSqlite3 from "better-sqlite3";
import { load } from "sqlite-vec";
import type { DatabaseStatement, IDatabaseDriver } from "../types";

export class BetterSqlite3Adapter implements IDatabaseDriver {
  private db: BetterSqlite3.Database;
  readonly type = "sqlite";

  constructor(path: string) {
    this.db = new BetterSqlite3(path);
    this.loadVecExtension();
  }

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



  // transaction (fn: (batch: any[]) => void): (batch: any[]) => void {
  //   const tx = this.db.transaction(fn);
  //   return tx;
  // }

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
