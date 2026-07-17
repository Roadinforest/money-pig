// Ledger tab — the home screen combining metric tiles, transaction entry form,
// top categories sidebar, and the transaction list.

import { FormEvent, useState } from "react";
import { Landmark, Plus, Tags, WalletCards } from "lucide-react";
import type {
  Account,
  AccountInput,
  Category,
  CategoryInput,
  DashboardSummary,
  TransactionInput,
  TransactionView
} from "../../../shared/types";
import { formatMoney } from "../../lib/format";
import { accountKindLabels } from "../../lib/labels";
import { MetricCard } from "../../components/MetricCard";
import { PanelTitle } from "../../components/PanelTitle";
import { TransactionForm } from "./TransactionForm";
import { TransactionRow } from "./TransactionRow";

export function LedgerTab({
  accounts,
  categories,
  transactions,
  summary,
  onCreateTransaction,
  onCreateAccount,
  onCreateCategory,
  onDeleteTransaction
}: {
  accounts: Account[];
  categories: Category[];
  transactions: TransactionView[];
  summary: DashboardSummary;
  onCreateTransaction(input: TransactionInput): Promise<void>;
  onCreateAccount(input: AccountInput): Promise<void>;
  onCreateCategory(input: CategoryInput): Promise<void>;
  onDeleteTransaction(id: string): Promise<void>;
}) {
  return (
    <>
      <section className="summary-grid">
        <MetricCard label="净资产" value={summary.netWorth} tone="ink" />
        <MetricCard label="总资产" value={summary.totalAssets} tone="green" />
        <MetricCard label="总负债" value={summary.totalLiabilities} tone="red" />
        <MetricCard label="本月结余" value={summary.monthNet} tone="blue" />
        <MetricCard label="本月收入" value={summary.monthIncome} tone="green" />
        <MetricCard label="本月支出" value={summary.monthExpense} tone="orange" />
      </section>

      <section className="workspace">
        <div className="left-column">
          <TransactionForm
            accounts={accounts}
            categories={categories}
            onSubmit={onCreateTransaction}
          />

          <section className="panel">
            <PanelTitle icon={<WalletCards size={18} />} title="账户" />
            <div className="account-list">
              {accounts.map((item) => (
                <article className="account-row" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{accountKindLabels[item.kind]}</span>
                  </div>
                  <b>{formatMoney(item.currentBalance, item.currency)}</b>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="panel ledger-panel">
          <PanelTitle icon={<Landmark size={18} />} title="流水" />
          <div className="ledger-list">
            {transactions.length === 0 ? (
              <div className="empty-row">暂无流水</div>
            ) : (
              transactions.map((item) => (
                <TransactionRow key={item.id} transaction={item} onDelete={onDeleteTransaction} />
              ))
            )}
          </div>
        </section>

        <div className="right-column">
          <section className="panel">
            <PanelTitle icon={<Tags size={18} />} title="本月支出" />
            <div className="category-rank">
              {summary.topExpenseCategories.length === 0 ? (
                <div className="empty-row">暂无支出</div>
              ) : (
                summary.topExpenseCategories.map((item) => (
                  <div className="rank-row" key={item.categoryId}>
                    <span style={{ background: item.color }} />
                    <b>{item.name}</b>
                    <strong>{formatMoney(item.total)}</strong>
                  </div>
                ))
              )}
            </div>
          </section>

          <CompactAccountForm onSubmit={onCreateAccount} />
          <CompactCategoryForm onSubmit={onCreateCategory} />
        </div>
      </section>
    </>
  );
}

// Inline subforms kept here because they only appear on the Ledger sidebar.
// Both own their own local state and only invoke the parent's submit handler.

function CompactAccountForm({ onSubmit }: { onSubmit(input: AccountInput): Promise<void> }) {
  const [draft, setDraft] = useState<AccountInput>({
    name: "",
    kind: "bank",
    currency: "CNY",
    openingBalance: 0
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ ...draft, openingBalance: Number(draft.openingBalance) });
    setDraft({ name: "", kind: "bank", currency: "CNY", openingBalance: 0 });
  }

  return (
    <section className="panel">
      <PanelTitle icon={<Plus size={18} />} title="新增账户" />
      <form className="compact-form" onSubmit={handleSubmit}>
        <label>
          名称
          <input
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            required
          />
        </label>
        <div className="two-fields">
          <label>
            类型
            <select
              value={draft.kind}
              onChange={(event) =>
                setDraft((current) => ({ ...current, kind: event.target.value as Account["kind"] }))
              }
            >
              {Object.entries(accountKindLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            初始
            <input
              type="number"
              step="0.01"
              value={draft.openingBalance}
              onChange={(event) =>
                setDraft((current) => ({ ...current, openingBalance: Number(event.target.value) }))
              }
            />
          </label>
        </div>
        <button className="secondary-button" type="submit">
          <Plus size={16} />
          添加
        </button>
      </form>
    </section>
  );
}

function CompactCategoryForm({ onSubmit }: { onSubmit(input: CategoryInput): Promise<void> }) {
  const [draft, setDraft] = useState<CategoryInput>({
    name: "",
    type: "expense",
    color: "#f97316",
    icon: "circle"
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(draft);
    setDraft({ name: "", type: draft.type, color: "#f97316", icon: "circle" });
  }

  return (
    <section className="panel">
      <PanelTitle icon={<Tags size={18} />} title="新增分类" />
      <form className="compact-form" onSubmit={handleSubmit}>
        <label>
          名称
          <input
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            required
          />
        </label>
        <div className="two-fields">
          <label>
            类型
            <select
              value={draft.type}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  type: event.target.value as Category["type"]
                }))
              }
            >
              <option value="expense">支出</option>
              <option value="income">收入</option>
            </select>
          </label>
          <label>
            颜色
            <input
              type="color"
              value={draft.color}
              onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))}
            />
          </label>
        </div>
        <button className="secondary-button" type="submit">
          <Plus size={16} />
          添加
        </button>
      </form>
    </section>
  );
}
