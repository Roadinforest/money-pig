import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
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

  return (
    <div className="pie-chart">
      <div className="pie-visual">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="total"
              nameKey="name"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="none"
            >
              {slices.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatMoney(Number(value))}
              contentStyle={{
                border: "1px solid #ded9cc",
                borderRadius: 8,
                background: "#fffefa"
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
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
