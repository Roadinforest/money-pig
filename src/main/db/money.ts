// Tiny utilities shared by the database layer.
// Kept dependency-free so other modules (e.g. tests) can import them safely.

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function centsToAmount(cents: number): number {
  return cents / 100;
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function assertNonEmpty(value: string, message: string): void {
  if (!value.trim()) {
    throw new Error(message);
  }
}
