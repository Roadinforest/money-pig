import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic } from "sql.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  Account,
  AccountInput,
  Category,
  CategoryInput,
  DashboardSummary,
  LedgerState,
  TransactionInput,
  TransactionView
} from "../shared/types.js";

type SqlValue = string | number | null;

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
  { name: "工资", type: "income", color: "#16a34a", icon: "wallet" },
  { name: "投资收益", type: "income", color: "#0891b2", icon: "line-chart" },
  { name: "副业", type: "income", color: "#65a30d", icon: "briefcase" }
];

export class LedgerRepository {
  private constructor(
    private readonly db: SqlJsDatabase,
    private readonly databasePath: string
  ) {
    this.db.run("pragma foreign_keys = ON");
    this.migrate();
    this.seed();
    this.persist();
  }

  static async open(userDataPath: string): Promise<LedgerRepository> {
    const databasePath = join(userDataPath, "money-pig.sqlite3");
    mkdirSync(dirname(databasePath), { recursive: true });

    const SQL: SqlJsStatic = await initSqlJs();
    const db = existsSync(databasePath) ? new SQL.Database(readFileSync(databasePath)) : new SQL.Database();
    return new LedgerRepository(db, databasePath);
  }

  getState(): LedgerState {
    return {
      accounts: this.getAccounts(),
      categories: this.getCategories(),
      transactions: this.getTransactions(),
      summary: this.getSummary()
    };
  }

  getDatabasePath(): string {
    return this.databasePath;
  }

  createAccount(input: AccountInput): LedgerState {
    assertNonEmpty(input.name, "账户名称不能为空");
    assertNonEmpty(input.currency, "币种不能为空");
    const now = isoNow();

    this.run(
      `insert into accounts
        (id, name, kind, currency, opening_balance_cents, archived, created_at, updated_at)
       values (?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        crypto.randomUUID(),
        input.name.trim(),
        input.kind,
        input.currency.trim().toUpperCase(),
        toCents(input.openingBalance),
        now,
        now
      ]
    );

    this.persist();
    return this.getState();
  }

  createCategory(input: CategoryInput): LedgerState {
    assertNonEmpty(input.name, "分类名称不能为空");
    assertNonEmpty(input.color, "分类颜色不能为空");
    const now = isoNow();

    this.run(
      `insert into categories
        (id, name, type, color, icon, archived, created_at, updated_at)
       values (?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        crypto.randomUUID(),
        input.name.trim(),
        input.type,
        input.color.trim(),
        input.icon.trim() || "circle",
        now,
        now
      ]
    );

    this.persist();
    return this.getState();
  }

  createTransaction(input: TransactionInput): LedgerState {
    this.insertTransaction(input);
    this.persist();
    return this.getState();
  }

  createTransactions(inputs: TransactionInput[]): LedgerState {
    if (inputs.length === 0) {
      throw new Error("没有可写入的交易");
    }

    this.db.run("begin");
    try {
      for (const input of inputs) {
        this.insertTransaction(input);
      }
      this.db.run("commit");
    } catch (error) {
      this.db.run("rollback");
      throw error;
    }

    this.persist();
    return this.getState();
  }

  deleteTransaction(id: string): LedgerState {
    assertNonEmpty(id, "交易 ID 不能为空");
    this.run("delete from transactions where id = ?", [id]);
    this.persist();
    return this.getState();
  }

  private migrate(): void {
    this.db.exec(`
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

  private seed(): void {
    const accountCount = this.get<{ count: number }>("select count(*) as count from accounts");
    if ((accountCount?.count ?? 0) === 0) {
      const now = isoNow();
      for (const account of defaultAccounts) {
        this.run(
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

    const categoryCount = this.get<{ count: number }>("select count(*) as count from categories");
    if ((categoryCount?.count ?? 0) === 0) {
      const now = isoNow();
      for (const category of defaultCategories) {
        this.run(
          `insert into categories
            (id, name, type, color, icon, archived, created_at, updated_at)
           values (?, ?, ?, ?, ?, 0, ?, ?)`,
          [crypto.randomUUID(), category.name, category.type, category.color, category.icon, now, now]
        );
      }
    }
  }

  private getAccounts(): Account[] {
    const rows = this.all<AccountRowWithBalance>(
      `select
        a.*,
        a.opening_balance_cents
          + coalesce(sum(
            case
              when t.type = 'income' and t.account_id = a.id then t.amount_cents
              when t.type = 'expense' and t.account_id = a.id then -t.amount_cents
              when t.type = 'transfer' and t.account_id = a.id then -t.amount_cents
              when t.type = 'transfer' and t.transfer_account_id = a.id then t.amount_cents
              else 0
            end
          ), 0) as current_balance_cents
       from accounts a
       left join transactions t on t.account_id = a.id or t.transfer_account_id = a.id
       group by a.id
       order by a.archived asc, a.created_at asc`
    );

    return rows.map(mapAccount);
  }

  private getCategories(): Category[] {
    return this.all<CategoryRow>("select * from categories order by archived asc, type asc, name asc").map(
      mapCategory
    );
  }

  private getTransactions(): TransactionView[] {
    const rows = this.all<TransactionViewRow>(
      `select
        t.*,
        a.name as account_name,
        ta.name as transfer_account_name,
        c.name as category_name,
        c.color as category_color
      from transactions t
      join accounts a on a.id = t.account_id
      left join accounts ta on ta.id = t.transfer_account_id
      left join categories c on c.id = t.category_id
      order by t.occurred_on desc, t.created_at desc
      limit 200`
    );

    return rows.map(mapTransactionView);
  }

  private getSummary(): DashboardSummary {
    const accounts = this.getAccounts();
    const assetKinds = new Set(["cash", "bank", "investment", "asset"]);
    const liabilityKinds = new Set(["credit", "liability"]);
    const totalAssets = accounts
      .filter((account) => assetKinds.has(account.kind))
      .reduce((sum, account) => sum + account.currentBalance, 0);
    const totalLiabilities = accounts
      .filter((account) => liabilityKinds.has(account.kind))
      .reduce((sum, account) => sum + Math.abs(Math.min(account.currentBalance, 0)), 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartText = monthStart.toISOString().slice(0, 10);
    const monthRows = this.all<{ type: "income" | "expense"; total_cents: number }>(
      `select type, coalesce(sum(amount_cents), 0) as total_cents
       from transactions
       where occurred_on >= ? and type in ('income', 'expense')
       group by type`,
      [monthStartText]
    );

    const monthIncome = centsToAmount(monthRows.find((row) => row.type === "income")?.total_cents ?? 0);
    const monthExpense = centsToAmount(monthRows.find((row) => row.type === "expense")?.total_cents ?? 0);

    const topRows = this.all<{ category_id: string; name: string; color: string; total_cents: number }>(
      `select c.id as category_id, c.name, c.color, sum(t.amount_cents) as total_cents
       from transactions t
       join categories c on c.id = t.category_id
       where t.type = 'expense' and t.occurred_on >= ?
       group by c.id
       order by total_cents desc
       limit 5`,
      [monthStartText]
    );

    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      monthIncome,
      monthExpense,
      monthNet: monthIncome - monthExpense,
      topExpenseCategories: topRows.map((row) => ({
        categoryId: row.category_id,
        name: row.name,
        color: row.color,
        total: centsToAmount(row.total_cents)
      }))
    };
  }

  private validateTransaction(input: TransactionInput): void {
    assertNonEmpty(input.accountId, "账户不能为空");
    assertNonEmpty(input.occurredOn, "日期不能为空");
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error("金额必须大于 0");
    }

    const account = this.get<{ id: string }>("select id from accounts where id = ? and archived = 0", [
      input.accountId
    ]);
    if (!account) {
      throw new Error("账户不存在或已归档");
    }

    if (input.type === "transfer") {
      assertNonEmpty(input.transferAccountId ?? "", "转入账户不能为空");
      if (input.transferAccountId === input.accountId) {
        throw new Error("转出和转入账户不能相同");
      }
      const target = this.get<{ id: string }>("select id from accounts where id = ? and archived = 0", [
        input.transferAccountId ?? ""
      ]);
      if (!target) {
        throw new Error("转入账户不存在或已归档");
      }
      return;
    }

    assertNonEmpty(input.categoryId ?? "", "分类不能为空");
    const category = this.get<{ id: string }>(
      "select id from categories where id = ? and type = ? and archived = 0",
      [input.categoryId ?? "", input.type]
    );
    if (!category) {
      throw new Error("分类不存在或类型不匹配");
    }
  }

  private insertTransaction(input: TransactionInput): void {
    this.validateTransaction(input);
    const now = isoNow();

    this.run(
      `insert into transactions
        (id, type, account_id, transfer_account_id, category_id, amount_cents, occurred_on, note, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        input.type,
        input.accountId,
        input.type === "transfer" ? input.transferAccountId ?? null : null,
        input.type === "transfer" ? null : input.categoryId ?? null,
        toCents(input.amount),
        input.occurredOn,
        input.note?.trim() ?? "",
        now,
        now
      ]
    );
  }

  private all<T extends object>(sql: string, params: SqlValue[] = []): T[] {
    const statement = this.db.prepare(sql);
    const rows: T[] = [];
    try {
      if (params.length > 0) {
        statement.bind(params);
      }
      while (statement.step()) {
        rows.push(statement.getAsObject() as T);
      }
      return rows;
    } finally {
      statement.free();
    }
  }

  private get<T extends object>(sql: string, params: SqlValue[] = []): T | undefined {
    return this.all<T>(sql, params)[0];
  }

  private run(sql: string, params: SqlValue[] = []): void {
    this.db.run(sql, params);
  }

  private persist(): void {
    writeFileSync(this.databasePath, Buffer.from(this.db.export()));
  }
}

interface AccountRowWithBalance {
  id: string;
  name: string;
  kind: Account["kind"];
  currency: string;
  opening_balance_cents: number;
  current_balance_cents: number;
  archived: number;
  created_at: string;
  updated_at: string;
}

interface CategoryRow {
  id: string;
  name: string;
  type: Category["type"];
  color: string;
  icon: string;
  archived: number;
  created_at: string;
  updated_at: string;
}

interface TransactionViewRow {
  id: string;
  type: TransactionView["type"];
  account_id: string;
  transfer_account_id: string | null;
  category_id: string | null;
  amount_cents: number;
  occurred_on: string;
  note: string;
  created_at: string;
  updated_at: string;
  account_name: string;
  transfer_account_name: string | null;
  category_name: string | null;
  category_color: string | null;
}

function mapAccount(row: AccountRowWithBalance): Account {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    currency: row.currency,
    openingBalance: centsToAmount(row.opening_balance_cents),
    currentBalance: centsToAmount(row.current_balance_cents),
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color,
    icon: row.icon,
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTransactionView(row: TransactionViewRow): TransactionView {
  return {
    id: row.id,
    type: row.type,
    accountId: row.account_id,
    transferAccountId: row.transfer_account_id,
    categoryId: row.category_id,
    amount: centsToAmount(row.amount_cents),
    occurredOn: row.occurred_on,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    accountName: row.account_name,
    transferAccountName: row.transfer_account_name,
    categoryName: row.category_name,
    categoryColor: row.category_color
  };
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function centsToAmount(cents: number): number {
  return cents / 100;
}

function isoNow(): string {
  return new Date().toISOString();
}

function assertNonEmpty(value: string, message: string): void {
  if (!value.trim()) {
    throw new Error(message);
  }
}
