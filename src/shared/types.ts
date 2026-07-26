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
  accountCurrency: string;
  transferAccountName: string | null;
  transferAccountCurrency: string | null;
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

export interface TransactionUpdateInput extends TransactionInput {
  id: string;
}

export type AgentSourceType = "wechat" | "alipay" | "speech" | "plain-text" | "image";

export interface AgentParseRequest {
  sourceType: AgentSourceType;
  content: string;
  imageDataUrls?: string[];
  imageDataUrl?: string;
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

export interface AgentSettings {
  provider: "minimax";
  apiKey: string;
  baseUrl: string;
  model: string;
  updatedAt: string | null;
}

export interface AccountInput {
  name: string;
  kind: AccountKind;
  currency: string;
  openingBalance: number;
}

export interface AccountUpdateInput extends AccountInput {
  id: string;
}

export interface CategoryInput {
  name: string;
  type: Exclude<TransactionType, "transfer">;
  color: string;
  icon: string;
}

export interface ExchangeRateRequest {
  currencies: string[];
  from: string;
  to: string;
}

export interface ExchangeRatePoint {
  currency: string;
  date: string;
  cnyPerUnit: number;
}

export interface ExchangeRateResult {
  baseCurrency: "CNY";
  points: ExchangeRatePoint[];
  fetchedAt: string;
  source: "Frankfurter" | "ExchangeRate-API";
  rateMode: "historical" | "latest-fallback";
}

export interface MoneyPigApi {
  getState(): Promise<LedgerState>;
  createTransaction(input: TransactionInput): Promise<LedgerState>;
  createTransactions(inputs: TransactionInput[]): Promise<LedgerState>;
  updateTransaction(input: TransactionUpdateInput): Promise<LedgerState>;
  deleteTransaction(id: string): Promise<LedgerState>;
  createAccount(input: AccountInput): Promise<LedgerState>;
  updateAccount(input: AccountUpdateInput): Promise<LedgerState>;
  deleteAccount(id: string): Promise<LedgerState>;
  createCategory(input: CategoryInput): Promise<LedgerState>;
  getCnyExchangeRates(input: ExchangeRateRequest): Promise<ExchangeRateResult>;
  parseTransactionsWithAgent(input: AgentParseRequest): Promise<AgentParseResult>;
  getAgentSettings(): Promise<AgentSettings>;
  saveAgentSettings(input: AgentSettings): Promise<AgentSettings>;
  getDatabasePath(): Promise<string>;
}

export const IPC_CHANNELS = {
  getState: "ledger:get-state",
  createTransaction: "ledger:create-transaction",
  createTransactions: "ledger:create-transactions",
  updateTransaction: "ledger:update-transaction",
  deleteTransaction: "ledger:delete-transaction",
  createAccount: "ledger:create-account",
  updateAccount: "ledger:update-account",
  deleteAccount: "ledger:delete-account",
  createCategory: "ledger:create-category",
  getCnyExchangeRates: "exchange-rates:get-cny",
  parseTransactionsWithAgent: "agent:parse-transactions",
  getAgentSettings: "agent:get-settings",
  saveAgentSettings: "agent:save-settings",
  getDatabasePath: "ledger:get-database-path"
} as const;
