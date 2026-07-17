// Single-row renderer for the ledger transaction list.
// Pure presentation — the parent owns deletion.

import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, Trash2 } from "lucide-react";
import type { TransactionView } from "../../../shared/types";
import { formatMoney } from "../../lib/format";
import { transactionTypeLabels } from "../../lib/labels";
import { IconButton } from "../../components/IconButton";

export function TransactionRow({
  transaction,
  onDelete
}: {
  transaction: TransactionView;
  onDelete(id: string): Promise<void>;
}) {
  const sign = transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : "";
  const title =
    transaction.type === "transfer"
      ? `${transaction.accountName} -> ${transaction.transferAccountName}`
      : transaction.categoryName ?? transactionTypeLabels[transaction.type];

  return (
    <article className={`transaction-row ${transaction.type}`}>
      <div className="transaction-icon">
        {transaction.type === "expense" ? <ArrowUpRight size={17} /> : null}
        {transaction.type === "income" ? <ArrowDownLeft size={17} /> : null}
        {transaction.type === "transfer" ? <ArrowRightLeft size={17} /> : null}
      </div>
      <div className="transaction-main">
        <strong>{title}</strong>
        <span>
          {transaction.occurredOn} · {transaction.note || transaction.accountName}
        </span>
      </div>
      <b>{sign + formatMoney(transaction.amount)}</b>
      <IconButton
        small
        title="删除"
        onClick={() => void onDelete(transaction.id)}
      >
        <Trash2 size={16} />
      </IconButton>
    </article>
  );
}
