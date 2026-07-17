// Date helpers used by both the local parser and the Minimax draft normaliser.
// Pure functions, no I/O.

function pad(value: string | number): string {
  return String(value).padStart(2, "0");
}

export function dateOffsetText(offsetDays: number): string {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function todayText(): string {
  return dateOffsetText(0);
}

export function extractDate(text: string): string | null {
  const full = text.match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (full) {
    return `${full[1]}-${pad(full[2])}-${pad(full[3])}`;
  }

  const partial = text.match(/(\d{1,2})[-/月](\d{1,2})/);
  if (partial) {
    return `${new Date().getFullYear()}-${pad(partial[1])}-${pad(partial[2])}`;
  }

  return null;
}

export function extractRelativeDate(text: string): string | null {
  if (/前天/.test(text)) return dateOffsetText(-2);
  if (/昨天|昨日/.test(text)) return dateOffsetText(-1);
  if (/今天|今日/.test(text)) return dateOffsetText(0);
  if (/明天|明日/.test(text)) return dateOffsetText(1);
  if (/后天/.test(text)) return dateOffsetText(2);
  return null;
}

export function resolveDateFromText(text: string): string | null {
  return extractDate(text) ?? extractRelativeDate(text);
}

export function normalizeDate(value: string | undefined): string | null {
  if (!value) return null;
  return extractDate(value) ?? (/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);
}
