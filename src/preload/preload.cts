import { contextBridge, ipcRenderer } from "electron";
import type { AccountInput, CategoryInput, MoneyPigApi, TransactionInput } from "../shared/types.js";

const IPC_CHANNELS = {
  getState: "ledger:get-state",
  createTransaction: "ledger:create-transaction",
  deleteTransaction: "ledger:delete-transaction",
  createAccount: "ledger:create-account",
  createCategory: "ledger:create-category",
  getDatabasePath: "ledger:get-database-path"
} as const;

const api: MoneyPigApi = {
  getState: () => ipcRenderer.invoke(IPC_CHANNELS.getState),
  createTransaction: (input: TransactionInput) => ipcRenderer.invoke(IPC_CHANNELS.createTransaction, input),
  deleteTransaction: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.deleteTransaction, id),
  createAccount: (input: AccountInput) => ipcRenderer.invoke(IPC_CHANNELS.createAccount, input),
  createCategory: (input: CategoryInput) => ipcRenderer.invoke(IPC_CHANNELS.createCategory, input),
  getDatabasePath: () => ipcRenderer.invoke(IPC_CHANNELS.getDatabasePath)
};

contextBridge.exposeInMainWorld("moneyPig", api);
