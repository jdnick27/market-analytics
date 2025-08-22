import axios from 'axios';
import http from 'http';
import https from 'https';

const BASE = 'https://api.polygon.io';

// Configure global axios agents to reuse sockets and limit concurrent sockets.
// This reduces the chance of `ECONNRESET` / "socket hang up" when the app
// makes many parallel requests.
axios.defaults.httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
axios.defaults.httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

// Global request timeout (ms) — set to 2 minutes
export const REQUEST_TIMEOUT = 120000;

function getApiKey(): string {
  const k = process.env.POLYGON_API_KEY;
  if (!k) throw new Error('POLYGON_API_KEY not set in environment');
  return k;
}

/**
 * Helper to perform a GET request against the Polygon API with common settings
 * and error handling. Automatically attaches the API key and request timeout.
 */
async function polygonGet(path: string, params: Record<string, any> = {}): Promise<any> {
  const apiKey = getApiKey();
  const url = `${BASE}${path}`;
  try {
    const res = await axios.get(url, {
      params: { apiKey, ...params },
      timeout: REQUEST_TIMEOUT,
    });
    return res.data;
  } catch (err: any) {
    if (err.response) {
      const msg = `Polygon API error: ${err.response.status} ${err.response.statusText} - ${JSON.stringify(err.response.data)}`;
      const e: any = new Error(msg);
      e.status = err.response.status;
      throw e;
    }
    throw err;
  }
}

export async function listTickers(limit = 3): Promise<string[]> {
  const data = await polygonGet('/v3/reference/tickers', {
    market: 'stocks',
    active: true,
    limit,
  });
  return data?.results?.map((t: any) => t.ticker) ?? [];
}

export async function getTicker(ticker: string): Promise<any> {
  if (!ticker) throw new Error('ticker is required');
  return polygonGet(`/v3/reference/tickers/${encodeURIComponent(ticker)}`);
}

export async function fetchLastTrade(symbol: string): Promise<any> {
  if (!symbol) throw new Error('symbol is required');
  return polygonGet(`/v2/last/trade/${encodeURIComponent(symbol)}`);
}

export async function getOpenClose(symbol: string, date: string): Promise<any> {
  if (!symbol) throw new Error('symbol is required');
  if (!date) throw new Error('date is required (YYYY-MM-DD)');
  return polygonGet(`/v1/open-close/${encodeURIComponent(symbol)}/${encodeURIComponent(date)}`);
}

// Technical indicators

export async function getSMA(symbol: string, window = 50, timespan = 'day'): Promise<any> {
  if (!symbol) throw new Error('symbol is required');
  const data = await polygonGet(`/v1/indicators/sma/${encodeURIComponent(symbol)}`, {
    timespan,
    window,
    series_type: 'close',
    limit: 1,
  });
  return data?.results?.values ?? [];
}

export async function getEMA(symbol: string, window = 50, timespan = 'day'): Promise<any> {
  if (!symbol) throw new Error('symbol is required');
  const data = await polygonGet(`/v1/indicators/ema/${encodeURIComponent(symbol)}`, {
    timespan,
    window,
    series_type: 'close',
    limit: 1,
  });
  return data?.results?.values ?? [];
}

export async function getMACD(
  symbol: string,
  shortWindow = 12,
  longWindow = 26,
  signalWindow = 9,
  timespan = 'day',
): Promise<any> {
  if (!symbol) throw new Error('symbol is required');
  const data = await polygonGet(`/v1/indicators/macd/${encodeURIComponent(symbol)}`, {
    timespan,
    short_window: shortWindow,
    long_window: longWindow,
    signal_window: signalWindow,
    series_type: 'close',
    limit: 1,
  });
  return data?.results?.values ?? [];
}

export async function getRSI(symbol: string, window = 14, timespan = 'day'): Promise<any> {
  if (!symbol) throw new Error('symbol is required');
  const data = await polygonGet(`/v1/indicators/rsi/${encodeURIComponent(symbol)}`, {
    timespan,
    window,
    series_type: 'close',
    limit: 1,
  });
  return data?.results?.values ?? [];
}

/**
 * Fetch daily aggregates for the past ~365 days and compute the 52-week high/low.
 * Returns null if no data is available.
 */
export async function get52WeekHighLow(symbol: string, toDate: string): Promise<{ high: number; low: number } | null> {
  if (!symbol) throw new Error('symbol is required');
  if (!toDate) throw new Error('toDate is required (YYYY-MM-DD)');
  // compute from date ~365 days before toDate
  const to = new Date(toDate);
  const from = new Date(to);
  from.setDate(from.getDate() - 365);
  const pad = (n: number) => String(n).padStart(2, '0');
  const fromStr = `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`;
  const toStr = `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`;

  const data = await polygonGet(
    `/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/${encodeURIComponent(fromStr)}/${encodeURIComponent(toStr)}`,
    { adjusted: true, limit: 1000 },
  );

  const results = data?.results ?? [];
  if (!Array.isArray(results) || results.length === 0) return null;

  let high = Number.NEGATIVE_INFINITY;
  let low = Number.POSITIVE_INFINITY;
  for (const r of results) {
    const h = Number(r.h);
    const l = Number(r.l);
    if (Number.isFinite(h) && h > high) high = h;
    if (Number.isFinite(l) && l < low) low = l;
  }

  if (!Number.isFinite(high) || !Number.isFinite(low)) return null;
  return { high, low };
}

// Short interest and short volume

export async function getShortInterest(ticker: string): Promise<any> {
  if (!ticker) throw new Error('ticker is required');
  const data = await polygonGet('/stocks/v1/short-interest', { ticker });
  const results = data?.results;
  return Array.isArray(results) ? results[0] ?? null : results ?? null;
}

export async function getShortVolume(ticker: string, date: string): Promise<any> {
  if (!ticker) throw new Error('ticker is required');
  if (!date) throw new Error('date is required (YYYY-MM-DD)');
  const data = await polygonGet('/stocks/v1/short-volume', { ticker, date });
  const results = data?.results;
  return Array.isArray(results) ? results[0] ?? null : results ?? null;
}

/**
 * Return shares outstanding for a ticker using the Polygon ticker overview endpoint.
 * Returns a number (shares) or null if unavailable.
 */
export async function getSharesOutstanding(ticker: string): Promise<number | null> {
  if (!ticker) throw new Error('ticker is required');
  try {
    const data = await getTicker(ticker);
    // getTicker returns res.data which usually has a `results` object
    const res = (data && (data.results ?? data)) as any;
    if (!res) return null;

    // Try common fields for shares outstanding
    const candidates = [
      res.shares_outstanding,
      res.outstanding_shares,
      res.share_class_shares_outstanding,
      res.total_shares,
    ];
    for (const c of candidates) {
      if (Number.isFinite(c) && Number(c) > 0) return Number(c);
    }

    // As a conservative fallback, some responses include marketcap; without a reliable
    // price here we avoid guessing. Return null if no direct shares field present.
    return null;
  } catch (err) {
    // bubble up network/API errors
    throw err;
  }
}

// Financial statements

/**
 * Fetch the latest financials for a given ticker.
 * Docs: https://polygon.io/docs/rest/stocks/fundamentals/financials
 * Returns the first result object or null if none.
 */
export async function getFinancials(ticker: string): Promise<any> {
  if (!ticker) throw new Error('ticker is required');
  const data = await polygonGet('/vX/reference/financials', { ticker, limit: 1 });
  const results = data?.results;
  return Array.isArray(results) ? results[0] ?? null : results ?? null;
}

/**
 * Fetch a history of financial filings for a ticker.
 * @param ticker Stock ticker symbol.
 * @param timeframe 'quarterly' or 'annual'.
 * @param limit Number of filings to retrieve (max 10 by default).
 * Returns an array of filing objects sorted by end_date descending.
 */
export async function getFinancialsHistory(
  ticker: string,
  timeframe: 'quarterly' | 'annual',
  limit = 10,
): Promise<any[]> {
  if (!ticker) throw new Error('ticker is required');
  const data = await polygonGet('/vX/reference/financials', { ticker, timeframe, limit });
  const results: any[] = Array.isArray(data?.results) ? data.results : [];
  // Sort by end_date descending so index 0 is the most recent filing
  return results.sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
}
