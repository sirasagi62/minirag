import type { SQLiteDatabase, DatabaseStatement } from "../db";

export class BunSQLiteAdapter implements SQLiteDatabase {
  private db: any;

  constructor(path: string) {
    const { Database } = require("bun:sqlite");
    this.db = new Database(path);
    this.loadVecExtension();
  }

  private loadVecExtension() {
    const sqliteVec = require("sqlite-vec");
    sqliteVec.load(this.db);
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

  transaction<T>(fn: (batch: any[]) => T): (batch: any[]) => T {
    const tx = this.db.transaction(fn);
    return tx;
  }

  close(): void {
    this.db.close();
  }
}
