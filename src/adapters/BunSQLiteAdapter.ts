import { Database } from "bun:sqlite";
import { load } from "sqlite-vec";
import type { DatabaseStatement, SQLiteDatabase } from "../db";
export class BunSQLiteAdapter implements SQLiteDatabase {
  private db: Database;

  constructor(path: string, sqlite3DylibPath?: string) {
    if (sqlite3DylibPath) Database.setCustomSQLite(sqlite3DylibPath)
    this.db = new Database(path);
    this.loadVecExtension();
  }

  private loadVecExtension() {
    load(this.db);
  }

  exec(sql: string): void {
    this.db.run(sql);
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
