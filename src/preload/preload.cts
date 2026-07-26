import { contextBridge, ipcRenderer } from "electron";
import type {
  AccountInput,
  AccountUpdateInput,
  AgentParseRequest,
  AgentSettings,
  CategoryInput,
  ExchangeRateRequest,
  MoneyPigApi,
  TransactionInput,
  TransactionUpdateInput
} from "../shared/types.js";

const IPC_CHANNELS = {
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

const api: MoneyPigApi = {
  getState: () => ipcRenderer.invoke(IPC_CHANNELS.getState),
  createTransaction: (input: TransactionInput) => ipcRenderer.invoke(IPC_CHANNELS.createTransaction, input),
  createTransactions: (inputs: TransactionInput[]) => ipcRenderer.invoke(IPC_CHANNELS.createTransactions, inputs),
  updateTransaction: (input: TransactionUpdateInput) => ipcRenderer.invoke(IPC_CHANNELS.updateTransaction, input),
  deleteTransaction: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.deleteTransaction, id),
  createAccount: (input: AccountInput) => ipcRenderer.invoke(IPC_CHANNELS.createAccount, input),
  updateAccount: (input: AccountUpdateInput) => ipcRenderer.invoke(IPC_CHANNELS.updateAccount, input),
  deleteAccount: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.deleteAccount, id),
  createCategory: (input: CategoryInput) => ipcRenderer.invoke(IPC_CHANNELS.createCategory, input),
  getCnyExchangeRates: (input: ExchangeRateRequest) =>
    ipcRenderer.invoke(IPC_CHANNELS.getCnyExchangeRates, input),
  parseTransactionsWithAgent: (input: AgentParseRequest) =>
    ipcRenderer.invoke(IPC_CHANNELS.parseTransactionsWithAgent, input),
  getAgentSettings: () => ipcRenderer.invoke(IPC_CHANNELS.getAgentSettings),
  saveAgentSettings: (input: AgentSettings) => ipcRenderer.invoke(IPC_CHANNELS.saveAgentSettings, input),
  getDatabasePath: () => ipcRenderer.invoke(IPC_CHANNELS.getDatabasePath)
};

contextBridge.exposeInMainWorld("moneyPig", api);
