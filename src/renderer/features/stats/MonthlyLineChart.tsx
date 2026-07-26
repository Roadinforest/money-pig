import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { compactMoney, formatMoney } from "../../lib/format";
import type { DailyPoint } from "./monthlyStats";

export function MonthlyLineChart({ points }: { points: DailyPoint[] }) {
  return (
    <div className="recharts-frame trend-chart">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 12, right: 10, bottom: 2, left: 2 }}>
          <CartesianGrid stroke="#ece8dc" strokeDasharray="3 5" vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6b736d", fontSize: 11 }}
            interval={4}
            tickFormatter={(day) => `${day}日`}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6b736d", fontSize: 11 }}
            tickFormatter={(value) => compactMoney(Number(value))}
            width={58}
          />
          <Tooltip
            cursor={{ fill: "rgb(38 114 93 / 6%)" }}
            contentStyle={{
              border: "1px solid #ded9cc",
              borderRadius: 8,
              background: "#fffefa",
              boxShadow: "0 8px 24px rgb(35 45 40 / 12%)"
            }}
            labelFormatter={(day) => `${day} 日`}
            formatter={(value, name) => [
              formatMoney(Number(value)),
              name === "income" ? "收入" : name === "expense" ? "支出" : "累计结余"
            ]}
          />
          <Legend
            iconType="circle"
            formatter={(value) =>
              value === "income" ? "收入" : value === "expense" ? "支出" : "累计结余"
            }
          />
          <ReferenceLine y={0} stroke="#c8c2b5" />
          <Bar dataKey="income" fill="#5fa786" radius={[4, 4, 0, 0]} maxBarSize={16} />
          <Bar dataKey="expense" fill="#e5a45e" radius={[4, 4, 0, 0]} maxBarSize={16} />
          <Line
            type="monotone"
            dataKey="cumulativeNet"
            stroke="#315f9a"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: "#315f9a" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
