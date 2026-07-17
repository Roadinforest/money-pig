// Reusable dashboard tile used by both Ledger and Stats tabs.
// Pure presentational — formatting is delegated to lib/format.

import { formatMoney } from "../lib/format";

export function MetricCard({
  label,
  value,
  tone,
  format = "money"
}: {
  label: string;
  value: number;
  tone: string;
  format?: "money" | "number";
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{format === "number" ? value : formatMoney(value)}</strong>
    </article>
  );
}
