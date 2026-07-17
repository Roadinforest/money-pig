// Inline SVG line chart for daily income/expense of the current month.

import { compactMoney } from "../../lib/format";
import type { DailyPoint } from "./monthlyStats";

export function MonthlyLineChart({ points }: { points: DailyPoint[] }) {
  const width = 720;
  const height = 260;
  const padding = { top: 18, right: 18, bottom: 34, left: 54 };
  const maxValue = Math.max(...points.flatMap((point) => [point.income, point.expense]), 1);
  const xFor = (index: number) =>
    padding.left + (index / Math.max(points.length - 1, 1)) * (width - padding.left - padding.right);
  const yFor = (value: number) =>
    height - padding.bottom - (value / maxValue) * (height - padding.top - padding.bottom);
  const pathFor = (key: "income" | "expense") =>
    points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index).toFixed(2)} ${yFor(point[key]).toFixed(2)}`)
      .join(" ");
  const ticks = [0, Math.round(maxValue / 2), Math.round(maxValue)];

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="当月收入和支出折线图">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={padding.left} x2={width - padding.right} y1={yFor(tick)} y2={yFor(tick)} />
            <text x={padding.left - 8} y={yFor(tick) + 4} textAnchor="end">
              {compactMoney(tick)}
            </text>
          </g>
        ))}
        <path className="income-line" d={pathFor("income")} />
        <path className="expense-line" d={pathFor("expense")} />
        {points.map((point, index) =>
          point.day === 1 || point.day === points.length || point.day % 5 === 0 ? (
            <text key={point.day} x={xFor(index)} y={height - 9} textAnchor="middle">
              {point.day}
            </text>
          ) : null
        )}
      </svg>
      <div className="chart-legend">
        <span className="income-dot">收入</span>
        <span className="expense-dot">支出</span>
      </div>
    </div>
  );
}
