import { ipcMain } from "electron";
import type {
  AccountInput,
  AccountUpdateInput,
  AgentParseRequest,
  AgentSettings,
  CategoryInput,
  ExchangeRateRequest,
  TransactionInput,
  TransactionUpdateInput
} from "../shared/types.js";
import { IPC_CHANNELS } from "../shared/types.js";
import type { LedgerAgent } from "./agent.js";
import type { LedgerRepository } from "./database.js";
import type { SettingsRepository } from "./settings.js";
import { getCnyExchangeRates } from "./exchange-rates.js";

export function registerLedgerIpc(
  repository: LedgerRepository,
  agent: LedgerAgent,
  settings: SettingsRepository
): void {
  ipcMain.handle(IPC_CHANNELS.getState, () => repository.getState());
  ipcMain.handle(IPC_CHANNELS.getDatabasePath, () => repository.getDatabasePath());

  ipcMain.handle(IPC_CHANNELS.createTransaction, (_event, input: TransactionInput) =>
    repository.createTransaction(input)
  );

  ipcMain.handle(IPC_CHANNELS.createTransactions, (_event, inputs: TransactionInput[]) =>
    repository.createTransactions(inputs)
  );

  ipcMain.handle(IPC_CHANNELS.updateTransaction, (_event, input: TransactionUpdateInput) =>
    repository.updateTransaction(input)
  );

  ipcMain.handle(IPC_CHANNELS.deleteTransaction, (_event, id: string) => repository.deleteTransaction(id));

  ipcMain.handle(IPC_CHANNELS.createAccount, (_event, input: AccountInput) => repository.createAccount(input));

  ipcMain.handle(IPC_CHANNELS.updateAccount, (_event, input: AccountUpdateInput) => repository.updateAccount(input));

  ipcMain.handle(IPC_CHANNELS.deleteAccount, (_event, id: string) => repository.deleteAccount(id));

  ipcMain.handle(IPC_CHANNELS.createCategory, (_event, input: CategoryInput) => repository.createCategory(input));

  ipcMain.handle(IPC_CHANNELS.getCnyExchangeRates, (_event, input: ExchangeRateRequest) =>
    getCnyExchangeRates(input, repository)
  );

  ipcMain.handle(IPC_CHANNELS.parseTransactionsWithAgent, (_event, input: AgentParseRequest) =>
    agent.parseTransactions(input)
  );

  ipcMain.handle(IPC_CHANNELS.getAgentSettings, () => settings.getAgentSettings());

  ipcMain.handle(IPC_CHANNELS.saveAgentSettings, (_event, input: AgentSettings) =>
    settings.saveAgentSettings(input)
  );
}
