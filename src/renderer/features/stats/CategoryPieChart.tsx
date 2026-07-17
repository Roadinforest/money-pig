// Pure presentational pie chart built from conic-gradient — no charting library.

import { formatMoney } from "../../lib/format";
import type { PieSlice } from "./monthlyStats";

export function CategoryPieChart({
  slices,
  emptyText
}: {
  slices: PieSlice[];
  emptyText: string;
}) {
  if (slices.length === 0) {
    return <div className="empty-row">{emptyText}</div>;
  }

  let cursor = 0;
  const gradient = slices
    .map((slice) => {
      const start = cursor;
      cursor += slice.percent;
      return `${slice.color} ${start}% ${cursor}%`;
    })
    .join(", ");

  return (
    <div className="pie-chart">
      <div className="pie-visual" style={{ background: `conic-gradient(${gradient})` }} />
      <div className="pie-legend">
        {slices.map((slice) => (
          <div className="pie-legend-row" key={slice.name}>
            <span style={{ background: slice.color }} />
            <b>{slice.name}</b>
            <strong>{formatMoney(slice.total)}</strong>
            <em>{slice.percent.toFixed(1)}%</em>
          </div>
        ))}
      </div>
    </div>
  );
}
