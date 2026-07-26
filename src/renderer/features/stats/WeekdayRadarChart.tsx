import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { formatMoney } from "../../lib/format";
import type { WeekdayPoint } from "./monthlyStats";

export function WeekdayRadarChart({ points }: { points: WeekdayPoint[] }) {
  const hasData = points.some((point) => point.income > 0 || point.expense > 0);
  if (!hasData) {
    return <div className="empty-row">暂无星期分布</div>;
  }

  return (
    <div className="recharts-frame weekday-radar-chart">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={points} outerRadius="72%">
          <PolarGrid stroke="#e3ded2" />
          <PolarAngleAxis dataKey="name" tick={{ fill: "#5d665f", fontSize: 12 }} />
          <Tooltip
            formatter={(value, name) => [
              formatMoney(Number(value)),
              name === "income" ? "收入" : "支出"
            ]}
            contentStyle={{
              border: "1px solid #ded9cc",
              borderRadius: 8,
              background: "#fffefa"
            }}
          />
          <Legend
            iconType="circle"
            formatter={(value) => (value === "income" ? "收入" : "支出")}
          />
          <Radar
            dataKey="income"
            stroke="#348260"
            fill="#5fa786"
            fillOpacity={0.18}
            strokeWidth={2}
          />
          <Radar
            dataKey="expense"
            stroke="#c2762f"
            fill="#e5a45e"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
