import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { compactMoney, formatMoney } from "../../lib/format";
import type { PieSlice } from "./monthlyStats";

export function CategoryBarChart({ slices }: { slices: PieSlice[] }) {
  const data = slices.slice(0, 7);
  if (data.length === 0) {
    return <div className="empty-row">暂无支出排行</div>;
  }

  return (
    <div className="recharts-frame category-bar-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 14, bottom: 2, left: 2 }}>
          <CartesianGrid stroke="#ece8dc" strokeDasharray="3 5" horizontal={false} />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6b736d", fontSize: 11 }}
            tickFormatter={(value) => compactMoney(Number(value))}
          />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#39433d", fontSize: 12 }}
            width={72}
          />
          <Tooltip
            cursor={{ fill: "rgb(38 114 93 / 6%)" }}
            formatter={(value) => formatMoney(Number(value))}
            contentStyle={{
              border: "1px solid #ded9cc",
              borderRadius: 8,
              background: "#fffefa"
            }}
          />
          <Bar dataKey="total" radius={[0, 5, 5, 0]} maxBarSize={22}>
            {data.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
