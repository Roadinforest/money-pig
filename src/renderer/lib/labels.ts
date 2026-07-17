// Centralised, type-safe label maps for enum-like domain fields.
// Importing this keeps UI strings consistent across all tabs.

import type { Account, TransactionType } from "../../shared/types";

export const accountKindLabels: Record<Account["kind"], string> = {
  cash: "现金",
  bank: "银行",
  credit: "信用",
  investment: "投资",
  asset: "资产",
  liability: "负债"
};

export const transactionTypeLabels: Record<TransactionType, string> = {
  expense: "支出",
  income: "收入",
  transfer: "转账"
};
