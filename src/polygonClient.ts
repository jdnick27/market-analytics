import axios from 'axios';

const BASE = 'https://api.polygon.io';

// Global request timeout (ms) — set to 2 minutes
export const REQUEST_TIMEOUT = 120000;

function getApiKey(): string {
  const k = process.env.POLYGON_API_KEY;
  if (!k) throw new Error('POLYGON_API_KEY not set in environment');
  return k;
}

export async function listTickers(limit = 3): Promise<string[]> {
  const apiKey = getApiKey();
  const url = `${BASE}/v3/reference/tickers`;
  try {
    const res = await axios.get(url, {
      params: { apiKey, market: 'stocks', active: true, limit },
      timeout: REQUEST_TIMEOUT,
    });
    return res.data?.results?.map((t: any) => t.ticker) ?? [];
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

export async function getTicker(ticker: string): Promise<any> {
  if (!ticker) throw new Error('ticker is required');
  const apiKey = getApiKey();
  const url = `${BASE}/v3/reference/tickers/${encodeURIComponent(ticker)}`;
  try {
  const res = await axios.get(url, { params: { apiKey }, timeout: REQUEST_TIMEOUT });
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

export async function fetchLastTrade(symbol: string): Promise<any> {
  if (!symbol) throw new Error('symbol is required');
  const apiKey = getApiKey();
  const url = `${BASE}/v2/last/trade/${encodeURIComponent(symbol)}`;
  try {
  const res = await axios.get(url, { params: { apiKey }, timeout: REQUEST_TIMEOUT });
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

export async function getOpenClose(symbol: string, date: string): Promise<any> {
  if (!symbol) throw new Error('symbol is required');
  if (!date) throw new Error('date is required (YYYY-MM-DD)');
  const apiKey = getApiKey();
  const url = `${BASE}/v1/open-close/${encodeURIComponent(symbol)}/${encodeURIComponent(date)}`;
  try {
  const res = await axios.get(url, { params: { apiKey }, timeout: REQUEST_TIMEOUT });
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

// Technical indicators

export async function getSMA(symbol: string, window = 50, timespan = 'day'): Promise<any> {
  if (!symbol) throw new Error('symbol is required');
  const apiKey = getApiKey();
  const url = `${BASE}/v1/indicators/sma/${encodeURIComponent(symbol)}`;
  try {
    const res = await axios.get(url, {
      params: { apiKey, timespan, window, series_type: 'close', limit: 1 },
      timeout: REQUEST_TIMEOUT,
    });
    // return only the values array/object from the API response
    return res.data?.results?.values ?? [];
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

export async function getEMA(symbol: string, window = 50, timespan = 'day'): Promise<any> {
  if (!symbol) throw new Error('symbol is required');
  const apiKey = getApiKey();
  const url = `${BASE}/v1/indicators/ema/${encodeURIComponent(symbol)}`;
  try {
    const res = await axios.get(url, {
      params: { apiKey, timespan, window, series_type: 'close', limit: 1 },
      timeout: REQUEST_TIMEOUT,
    });
    // return only the values array/object from the API response
    return res.data?.results?.values ?? [];
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

export async function getMACD(
  symbol: string,
  shortWindow = 12,
  longWindow = 26,
  signalWindow = 9,
  timespan = 'day',
): Promise<any> {
  if (!symbol) throw new Error('symbol is required');
  const apiKey = getApiKey();
  const url = `${BASE}/v1/indicators/macd/${encodeURIComponent(symbol)}`;
  try {
    const res = await axios.get(url, {
      params: {
        apiKey,
        timespan,
        short_window: shortWindow,
        long_window: longWindow,
        signal_window: signalWindow,
        series_type: 'close',
        limit: 1,
      },
      timeout: REQUEST_TIMEOUT,
    });
    // return only the values array/object from the API response
    return res.data?.results?.values ?? [];
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

export async function getRSI(symbol: string, window = 14, timespan = 'day'): Promise<any> {
  if (!symbol) throw new Error('symbol is required');
  const apiKey = getApiKey();
  const url = `${BASE}/v1/indicators/rsi/${encodeURIComponent(symbol)}`;
  try {
    const res = await axios.get(url, {
      params: { apiKey, timespan, window, series_type: 'close', limit: 1 },
      timeout: REQUEST_TIMEOUT,
    });
    // return only the values array/object from the API response
    return res.data?.results?.values ?? [];
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

/**
 * Fetch daily aggregates for the past ~365 days and compute the 52-week high/low.
 * Returns null if no data is available.
 */
export async function get52WeekHighLow(symbol: string, toDate: string): Promise<{ high: number; low: number } | null> {
  if (!symbol) throw new Error('symbol is required');
  if (!toDate) throw new Error('toDate is required (YYYY-MM-DD)');
  const apiKey = getApiKey();
  // compute from date ~365 days before toDate
  const to = new Date(toDate);
  const from = new Date(to);
  from.setDate(from.getDate() - 365);
  const pad = (n: number) => String(n).padStart(2, '0');
  const fromStr = `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`;
  const toStr = `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`;

  const url = `${BASE}/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/${encodeURIComponent(fromStr)}/${encodeURIComponent(toStr)}`;
  try {
    const res = await axios.get(url, {
      params: { apiKey, adjusted: true, limit: 1000 },
      timeout: REQUEST_TIMEOUT,
    });

    const results = res.data?.results ?? [];
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

// Short interest and short volume

export async function getShortInterest(ticker: string): Promise<any> {
  if (!ticker) throw new Error('ticker is required');
  const apiKey = getApiKey();
  // Polygon docs: https://polygon.io/docs/rest/stocks/fundamentals/short-interest
  const url = `${BASE}/stocks/v1/short-interest`;
  try {
    const res = await axios.get(url, {
      params: { apiKey, ticker },
      timeout: REQUEST_TIMEOUT,
    });
    const results = res.data?.results;
    return Array.isArray(results) ? results[0] ?? null : results ?? null;
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

export async function getShortVolume(ticker: string, date: string): Promise<any> {
  if (!ticker) throw new Error('ticker is required');
  if (!date) throw new Error('date is required (YYYY-MM-DD)');
  const apiKey = getApiKey();
  // Polygon docs: https://polygon.io/docs/rest/stocks/fundamentals/short-volume
  const url = `${BASE}/stocks/v1/short-volume`;
  try {
    const res = await axios.get(url, {
      params: { apiKey, ticker, date },
      timeout: REQUEST_TIMEOUT,
    });
    const results = res.data?.results;
    return Array.isArray(results) ? results[0] ?? null : results ?? null;
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
  const apiKey = getApiKey();
  const url = `${BASE}/vX/reference/financials`;
  try {
    const res = await axios.get(url, {
      params: { apiKey, ticker, limit: 1 },
      timeout: REQUEST_TIMEOUT,
    });
    const results = res.data?.results;
    return Array.isArray(results) ? results[0] ?? null : results ?? null;
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
  const apiKey = getApiKey();
  const url = `${BASE}/vX/reference/financials`;
  try {
    const res = await axios.get(url, {
      params: { apiKey, ticker, timeframe, limit },
      timeout: REQUEST_TIMEOUT,
    });
    const results: any[] = Array.isArray(res.data?.results) ? res.data.results : [];
    // Sort by end_date descending so index 0 is the most recent filing
    return results.sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
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
