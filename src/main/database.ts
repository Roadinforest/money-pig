// Re-export so existing imports (`./database.js`) keep working while the
// implementation lives in db/. Remove this shim once main.ts / ipc.ts are
// updated to import directly from `./db/ledger-repository.js`.

export { LedgerRepository } from "./db/ledger-repository.js";
