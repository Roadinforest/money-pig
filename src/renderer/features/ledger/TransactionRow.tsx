// Single-row renderer for the ledger transaction list.
// Owns row-level edit state; persistence stays in the parent.

import { useState } from "react";
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, Edit3, Trash2 } from "lucide-react";
import type {
  Account,
  Category,
  TransactionUpdateInput,
  TransactionView
} from "../../../shared/types";
import { formatMoney } from "../../lib/format";
import { transactionTypeLabels } from "../../lib/labels";
import { IconButton } from "../../components/IconButton";
import { TransactionEditForm } from "./TransactionEditForm";

export function TransactionRow({
  transaction,
  accounts,
  categories,
  onUpdate,
  onDelete
}: {
  transaction: TransactionView;
  accounts: Account[];
  categories: Category[];
  onUpdate(input: TransactionUpdateInput): Promise<void>;
  onDelete(id: string): Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <TransactionEditForm
        transaction={transaction}
        accounts={accounts}
        categories={categories}
        onSubmit={async (input) => {
          await onUpdate(input);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const sign = transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : "";
  const sourceAccount = `${transaction.accountName}（${transaction.accountCurrency}）`;
  const targetAccount = transaction.transferAccountName
    ? `${transaction.transferAccountName}（${transaction.transferAccountCurrency ?? ""}）`
    : null;
  const title =
    transaction.type === "transfer"
      ? `${sourceAccount} → ${targetAccount}`
      : transaction.categoryName ?? transactionTypeLabels[transaction.type];
  const details =
    transaction.type === "transfer"
      ? [transaction.occurredOn, transaction.note].filter(Boolean).join(" · ")
      : [transaction.occurredOn, sourceAccount, transaction.note]
          .filter(Boolean)
          .join(" · ");

  return (
    <article className={`transaction-row ${transaction.type}`}>
      <div className="transaction-icon">
        {transaction.type === "expense" ? <ArrowUpRight size={17} /> : null}
        {transaction.type === "income" ? <ArrowDownLeft size={17} /> : null}
        {transaction.type === "transfer" ? <ArrowRightLeft size={17} /> : null}
      </div>
      <div className="transaction-main">
        <strong>{title}</strong>
        <span>{details}</span>
      </div>
      <b>{sign + formatMoney(transaction.amount, transaction.accountCurrency)}</b>
      <div className="transaction-row-actions">
        <IconButton small title="编辑" onClick={() => setEditing(true)}>
          <Edit3 size={15} />
        </IconButton>
        <IconButton small title="删除" onClick={() => void onDelete(transaction.id)}>
          <Trash2 size={16} />
        </IconButton>
      </div>
    </article>
  );
}
