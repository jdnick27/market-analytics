import axios from 'axios';

const BASE = 'https://api.polygon.io';

function getApiKey(): string {
  const k = process.env.POLYGON_API_KEY;
  if (!k) throw new Error('POLYGON_API_KEY not set in environment');
  return k;
}

export async function getTicker(ticker: string): Promise<any> {
  if (!ticker) throw new Error('ticker is required');
  const apiKey = getApiKey();
  const url = `${BASE}/v3/reference/tickers/${encodeURIComponent(ticker)}`;
  try {
    const res = await axios.get(url, { params: { apiKey }, timeout: 10000 });
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
    const res = await axios.get(url, { params: { apiKey }, timeout: 10000 });
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
    const res = await axios.get(url, { params: { apiKey }, timeout: 10000 });
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

export async function getSnapshots(tickers: string[]): Promise<any[]> {
  if (!tickers || tickers.length === 0) throw new Error('tickers array is required');
  const apiKey = getApiKey();
  const url = `${BASE}/v2/snapshot/locale/us/markets/stocks/tickers`;
  try {
    const res = await axios.get(url, {
      params: { apiKey, tickers: tickers.join(',') },
      timeout: 10000,
    });
    return res.data?.tickers ?? [];
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
      timeout: 10000,
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
      timeout: 10000,
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
      timeout: 10000,
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
      timeout: 10000,
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
