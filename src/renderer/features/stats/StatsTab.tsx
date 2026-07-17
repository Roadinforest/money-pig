// Stats tab — metric tiles + monthly line chart + category pie charts.
// Scope selector and chart data live here; computation is delegated to monthlyStats.

import { BarChart3, ChartPie } from "lucide-react";
import type { Account, Category, TransactionView } from "../../../shared/types";
import { MetricCard } from "../../components/MetricCard";
import { PanelTitle } from "../../components/PanelTitle";
import { Select } from "../../components/Select";
import { MonthlyLineChart } from "./MonthlyLineChart";
import { CategoryPieChart } from "./CategoryPieChart";
import { buildMonthlyStats } from "./monthlyStats";

export function StatsTab({
  accounts,
  categories,
  transactions,
  accountId,
  onChangeAccount
}: {
  accounts: Account[];
  categories: Category[];
  transactions: TransactionView[];
  accountId: string;
  onChangeAccount(id: string): void;
}) {
  const stats = buildMonthlyStats(transactions, categories, accountId);

  return (
    <section className="stats-page">
      <section className="stats-toolbar panel">
        <PanelTitle icon={<BarChart3 size={18} />} title="统计范围" />
        <label>
          账户
          <Select
            value={accountId}
            onChange={onChangeAccount}
            options={[
              { value: "all", label: "全部账户" },
              ...accounts.map((item) => ({
                value: item.id,
                label: `${item.name}${item.archived ? "（已归档）" : ""}`
              }))
            ]}
          />
        </label>
      </section>

      <section className="summary-grid stats-summary-grid">
        <MetricCard label="当月收入" value={stats.monthIncome} tone="green" />
        <MetricCard label="当月支出" value={stats.monthExpense} tone="orange" />
        <MetricCard label="当月结余" value={stats.monthNet} tone="blue" />
        <MetricCard label="流水笔数" value={stats.transactionCount} tone="ink" format="number" />
      </section>

      <section className="panel stats-line-panel">
        <PanelTitle icon={<BarChart3 size={18} />} title="当月收支趋势" />
        <MonthlyLineChart points={stats.dailyPoints} />
      </section>

      <section className="stats-pies">
        <section className="panel">
          <PanelTitle icon={<ChartPie size={18} />} title="支出分类" />
          <CategoryPieChart slices={stats.expenseSlices} emptyText="暂无支出分类" />
        </section>
        <section className="panel">
          <PanelTitle icon={<ChartPie size={18} />} title="收入分类" />
          <CategoryPieChart slices={stats.incomeSlices} emptyText="暂无收入分类" />
        </section>
      </section>
    </section>
  );
}
