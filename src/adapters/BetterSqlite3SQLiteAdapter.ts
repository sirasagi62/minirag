import BetterSqlite3 from "better-sqlite3";
import { load } from "sqlite-vec";
import type { DatabaseStatement, SQLiteDatabase } from "../db";

export class BetterSqlite3Adapter implements SQLiteDatabase {
  private db: BetterSqlite3.Database;

  constructor(path: string) {
    this.db = new BetterSqlite3(path);
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
    const tx = this.db.transaction(fn);
    return tx;
  }

  close(): void {
    this.db.close();
  }
}
