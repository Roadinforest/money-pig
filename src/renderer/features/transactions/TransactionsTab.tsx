import { Filter, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  Account,
  Category,
  TransactionType,
  TransactionUpdateInput,
  TransactionView
} from "../../../shared/types";
import { IconButton } from "../../components/IconButton";
import { PanelTitle } from "../../components/PanelTitle";
import { Select } from "../../components/Select";
import { transactionTypeLabels } from "../../lib/labels";
import { TransactionRow } from "../ledger/TransactionRow";

type SortKey = "date" | "amount";
type SortDirection = "desc" | "asc";
type TypeFilter = "all" | TransactionType;

export function TransactionsTab({
  accounts,
  categories,
  transactions,
  onUpdateTransaction,
  onDeleteTransaction
}: {
  accounts: Account[];
  categories: Category[];
  transactions: TransactionView[];
  onUpdateTransaction(input: TransactionUpdateInput): Promise<void>;
  onDeleteTransaction(id: string): Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [accountId, setAccountId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const visibleTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filtered = transactions.filter((item) => {
      if (type !== "all" && item.type !== type) return false;
      if (
        accountId !== "all" &&
        item.accountId !== accountId &&
        item.transferAccountId !== accountId
      ) {
        return false;
      }
      if (categoryId !== "all" && item.categoryId !== categoryId) return false;
      if (dateFrom && item.occurredOn < dateFrom) return false;
      if (dateTo && item.occurredOn > dateTo) return false;
      if (!normalizedQuery) return true;

      return [
        item.note,
        item.accountName,
        item.transferAccountName ?? "",
        item.categoryName ?? "",
        transactionTypeLabels[item.type]
      ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
    });

    const direction = sortDirection === "asc" ? 1 : -1;
    return [...filtered].sort((left, right) => {
      const primary =
        sortKey === "amount"
          ? left.amount - right.amount
          : left.occurredOn.localeCompare(right.occurredOn);
      if (primary !== 0) return primary * direction;
      return left.createdAt.localeCompare(right.createdAt) * direction;
    });
  }, [
    accountId,
    categoryId,
    dateFrom,
    dateTo,
    query,
    sortDirection,
    sortKey,
    transactions,
    type
  ]);

  function resetFilters() {
    setQuery("");
    setType("all");
    setAccountId("all");
    setCategoryId("all");
    setDateFrom("");
    setDateTo("");
    setSortKey("date");
    setSortDirection("desc");
  }

  return (
    <section className="transactions-page">
      <section className="panel transaction-filters-panel">
        <div className="transactions-panel-heading">
          <PanelTitle icon={<Filter size={18} />} title="筛选与排序" />
          <IconButton title="重置筛选" onClick={resetFilters}>
            <RotateCcw size={17} />
          </IconButton>
        </div>

        <div className="transaction-filters">
          <label className="transaction-query">
            搜索
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="备注、账户或分类"
            />
          </label>
          <label>
            类型
            <Select
              value={type}
              onChange={(value) => setType(value as TypeFilter)}
              options={[
                { value: "all", label: "全部类型" },
                ...Object.entries(transactionTypeLabels).map(([value, label]) => ({
                  value,
                  label
                }))
              ]}
            />
          </label>
          <label>
            账户
            <Select
              value={accountId}
              onChange={setAccountId}
              options={[
                { value: "all", label: "全部账户" },
                ...accounts.map((item) => ({
                  value: item.id,
                  label: `${item.name} · ${item.currency}${item.archived ? "（已归档）" : ""}`
                }))
              ]}
            />
          </label>
          <label>
            分类
            <Select
              value={categoryId}
              onChange={setCategoryId}
              options={[
                { value: "all", label: "全部分类" },
                ...categories.map((item) => ({
                  value: item.id,
                  label: item.name + (item.archived ? "（已归档）" : "")
                }))
              ]}
            />
          </label>
          <label>
            开始日期
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>
          <label>
            结束日期
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </label>
          <label>
            排序字段
            <Select
              value={sortKey}
              onChange={(value) => setSortKey(value as SortKey)}
              options={[
                { value: "date", label: "按日期" },
                { value: "amount", label: "按金额" }
              ]}
            />
          </label>
          <label>
            排序方向
            <Select
              value={sortDirection}
              onChange={(value) => setSortDirection(value as SortDirection)}
              options={[
                { value: "desc", label: "从高到低 / 从新到旧" },
                { value: "asc", label: "从低到高 / 从旧到新" }
              ]}
            />
          </label>
        </div>
      </section>

      <section className="panel transactions-list-panel">
        <div className="transactions-list-heading">
          <PanelTitle icon={<Filter size={18} />} title="全部流水" />
          <span>
            显示 {visibleTransactions.length} / {transactions.length} 笔
          </span>
        </div>
        <div className="ledger-list transactions-list">
          {visibleTransactions.length === 0 ? (
            <div className="empty-row">没有符合条件的流水</div>
          ) : (
            visibleTransactions.map((item) => (
              <TransactionRow
                key={item.id}
                transaction={item}
                accounts={accounts}
                categories={categories}
                onUpdate={onUpdateTransaction}
                onDelete={onDeleteTransaction}
              />
            ))
          )}
        </div>
      </section>
    </section>
  );
}
