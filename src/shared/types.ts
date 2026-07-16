export type TransactionType = "expense" | "income" | "transfer";
export type AccountKind = "cash" | "bank" | "credit" | "investment" | "asset" | "liability";

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: Exclude<TransactionType, "transfer">;
  color: string;
  icon: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  accountId: string;
  transferAccountId: string | null;
  categoryId: string | null;
  amount: number;
  occurredOn: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionView extends Transaction {
  accountName: string;
  transferAccountName: string | null;
  categoryName: string | null;
  categoryColor: string | null;
}

export interface DashboardSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  monthIncome: number;
  monthExpense: number;
  monthNet: number;
  topExpenseCategories: Array<{
    categoryId: string;
    name: string;
    color: string;
    total: number;
  }>;
}

export interface LedgerState {
  accounts: Account[];
  categories: Category[];
  transactions: TransactionView[];
  summary: DashboardSummary;
}

export interface TransactionInput {
  type: TransactionType;
  accountId: string;
  transferAccountId?: string | null;
  categoryId?: string | null;
  amount: number;
  occurredOn: string;
  note?: string;
}

export type AgentSourceType = "wechat" | "alipay" | "speech" | "plain-text";

export interface AgentParseRequest {
  sourceType: AgentSourceType;
  content: string;
}

export interface AgentDraftTransaction extends TransactionInput {
  id: string;
  source: string;
  confidence: number;
  warnings: string[];
}

export interface AgentParseResult {
  provider: "minimax" | "local";
  drafts: AgentDraftTransaction[];
  notes: string[];
}

export interface AccountInput {
  name: string;
  kind: AccountKind;
  currency: string;
  openingBalance: number;
}

export interface CategoryInput {
  name: string;
  type: Exclude<TransactionType, "transfer">;
  color: string;
  icon: string;
}

export interface MoneyPigApi {
  getState(): Promise<LedgerState>;
  createTransaction(input: TransactionInput): Promise<LedgerState>;
  createTransactions(inputs: TransactionInput[]): Promise<LedgerState>;
  deleteTransaction(id: string): Promise<LedgerState>;
  createAccount(input: AccountInput): Promise<LedgerState>;
  createCategory(input: CategoryInput): Promise<LedgerState>;
  parseTransactionsWithAgent(input: AgentParseRequest): Promise<AgentParseResult>;
  getDatabasePath(): Promise<string>;
}

export const IPC_CHANNELS = {
  getState: "ledger:get-state",
  createTransaction: "ledger:create-transaction",
  createTransactions: "ledger:create-transactions",
  deleteTransaction: "ledger:delete-transaction",
  createAccount: "ledger:create-account",
  createCategory: "ledger:create-category",
  parseTransactionsWithAgent: "agent:parse-transactions",
  getDatabasePath: "ledger:get-database-path"
} as const;
