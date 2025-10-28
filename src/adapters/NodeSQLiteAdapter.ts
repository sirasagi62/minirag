import type { SQLiteDatabase, DatabaseStatement } from "../db";
import { DatabaseSync } from "node:sqlite";
import { load } from "sqlite-vec"
export class NodeSQLiteAdapter implements SQLiteDatabase {
  private db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path, {
      allowExtension: true
    });
    this.loadVecExtension();
  }

  private loadVecExtension() {
    load(this.db);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  prepare(sql: string): DatabaseStatement {
    const stmt = this.db.prepare(sql);
    return {
      run: (...args) => stmt.run(...args),
      all: (...args) => stmt.all(...args),
    };
  }


  transaction(fn: (batch: any[]) => void): (batch: any[]) => void {
    const tx = (_batch: any[]) => {
      this.db.exec("BEGIN")
      fn(_batch)
      this.db.exec("END")
    }
    return tx;

  }

  close(): void {
    this.db.close();
  }
}
