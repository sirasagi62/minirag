import type { SQLiteDatabase, DatabaseStatement } from "../db";
import BetterSqlite3 from "better-sqlite3";

export class NodeSQLiteAdapter implements SQLiteDatabase {
  private db: BetterSqlite3.Database;

  constructor(path: string) {
    this.db = new BetterSqlite3(path);
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

  transaction(fn: (batch: any[]) => void): (batch: any[]) => void {
    const tx = this.db.transaction(fn);
    return tx;
  }

  close(): void {
    this.db.close();
  }
}
