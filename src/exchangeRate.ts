/**
 * USD → KHR exchange rate with an explicit, displayed source.
 *
 * Primary source: the National Bank of Cambodia official reference rate, published as open data by
 * Cambodia's Ministry of Economy and Finance (data.mef.gov.kh). It returns the daily KHR/USD rate
 * with a `valid_date`, so the UI can show exactly which day the number belongs to.
 *
 * Fallback: open.er-api.com market feed, used only when the MEF/NBC API is unreachable.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type ExchangeRateSourceId = 'NBC' | 'MARKET';

const QUOTE_CACHE_KEY = 'retailflow_rate_quote_v1';

export interface ExchangeRateQuote {
  /** Riel per 1 USD, as published by the source. */
  khrPerUsd: number;
  /** Bid / ask when the source publishes them (NBC does, market feeds do not). */
  bid?: number;
  ask?: number;
  sourceId: ExchangeRateSourceId;
  /** Human readable bank/feed name shown next to the number. */
  sourceName: string;
  /** What kind of rate this is, e.g. "Official reference rate". */
  sourceDetail: string;
  /** Host/domain the number came from, shown as the citation. */
  sourceHost: string;
  sourceUrl: string;
  /** ISO date the source says the rate is valid for (NBC only). */
  asOf: string | null;
  fetchedAt: number;
  isFallback: boolean;
}

const NBC_RATE_URL =
  'https://data.mef.gov.kh/api/v1/realtime-api/exchange-rate?currency_id=USD';
const MARKET_RATE_URL = 'https://open.er-api.com/v6/latest/USD';

const NBC_SOURCE = {
  sourceId: 'NBC' as const,
  sourceName: 'National Bank of Cambodia',
  sourceDetail: 'Official reference rate',
  sourceHost: 'data.mef.gov.kh',
  sourceUrl: NBC_RATE_URL,
};

const MARKET_SOURCE = {
  sourceId: 'MARKET' as const,
  sourceName: 'open.er-api.com',
  sourceDetail: 'Market feed fallback',
  sourceHost: 'open.er-api.com',
  sourceUrl: MARKET_RATE_URL,
};

/** `fetch` with a hard timeout so a slow exchange feed never blocks the settings screen. */
async function getJson(url: string, timeoutMs = 8000): Promise<any> {
  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;
  try {
    const res = await fetch(url, controller ? { signal: controller.signal } : undefined);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function toPositive(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Riel amounts are quoted in whole riel; keep 2 decimals for unusual feeds. */
export function normalizeKhrRate(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100) / 100;
}

/** Last quote that was fetched, so the source stays visible after an app restart. */
export async function loadLastRateQuote(): Promise<ExchangeRateQuote | null> {
  try {
    const raw = await AsyncStorage.getItem(QUOTE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExchangeRateQuote;
    return parsed && Number(parsed.khrPerUsd) > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function rememberQuote(quote: ExchangeRateQuote) {
  AsyncStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify(quote)).catch(() => {});
}

export async function fetchUsdKhrRate(): Promise<ExchangeRateQuote> {
  try {
    const data = await getJson(NBC_RATE_URL);
    const row = data?.data;
    // `unit` is how many units of USD the quote covers (1 for USD).
    const unit = toPositive(row?.unit) || 1;
    const average =
      toPositive(row?.average) || toPositive(row?.bid) || toPositive(row?.ask);
    const rate = normalizeKhrRate(average / unit);
    if (rate > 0) {
      const quote: ExchangeRateQuote = {
        khrPerUsd: rate,
        bid: toPositive(row?.bid) / unit || undefined,
        ask: toPositive(row?.ask) / unit || undefined,
        ...NBC_SOURCE,
        asOf: row?.valid_date ? String(row.valid_date) : null,
        fetchedAt: Date.now(),
        isFallback: false,
      };
      rememberQuote(quote);
      return quote;
    }
  } catch {
    /* fall through to the market feed */
  }

  const data = await getJson(MARKET_RATE_URL);
  const rate = normalizeKhrRate(toPositive(data?.rates?.KHR));
  if (!rate) {
    throw new Error('Exchange rate service returned an invalid KHR rate');
  }
  const quote: ExchangeRateQuote = {
    khrPerUsd: rate,
    ...MARKET_SOURCE,
    asOf: data?.time_last_update_utc
      ? new Date(data.time_last_update_utc).toISOString().slice(0, 10)
      : null,
    fetchedAt: Date.now(),
    isFallback: true,
  };
  rememberQuote(quote);
  return quote;
}

/**
 * One-line provenance string for UI, including the exact published number:
 * "Official reference rate 4,079 ៛/USD · data.mef.gov.kh · 2026-10-23".
 */
export function describeRateSource(quote: ExchangeRateQuote | null): string {
  if (!quote) return '';
  const value = `${quote.khrPerUsd.toLocaleString('en-US')} ៛/USD`;
  const date = quote.asOf ? ` · ${quote.asOf}` : '';
  return `${quote.sourceDetail} ${value} · ${quote.sourceHost}${date}`;
}
