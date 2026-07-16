import { ipcMain } from "electron";
import type { AccountInput, CategoryInput, TransactionInput } from "../shared/types.js";
import { IPC_CHANNELS } from "../shared/types.js";
import type { LedgerRepository } from "./database.js";

export function registerLedgerIpc(repository: LedgerRepository): void {
  ipcMain.handle(IPC_CHANNELS.getState, () => repository.getState());
  ipcMain.handle(IPC_CHANNELS.getDatabasePath, () => repository.getDatabasePath());

  ipcMain.handle(IPC_CHANNELS.createTransaction, (_event, input: TransactionInput) =>
    repository.createTransaction(input)
  );

  ipcMain.handle(IPC_CHANNELS.deleteTransaction, (_event, id: string) => repository.deleteTransaction(id));

  ipcMain.handle(IPC_CHANNELS.createAccount, (_event, input: AccountInput) => repository.createAccount(input));

  ipcMain.handle(IPC_CHANNELS.createCategory, (_event, input: CategoryInput) => repository.createCategory(input));
}
