// Centralised conversion of unknown thrown values into user-facing strings.
// Use this around IPC / async boundaries so toast / banner copy stays consistent.

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
