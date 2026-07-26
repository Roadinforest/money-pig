// Default seed data plus idempotent defaults added to existing installations.

import type { AccountInput, CategoryInput } from "../../shared/types.js";
import type { Database as SqlJsDatabase } from "sql.js";
import { isoNow, toCents } from "./money.js";

const DEFAULT_CURRENCY = "CNY";

const defaultAccounts: AccountInput[] = [
  { name: "现金", kind: "cash", currency: DEFAULT_CURRENCY, openingBalance: 0 },
  { name: "银行卡", kind: "bank", currency: DEFAULT_CURRENCY, openingBalance: 0 },
  { name: "信用卡", kind: "credit", currency: DEFAULT_CURRENCY, openingBalance: 0 }
];

const defaultCategories: CategoryInput[] = [
  { name: "餐饮", type: "expense", color: "#f97316", icon: "utensils" },
  { name: "交通", type: "expense", color: "#2563eb", icon: "car" },
  { name: "购物", type: "expense", color: "#db2777", icon: "shopping-bag" },
  { name: "住房", type: "expense", color: "#7c3aed", icon: "home" },
  { name: "娱乐", type: "expense", color: "#0f766e", icon: "ticket" },
  { name: "医疗", type: "expense", color: "#dc2626", icon: "heart-pulse" },
  { name: "订阅支出", type: "expense", color: "#6366f1", icon: "repeat" },
  { name: "工资", type: "income", color: "#16a34a", icon: "wallet" },
  { name: "投资收益", type: "income", color: "#0891b2", icon: "line-chart" },
  { name: "副业", type: "income", color: "#65a30d", icon: "briefcase" },
  { name: "其他", type: "income", color: "#64748b", icon: "circle-ellipsis" }
];

function countRows(db: SqlJsDatabase, table: string): number {
  const result = db.exec(`select count(*) as count from ${table}`);
  const rows = result[0]?.values[0];
  return Number(rows?.[0] ?? 0);
}

export function applySeed(db: SqlJsDatabase): void {
  if (countRows(db, "accounts") === 0) {
    const now = isoNow();
    for (const account of defaultAccounts) {
      db.run(
        `insert into accounts
          (id, name, kind, currency, opening_balance_cents, archived, created_at, updated_at)
         values (?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          crypto.randomUUID(),
          account.name,
          account.kind,
          account.currency,
          toCents(account.openingBalance),
          now,
          now
        ]
      );
    }
  }

  if (countRows(db, "categories") === 0) {
    const now = isoNow();
    for (const category of defaultCategories) {
      db.run(
        `insert into categories
          (id, name, type, color, icon, archived, created_at, updated_at)
         values (?, ?, ?, ?, ?, 0, ?, ?)`,
        [crypto.randomUUID(), category.name, category.type, category.color, category.icon, now, now]
      );
    }
  }

  ensureCategory(db, {
    name: "其他",
    type: "income",
    color: "#64748b",
    icon: "circle-ellipsis"
  });
  ensureCategory(db, {
    name: "订阅支出",
    type: "expense",
    color: "#6366f1",
    icon: "repeat"
  });
}

function ensureCategory(db: SqlJsDatabase, category: CategoryInput): void {
  const statement = db.prepare(
    "select count(*) as count from categories where name = ? and type = ?"
  );
  let exists = false;
  try {
    statement.bind([category.name, category.type]);
    if (statement.step()) {
      exists = Number(statement.getAsObject().count ?? 0) > 0;
    }
  } finally {
    statement.free();
  }

  if (exists) return;

  const now = isoNow();
  db.run(
    `insert into categories
      (id, name, type, color, icon, archived, created_at, updated_at)
     values (?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      crypto.randomUUID(),
      category.name,
      category.type,
      category.color,
      category.icon,
      now,
      now
    ]
  );
}
