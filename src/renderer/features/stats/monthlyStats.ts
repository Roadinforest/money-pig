// Pure statistics computation for the Stats tab.
// No React, no IPC — easy to unit-test once we add a Vitest setup.

import type {
  Account,
  Category,
  ExchangeRatePoint,
  TransactionView
} from "../../../shared/types";
import { padNumber } from "../../lib/format";

export interface DailyPoint {
  day: number;
  income: number;
  expense: number;
  cumulativeNet: number;
}

export interface PieSlice {
  name: string;
  color: string;
  total: number;
  percent: number;
}

export interface WeekdayPoint {
  name: string;
  income: number;
  expense: number;
}

export interface MonthlyStats {
  dailyPoints: DailyPoint[];
  weekdayPoints: WeekdayPoint[];
  monthIncome: number;
  monthExpense: number;
  monthNet: number;
  transactionCount: number;
  savingsRate: number;
  averageDailyExpense: number;
  largestExpense: number;
  activeDays: number;
  incomeSlices: PieSlice[];
  expenseSlices: PieSlice[];
}

export interface CurrencyConversionResult {
  transactions: TransactionView[];
  missingCurrencies: string[];
}

export function convertTransactionsToCny(
  transactions: TransactionView[],
  ratePoints: ExchangeRatePoint[],
  useLatestRateForAllDates = false
): CurrencyConversionResult {
  const ratesByCurrency = new Map<string, ExchangeRatePoint[]>();
  for (const point of ratePoints) {
    const bucket = ratesByCurrency.get(point.currency) ?? [];
    bucket.push(point);
    ratesByCurrency.set(point.currency, bucket);
  }
  for (const bucket of ratesByCurrency.values()) {
    bucket.sort((left, right) => left.date.localeCompare(right.date));
  }

  const missingCurrencies = new Set<string>();
  const converted: TransactionView[] = [];
  for (const transaction of transactions) {
    const currency = transaction.accountCurrency.toUpperCase();
    if (currency === "CNY") {
      converted.push(transaction);
      continue;
    }

    const rates = ratesByCurrency.get(currency) ?? [];
    let applicable = useLatestRateForAllDates ? rates.at(-1) : undefined;
    if (!useLatestRateForAllDates) {
      for (const rate of rates) {
        if (rate.date > transaction.occurredOn) break;
        applicable = rate;
      }
    }
    if (!applicable) {
      missingCurrencies.add(currency);
      continue;
    }

    converted.push({
      ...transaction,
      amount: transaction.amount * applicable.cnyPerUnit,
      accountCurrency: "CNY"
    });
  }

  return {
    transactions: converted,
    missingCurrencies: [...missingCurrencies].sort()
  };
}

export function buildMonthlyStats(
  transactions: TransactionView[],
  categories: Category[],
  accountId: string,
  requestedMonth?: string
): MonthlyStats {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${padNumber(now.getMonth() + 1)}`;
  const monthKey = /^\d{4}-\d{2}$/.test(requestedMonth ?? "")
    ? requestedMonth!
    : currentMonth;
  const [year, monthNumber] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const monthPrefix = `${monthKey}-`;
  const dailyPoints: DailyPoint[] = Array.from({ length: daysInMonth }, (_, index) => ({
    day: index + 1,
    income: 0,
    expense: 0,
    cumulativeNet: 0
  }));
  const weekdayPoints: WeekdayPoint[] = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map(
    (name) => ({ name, income: 0, expense: 0 })
  );
  const categoryColors = new Map(categories.map((item) => [item.id, item.color]));
  const categoryTotals = {
    income: new Map<string, { name: string; color: string; total: number }>(),
    expense: new Map<string, { name: string; color: string; total: number }>()
  };
  let monthIncome = 0;
  let monthExpense = 0;
  let transactionCount = 0;
  let largestExpense = 0;
  const activeDays = new Set<number>();

  for (const transaction of transactions) {
    if (!transaction.occurredOn.startsWith(monthPrefix) || transaction.type === "transfer") {
      continue;
    }
    if (accountId !== "all" && transaction.accountId !== accountId) {
      continue;
    }

    const day = Number(transaction.occurredOn.slice(8, 10));
    const point = dailyPoints[day - 1];
    if (!point) {
      continue;
    }

    transactionCount += 1;
    activeDays.add(day);
    const jsWeekday = new Date(`${transaction.occurredOn}T00:00:00`).getDay();
    const weekday = weekdayPoints[(jsWeekday + 6) % 7];
    if (transaction.type === "income") {
      point.income += transaction.amount;
      weekday.income += transaction.amount;
      monthIncome += transaction.amount;
    } else {
      point.expense += transaction.amount;
      weekday.expense += transaction.amount;
      monthExpense += transaction.amount;
      largestExpense = Math.max(largestExpense, transaction.amount);
    }

    const bucket = categoryTotals[transaction.type];
    const name = transaction.categoryName ?? "未分类";
    const key = transaction.categoryId ?? name;
    const current = bucket.get(key) ?? {
      name,
      color: transaction.categoryColor ?? categoryColors.get(transaction.categoryId ?? "") ?? "#8a928c",
      total: 0
    };
    current.total += transaction.amount;
    bucket.set(key, current);
  }

  let cumulativeNet = 0;
  for (const point of dailyPoints) {
    cumulativeNet += point.income - point.expense;
    point.cumulativeNet = cumulativeNet;
  }

  const elapsedDays = monthKey === currentMonth ? now.getDate() : daysInMonth;

  return {
    dailyPoints,
    weekdayPoints,
    monthIncome,
    monthExpense,
    monthNet: monthIncome - monthExpense,
    transactionCount,
    savingsRate: monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome) * 100 : 0,
    averageDailyExpense: monthExpense / Math.max(elapsedDays, 1),
    largestExpense,
    activeDays: activeDays.size,
    incomeSlices: buildPieSlices([...categoryTotals.income.values()]),
    expenseSlices: buildPieSlices([...categoryTotals.expense.values()])
  };
}

export function buildPieSlices(
  items: Array<{ name: string; color: string; total: number }>
): PieSlice[] {
  const sorted = items.filter((item) => item.total > 0).sort((a, b) => b.total - a.total);
  const total = sorted.reduce((sum, item) => sum + item.total, 0);
  if (total <= 0) {
    return [];
  }

  return sorted.map((item) => ({
    ...item,
    percent: (item.total / total) * 100
  }));
}

export interface AccountChartEntry extends Account {
  ratio: number;
}

export interface AccountStats {
  activeCount: number;
  assetCount: number;
  liabilityCount: number;
  averageBalance: number;
  chartAccounts: AccountChartEntry[];
}

export function buildAccountStats(accounts: Account[]): AccountStats {
  const activeAccounts = accounts.filter((item) => !item.archived);
  const assetKinds = new Set<Account["kind"]>(["cash", "bank", "investment", "asset"]);
  const liabilityKinds = new Set<Account["kind"]>(["credit", "liability"]);
  const chartAccounts = activeAccounts
    .slice()
    .sort((a, b) => Math.abs(b.currentBalance) - Math.abs(a.currentBalance))
    .slice(0, 8);
  const maxBalance = Math.max(...chartAccounts.map((item) => Math.abs(item.currentBalance)), 1);

  return {
    activeCount: activeAccounts.length,
    assetCount: activeAccounts.filter((item) => assetKinds.has(item.kind)).length,
    liabilityCount: activeAccounts.filter((item) => liabilityKinds.has(item.kind)).length,
    averageBalance:
      activeAccounts.length > 0
        ? activeAccounts.reduce((sum, item) => sum + item.currentBalance, 0) / activeAccounts.length
        : 0,
    chartAccounts: chartAccounts.map((item) => ({
      ...item,
      ratio: Math.max(6, (Math.abs(item.currentBalance) / maxBalance) * 100)
    }))
  };
}
