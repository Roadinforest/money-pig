import {
  Activity,
  BarChart3,
  CalendarDays,
  ChartPie,
  Gauge,
  Globe2,
  RefreshCw,
  Trophy
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type {
  Account,
  Category,
  ExchangeRateResult,
  TransactionView
} from "../../../shared/types";
import { MetricCard } from "../../components/MetricCard";
import { PanelTitle } from "../../components/PanelTitle";
import { Select } from "../../components/Select";
import { formatDateInput, formatMoney } from "../../lib/format";
import { errorMessage } from "../../lib/errors";
import { CategoryBarChart } from "./CategoryBarChart";
import { CategoryPieChart } from "./CategoryPieChart";
import { MonthlyLineChart } from "./MonthlyLineChart";
import { WeekdayRadarChart } from "./WeekdayRadarChart";
import { buildMonthlyStats, convertTransactionsToCny } from "./monthlyStats";

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
  const [month, setMonth] = useState(() => formatDateInput(new Date()).slice(0, 7));
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateResult | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState("");
  const [rateReloadKey, setRateReloadKey] = useState(0);

  const scopedTransactions = useMemo(
    () =>
      transactions.filter(
        (item) =>
          item.type !== "transfer" &&
          item.occurredOn.startsWith(`${month}-`) &&
          (accountId === "all" || item.accountId === accountId)
      ),
    [accountId, month, transactions]
  );
  const foreignCurrencies = useMemo(
    () =>
      [
        ...new Set(
          scopedTransactions
            .map((item) => item.accountCurrency.toUpperCase())
            .filter((currency) => currency !== "CNY")
        )
      ].sort(),
    [scopedTransactions]
  );
  const currencyKey = foreignCurrencies.join(",");

  useEffect(() => {
    let cancelled = false;
    if (!currencyKey) {
      setExchangeRates(null);
      setRateError("");
      setRateLoading(false);
      return;
    }

    const range = exchangeRateRange(month);
    setExchangeRates(null);
    setRateError("");
    setRateLoading(true);
    void window.moneyPig
      .getCnyExchangeRates({
        currencies: foreignCurrencies,
        from: range.from,
        to: range.to
      })
      .then((result) => {
        if (!cancelled) setExchangeRates(result);
      })
      .catch((error) => {
        if (!cancelled) setRateError(errorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setRateLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currencyKey, month, rateReloadKey]);

  const conversion = useMemo(
    () =>
      convertTransactionsToCny(
        scopedTransactions,
        exchangeRates?.points ?? [],
        exchangeRates?.rateMode === "latest-fallback"
      ),
    [exchangeRates, scopedTransactions]
  );
  const conversionReady =
    foreignCurrencies.length === 0 ||
    (!rateLoading &&
      !rateError &&
      exchangeRates !== null &&
      conversion.missingCurrencies.length === 0);
  const stats = buildMonthlyStats(
    conversionReady ? conversion.transactions : [],
    categories,
    "all",
    month
  );
  const latestRateDate = exchangeRates?.points.reduce(
    (latest, point) => (point.date > latest ? point.date : latest),
    ""
  );

  return (
    <section className="stats-page">
      <section className="stats-toolbar panel">
        <PanelTitle icon={<BarChart3 size={18} />} title="统计范围" />
        <div className="stats-scope-controls">
          <label>
            月份
            <input
              type="month"
              value={month}
              max={formatDateInput(new Date()).slice(0, 7)}
              onChange={(event) => {
                if (event.target.value) setMonth(event.target.value);
              }}
            />
          </label>
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
        </div>
      </section>

      <div
        className={`stats-rate-status ${
          rateLoading
            ? "loading"
            : rateError || conversion.missingCurrencies.length > 0
              ? "error"
              : "ready"
        }`}
      >
        <Globe2 size={17} />
        <span>
          {rateLoading
            ? `正在加载 ${foreignCurrencies.join("、")} → CNY 历史汇率…`
            : rateError
              ? `汇率加载失败：${rateError}`
              : conversion.missingCurrencies.length > 0
                ? `缺少 ${conversion.missingCurrencies.join("、")} 汇率，统计暂不可用`
                : foreignCurrencies.length > 0
                  ? exchangeRates?.rateMode === "latest-fallback"
                    ? `历史汇率不可用，已使用今日汇率换算 · 数据日期 ${latestRateDate}`
                    : `外币已按交易日期换算为人民币 · Frankfurter · 最新数据 ${latestRateDate}`
                  : "当前范围内全部为人民币流水，无需汇率换算"}
        </span>
        {exchangeRates?.source === "ExchangeRate-API" ? (
          <a
            href="https://www.exchangerate-api.com"
            target="_blank"
            rel="noreferrer"
            className="stats-rate-source"
          >
            Rates By Exchange Rate API
          </a>
        ) : null}
        {rateError ? (
          <button
            className="secondary-button fit"
            type="button"
            onClick={() => setRateReloadKey((value) => value + 1)}
          >
            <RefreshCw size={15} />
            重试
          </button>
        ) : null}
      </div>

      <section className="summary-grid stats-summary-grid">
        <MetricCard label="当月收入" value={stats.monthIncome} tone="green" />
        <MetricCard label="当月支出" value={stats.monthExpense} tone="orange" />
        <MetricCard label="当月结余" value={stats.monthNet} tone="blue" />
        <MetricCard label="流水笔数" value={stats.transactionCount} tone="ink" format="number" />
      </section>

      <section className="stats-insight-grid">
        <InsightCard
          icon={<Gauge size={18} />}
          label="储蓄率"
          value={`${stats.savingsRate.toFixed(1)}%`}
          hint="结余占收入比例"
          tone={stats.savingsRate >= 0 ? "green" : "red"}
        />
        <InsightCard
          icon={<CalendarDays size={18} />}
          label="日均支出"
          value={formatMoney(stats.averageDailyExpense)}
          hint="按本月已过天数"
          tone="orange"
        />
        <InsightCard
          icon={<Trophy size={18} />}
          label="最大单笔支出"
          value={formatMoney(stats.largestExpense)}
          hint="观察大额消费"
          tone="blue"
        />
        <InsightCard
          icon={<Activity size={18} />}
          label="活跃记账日"
          value={`${stats.activeDays} 天`}
          hint="本月有流水的日期"
          tone="ink"
        />
      </section>

      <section className="panel stats-line-panel">
        <PanelTitle icon={<BarChart3 size={18} />} title="每日收支与累计结余" />
        <MonthlyLineChart points={stats.dailyPoints} />
      </section>

      <section className="stats-detail-grid">
        <section className="panel">
          <PanelTitle icon={<BarChart3 size={18} />} title="支出分类排行" />
          <CategoryBarChart slices={stats.expenseSlices} />
        </section>
        <section className="panel">
          <PanelTitle icon={<Activity size={18} />} title="星期收支分布" />
          <WeekdayRadarChart points={stats.weekdayPoints} />
        </section>
      </section>

      <section className="stats-pies">
        <section className="panel">
          <PanelTitle icon={<ChartPie size={18} />} title="支出分类占比" />
          <CategoryPieChart slices={stats.expenseSlices} emptyText="暂无支出分类" />
        </section>
        <section className="panel">
          <PanelTitle icon={<ChartPie size={18} />} title="收入分类占比" />
          <CategoryPieChart slices={stats.incomeSlices} emptyText="暂无收入分类" />
        </section>
      </section>
    </section>
  );
}

function exchangeRateRange(month: string): { from: string; to: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(year, monthNumber - 1, 1);
  const fetchStart = new Date(start);
  fetchStart.setDate(fetchStart.getDate() - 7);
  const monthEnd = formatDateInput(new Date(year, monthNumber, 0));
  const today = formatDateInput(new Date());
  return {
    from: formatDateInput(fetchStart),
    to: monthEnd < today ? monthEnd : today
  };
}

function InsightCard({
  icon,
  label,
  value,
  hint,
  tone
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "green" | "red" | "orange" | "blue" | "ink";
}) {
  return (
    <article className={`stats-insight-card ${tone}`}>
      <div className="stats-insight-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{hint}</small>
      </div>
    </article>
  );
}
