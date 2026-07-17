// Main repository for the ledger domain.
// Composes connection / migrations / seed / mappers / money helpers and
// exposes a stable API consumed by IPC handlers.

import type { Database as SqlJsDatabase } from "sql.js";
import { join } from "node:path";
import type {
  Account,
  AccountInput,
  AccountUpdateInput,
  Category,
  CategoryInput,
  DashboardSummary,
  LedgerState,
  TransactionInput,
  TransactionView
} from "../../shared/types.js";
import { openLedgerDatabase, persistLedgerDatabase } from "./connection.js";
import { applyMigrations } from "./migrations.js";
import { applySeed } from "./seed.js";
import { mapAccount, mapCategory, mapTransactionView, type AccountRowWithBalance, type CategoryRow, type TransactionViewRow } from "./mappers.js";
import { assertNonEmpty, centsToAmount, isoNow, toCents } from "./money.js";

type SqlValue = string | number | null;

export class LedgerRepository {
  private constructor(
    private readonly db: SqlJsDatabase,
    private readonly databasePath: string
  ) {
    this.db.run("pragma foreign_keys = ON");
    applyMigrations(this.db);
    applySeed(this.db);
    this.persist();
  }

  static async open(userDataPath: string): Promise<LedgerRepository> {
    const db = await openLedgerDatabase({ userDataPath });
    return new LedgerRepository(db, join(userDataPath, "money-pig.sqlite3"));
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

  updateAccount(input: AccountUpdateInput): LedgerState {
    assertNonEmpty(input.id, "账户 ID 不能为空");
    assertNonEmpty(input.name, "账户名称不能为空");
    assertNonEmpty(input.currency, "币种不能为空");
    const existing = this.get<{ id: string }>("select id from accounts where id = ?", [input.id]);
    if (!existing) {
      throw new Error("账户不存在");
    }

    this.run(
      `update accounts
       set name = ?, kind = ?, currency = ?, opening_balance_cents = ?, updated_at = ?
       where id = ?`,
      [
        input.name.trim(),
        input.kind,
        input.currency.trim().toUpperCase(),
        toCents(input.openingBalance),
        isoNow(),
        input.id
      ]
    );

    this.persist();
    return this.getState();
  }

  deleteAccount(id: string): LedgerState {
    assertNonEmpty(id, "账户 ID 不能为空");
    const existing = this.get<{ id: string }>("select id from accounts where id = ?", [id]);
    if (!existing) {
      throw new Error("账户不存在");
    }

    const references = this.get<{ count: number }>(
      "select count(*) as count from transactions where account_id = ? or transfer_account_id = ?",
      [id, id]
    );
    if ((references?.count ?? 0) > 0) {
      this.run("update accounts set archived = 1, updated_at = ? where id = ?", [isoNow(), id]);
    } else {
      this.run("delete from accounts where id = ?", [id]);
    }

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

  // ---- Private query helpers --------------------------------------------------

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
    persistLedgerDatabase(this.db, this.databasePath);
  }
}
