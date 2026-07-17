// sql.js connection helpers — initialise the WASM runtime and load/save
// the on-disk SQLite file. Higher-level repositories only see Database.

import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic } from "sql.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface OpenOptions {
  userDataPath: string;
  filename?: string;
}

let sqlPromise: Promise<SqlJsStatic> | null = null;

function loadSqlJs(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = initSqlJs();
  }
  return sqlPromise;
}

export async function openLedgerDatabase(options: OpenOptions): Promise<SqlJsDatabase> {
  const databasePath = join(options.userDataPath, options.filename ?? "money-pig.sqlite3");
  mkdirSync(dirname(databasePath), { recursive: true });

  const SQL = await loadSqlJs();
  return existsSync(databasePath) ? new SQL.Database(readFileSync(databasePath)) : new SQL.Database();
}

export function persistLedgerDatabase(db: SqlJsDatabase, databasePath: string): void {
  writeFileSync(databasePath, Buffer.from(db.export()));
}
