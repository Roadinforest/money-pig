import type {
  ExchangeRatePoint,
  ExchangeRateRequest,
  ExchangeRateResult
} from "../shared/types.js";

const FRANKFURTER_URL = "https://api.frankfurter.dev/v2/rates";
const LATEST_FALLBACK_URL = "https://open.er-api.com/v6/latest/CNY";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_CURRENCY = /^[A-Z]{3}$/;
const cache = new Map<string, ExchangeRateResult>();

export interface ExchangeRateCacheStore {
  getExchangeRateCache(cacheKey: string): ExchangeRateResult | null;
  saveExchangeRateCache(cacheKey: string, result: ExchangeRateResult): void;
}

interface FrankfurterRate {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

interface LatestRateResponse {
  result: string;
  base_code: string;
  time_last_update_utc: string;
  rates: Record<string, number>;
}

export async function getCnyExchangeRates(
  input: ExchangeRateRequest,
  cacheStore: ExchangeRateCacheStore
): Promise<ExchangeRateResult> {
  if (!ISO_DATE.test(input.from) || !ISO_DATE.test(input.to) || input.from > input.to) {
    throw new Error("汇率查询日期范围无效");
  }

  const currencies = [...new Set(input.currencies.map((item) => item.trim().toUpperCase()))]
    .filter((item) => item !== "CNY");
  if (currencies.some((item) => !ISO_CURRENCY.test(item))) {
    throw new Error("账户币种必须使用三位 ISO 代码");
  }

  if (currencies.length === 0) {
    return {
      baseCurrency: "CNY",
      points: [],
      fetchedAt: new Date().toISOString(),
      source: "Frankfurter",
      rateMode: "historical"
    };
  }

  const cacheKey = `${input.from}:${input.to}:${currencies.slice().sort().join(",")}`;
  const memoryCached = cache.get(cacheKey);
  if (memoryCached && isCacheUsable(memoryCached)) return memoryCached;

  const databaseCached = cacheStore.getExchangeRateCache(cacheKey);
  if (databaseCached && isCacheUsable(databaseCached)) {
    cache.set(cacheKey, databaseCached);
    return databaseCached;
  }

  let result: ExchangeRateResult;
  try {
    result = await fetchHistoricalRates(input, currencies);
  } catch (historicalError) {
    try {
      result = await fetchLatestFallbackRates(currencies);
    } catch (fallbackError) {
      throw new Error(
        `历史汇率加载失败：${errorText(historicalError)}；今日汇率兜底也失败：${errorText(fallbackError)}`
      );
    }
  }

  cache.set(cacheKey, result);
  cacheStore.saveExchangeRateCache(cacheKey, result);
  return result;
}

async function fetchHistoricalRates(
  input: ExchangeRateRequest,
  currencies: string[]
): Promise<ExchangeRateResult> {
  const url = new URL(FRANKFURTER_URL);
  url.searchParams.set("base", "CNY");
  url.searchParams.set("quotes", currencies.join(","));
  url.searchParams.set("from", input.from);
  url.searchParams.set("to", input.to);

  const response = await fetchJson(url);
  const rows = response as FrankfurterRate[];
  if (!Array.isArray(rows)) {
    throw new Error("Frankfurter 返回了无效数据");
  }

  const points: ExchangeRatePoint[] = rows.flatMap((row) => {
    const quote = row.quote?.toUpperCase();
    if (
      row.base !== "CNY" ||
      !currencies.includes(quote) ||
      !ISO_DATE.test(row.date) ||
      !Number.isFinite(row.rate) ||
      row.rate <= 0
    ) {
      return [];
    }
    return [{ currency: quote, date: row.date, cnyPerUnit: 1 / row.rate }];
  });
  assertCurrenciesPresent(points, currencies, "Frankfurter");

  return {
    baseCurrency: "CNY",
    points,
    fetchedAt: new Date().toISOString(),
    source: "Frankfurter",
    rateMode: "historical"
  };
}

async function fetchLatestFallbackRates(currencies: string[]): Promise<ExchangeRateResult> {
  const payload = (await fetchJson(new URL(LATEST_FALLBACK_URL))) as LatestRateResponse;
  if (payload.result !== "success" || payload.base_code !== "CNY" || !payload.rates) {
    throw new Error("ExchangeRate-API 返回了无效数据");
  }

  const parsedDate = new Date(payload.time_last_update_utc);
  const date = Number.isNaN(parsedDate.getTime())
    ? new Date().toISOString().slice(0, 10)
    : parsedDate.toISOString().slice(0, 10);
  const points: ExchangeRatePoint[] = currencies.flatMap((currency) => {
    const rate = payload.rates[currency];
    return Number.isFinite(rate) && rate > 0
      ? [{ currency, date, cnyPerUnit: 1 / rate }]
      : [];
  });
  assertCurrenciesPresent(points, currencies, "ExchangeRate-API");

  return {
    baseCurrency: "CNY",
    points,
    fetchedAt: new Date().toISOString(),
    source: "ExchangeRate-API",
    rateMode: "latest-fallback"
  };
}

async function fetchJson(url: URL): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("请求超时");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function assertCurrenciesPresent(
  points: ExchangeRatePoint[],
  currencies: string[],
  provider: string
): void {
  const returnedCurrencies = new Set(points.map((point) => point.currency));
  const missing = currencies.filter((currency) => !returnedCurrencies.has(currency));
  if (missing.length > 0) {
    throw new Error(`${provider} 不支持以下币种：${missing.join("、")}`);
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isCacheUsable(result: ExchangeRateResult): boolean {
  if (result.rateMode === "historical") return true;
  const fetchedAt = new Date(result.fetchedAt);
  if (Number.isNaN(fetchedAt.getTime())) return false;
  return fetchedAt.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
}
