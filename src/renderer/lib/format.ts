// Currency, date and number formatting helpers shared across the renderer.
// Pure functions only — no React, no I/O.

export function formatMoney(value: number, currency = "CNY"): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatDateInput(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function compactMoney(value: number): string {
  if (Math.abs(value) >= 10000) {
    return `${Math.round(value / 1000) / 10}万`;
  }
  return String(Math.round(value));
}

export function padNumber(value: number): string {
  return String(value).padStart(2, "0");
}
