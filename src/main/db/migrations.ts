// Idempotent DDL applied every time the database opens.
// New tables / indexes go here; existing rows keep working thanks to
// `if not exists` guards.

import type { Database as SqlJsDatabase } from "sql.js";

export function applyMigrations(db: SqlJsDatabase): void {
  db.exec(`
    create table if not exists schema_migrations (
      version integer primary key,
      applied_at text not null
    );

    create table if not exists accounts (
      id text primary key,
      name text not null,
      kind text not null check (kind in ('cash', 'bank', 'credit', 'investment', 'asset', 'liability')),
      currency text not null default 'CNY',
      opening_balance_cents integer not null default 0,
      archived integer not null default 0,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists categories (
      id text primary key,
      name text not null,
      type text not null check (type in ('expense', 'income')),
      color text not null,
      icon text not null,
      archived integer not null default 0,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists transactions (
      id text primary key,
      type text not null check (type in ('expense', 'income', 'transfer')),
      account_id text not null references accounts(id),
      transfer_account_id text references accounts(id),
      category_id text references categories(id),
      amount_cents integer not null check (amount_cents > 0),
      occurred_on text not null,
      note text not null default '',
      created_at text not null,
      updated_at text not null,
      check (
        (type = 'transfer' and transfer_account_id is not null and category_id is null)
        or
        (type in ('expense', 'income') and category_id is not null and transfer_account_id is null)
      )
    );

    create index if not exists idx_transactions_occurred_on on transactions(occurred_on desc);
    create index if not exists idx_transactions_account_id on transactions(account_id);
    create index if not exists idx_transactions_category_id on transactions(category_id);
  `);
}
