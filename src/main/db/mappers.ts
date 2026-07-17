// Row → domain mappers for sql.js result sets.
// Centralised so the repository and any future query helpers agree on shape.

import type { Account, Category, TransactionView } from "../../shared/types.js";
import { centsToAmount } from "./money.js";

export interface AccountRowWithBalance {
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

export interface CategoryRow {
  id: string;
  name: string;
  type: Category["type"];
  color: string;
  icon: string;
  archived: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionViewRow {
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

export function mapAccount(row: AccountRowWithBalance): Account {
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

export function mapCategory(row: CategoryRow): Category {
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

export function mapTransactionView(row: TransactionViewRow): TransactionView {
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
