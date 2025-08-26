import {
  getOpenClose,
  getSMA,
  getEMA,
  getMACD,
  getRSI,
  get52WeekHighLow,
  getShortInterest,
  getShortVolume,
  getSharesOutstanding,
  getFinancialsHistory,
} from './polygonClient';

export interface IndicatorSignal {
  category: 'technical' | 'fundamental' | 'growth';
  indicator: string;
  value?: number;
  macd?: {
    value: number;
    signal: number;
    histogram: number;
  };
  signal: 'buy' | 'sell' | 'hold';
  score: number; // -2..2 contribution
}

function previousDay(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getNested(obj: any, path: string[]): any {
  return path.reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

function computeGrowth(results: any[], path: string[]): number | undefined {
  if (!Array.isArray(results) || results.length === 0) return undefined;
  const values = results
    .map((r) => {
      const v = getNested(r, path);
      return typeof v === 'object' && v !== null && 'value' in v ? (v as any).value : v;
    })
    .filter((v): v is number => Number.isFinite(v));

  if (values.length === 0) return undefined;
  if (values.length === 1) {
    const only = values[0];
    return only !== 0 ? 0 : undefined;
  }

  const latest = values[0];
  const oldest = values[values.length - 1];
  if (oldest === 0) return undefined;
  return (latest - oldest) / Math.abs(oldest);
}

function computeGrowthFromValues(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  if (values.length === 1) {
    const only = values[0];
    return only !== 0 ? 0 : undefined;
  }
  const latest = values[0];
  const oldest = values[values.length - 1];
  if (oldest === 0) return undefined;
  return (latest - oldest) / Math.abs(oldest);
}

function extractShares(result: any): number | undefined {
  const paths = [
    ['financials', 'balance_sheet', 'common_stock_shares_outstanding', 'value'],
    ['financials', 'income_statement', 'weighted_average_shares_outstanding_basic', 'value'],
    ['financials', 'income_statement', 'weighted_average_shares_outstanding_diluted', 'value'],
    ['shares_outstanding', 'value'],
    ['shares_outstanding'],
  ];
  for (const p of paths) {
    const v = getNested(result, p);
    if (Number.isFinite(v)) return Number(v);
  }
  return undefined;
}

export async function generateSignals(symbol: string, date = previousDay()): Promise<IndicatorSignal[]> {
  const [
    oc,
    smaArr,
    emaArr,
    macdArr,
    rsiArr,
    hiLo,
    shortInt,
    shortVol,
    sharesOutstanding,
    finQ,
    finA,
  ] = await Promise.all([
    getOpenClose(symbol, date),
    getSMA(symbol),
    getEMA(symbol),
    getMACD(symbol),
    getRSI(symbol),
    get52WeekHighLow(symbol, date),
    getShortInterest(symbol),
    getShortVolume(symbol, date),
    getSharesOutstanding(symbol),
    getFinancialsHistory(symbol, 'quarterly', 10),
    getFinancialsHistory(symbol, 'annual', 10),
  ]);

  const price: number | undefined = oc?.close;
  const signals: IndicatorSignal[] = [];

  const sharesFor = (r: any, fallback = true): number | undefined =>
    extractShares(r) ??
    (fallback && typeof sharesOutstanding === 'number' ? sharesOutstanding : undefined);

  // === Technical Indicators ===

  // RSI
  const rsi = rsiArr?.[0]?.value;
  if (typeof rsi === 'number') {
    if (rsi < 35) {
      signals.push({ category: 'technical', indicator: 'RSI', value: rsi, signal: 'buy', score: 2 });
    } else if (rsi > 65) {
      signals.push({ category: 'technical', indicator: 'RSI', value: rsi, signal: 'sell', score: -2 });
    } else {
      signals.push({ category: 'technical', indicator: 'RSI', value: rsi, signal: 'hold', score: 0 });
    }
  }

  // SMA Trend
  const sma0 = smaArr?.[0]?.value;
  const sma1 = smaArr?.[1]?.value;
  if (typeof price === 'number' && typeof sma0 === 'number' && typeof sma1 === 'number') {
    const priceAbove = price >= sma0 * 1.005;
    const priceBelow = price <= sma0 * 0.995;
    const smaUp = sma0 > sma1;
    const smaDown = sma0 < sma1;
    if (priceAbove && smaUp) {
      signals.push({ category: 'technical', indicator: 'SMA Trend', signal: 'buy', score: 1 });
    } else if (priceBelow && smaDown) {
      signals.push({ category: 'technical', indicator: 'SMA Trend', signal: 'sell', score: -1 });
    } else {
      signals.push({ category: 'technical', indicator: 'SMA Trend', signal: 'hold', score: 0 });
    }
  }

  // EMA Trend
  const ema0 = emaArr?.[0]?.value;
  const ema1 = emaArr?.[1]?.value;
  if (typeof price === 'number' && typeof ema0 === 'number' && typeof ema1 === 'number') {
    const priceAbove = price >= ema0 * 1.005;
    const priceBelow = price <= ema0 * 0.995;
    const emaUp = ema0 > ema1;
    const emaDown = ema0 < ema1;
    if (priceAbove && emaUp) {
      signals.push({ category: 'technical', indicator: 'EMA Trend', signal: 'buy', score: 1 });
    } else if (priceBelow && emaDown) {
      signals.push({ category: 'technical', indicator: 'EMA Trend', signal: 'sell', score: -1 });
    } else {
      signals.push({ category: 'technical', indicator: 'EMA Trend', signal: 'hold', score: 0 });
    }
  }

  // MACD
  const macd0 = macdArr?.[0];
  const macd1 = macdArr?.[1];
  if (macd0 && macd1) {
    const bullishCross = macd1.value <= macd1.signal && macd0.value > macd0.signal && macd0.histogram > 0;
    const bearishCross = macd1.value >= macd1.signal && macd0.value < macd0.signal && macd0.histogram < 0;
    if (bullishCross) {
      signals.push({
        category: 'technical',
        indicator: 'MACD',
        macd: { value: macd0.value, signal: macd0.signal, histogram: macd0.histogram },
        signal: 'buy',
        score: 2,
      });
    } else if (bearishCross) {
      signals.push({
        category: 'technical',
        indicator: 'MACD',
        macd: { value: macd0.value, signal: macd0.signal, histogram: macd0.histogram },
        signal: 'sell',
        score: -2,
      });
    } else {
      signals.push({
        category: 'technical',
        indicator: 'MACD',
        macd: { value: macd0.value, signal: macd0.signal, histogram: macd0.histogram },
        signal: 'hold',
        score: 0,
      });
    }
  }

  // 52-week high/low
  if (hiLo && typeof price === 'number') {
    const { high, low } = hiLo as { high: number; low: number };
    if (Number.isFinite(high) && Number.isFinite(low) && high > 0 && low > 0) {
      const distHigh = (high - price) / high;
      const distLow = (price - low) / low;
      const threshold = 0.02; // 2%
      if (distLow <= threshold) {
        signals.push({ category: 'technical', indicator: '52W Range', signal: 'buy', score: 1 });
      } else if (distHigh <= threshold) {
        signals.push({ category: 'technical', indicator: '52W Range', signal: 'sell', score: -1 });
      } else {
        signals.push({ category: 'technical', indicator: '52W Range', signal: 'hold', score: 0 });
      }
    }
  }

  // Short interest
  if (shortInt) {
    const si = shortInt as any;
    let shortPercent: number | undefined;
    if (Number.isFinite(si.short_interest)) {
      const shortInterestVal = Number(si.short_interest);
      if (Number.isFinite(si.float) && si.float > 0) {
        shortPercent = (shortInterestVal / Number(si.float)) * 100;
      } else if (typeof sharesOutstanding === 'number' && sharesOutstanding > 0) {
        shortPercent = (shortInterestVal / sharesOutstanding) * 100;
      }
    }
    if (typeof shortPercent === 'number') {
      if (shortPercent < 10) {
        signals.push({ category: 'technical', indicator: 'Short Interest', value: shortPercent, signal: 'buy', score: 1 });
      } else if (shortPercent > 25) {
        signals.push({ category: 'technical', indicator: 'Short Interest', value: shortPercent, signal: 'sell', score: -1 });
      } else {
        signals.push({ category: 'technical', indicator: 'Short Interest', value: shortPercent, signal: 'hold', score: 0 });
      }
    } else if (Number.isFinite(si.days_to_cover)) {
      const d = Number(si.days_to_cover);
      if (d < 2) {
        signals.push({ category: 'technical', indicator: 'Short Interest', value: d, signal: 'buy', score: 1 });
      } else if (d > 6) {
        signals.push({ category: 'technical', indicator: 'Short Interest', value: d, signal: 'sell', score: -1 });
      } else {
        signals.push({ category: 'technical', indicator: 'Short Interest', value: d, signal: 'hold', score: 0 });
      }
    }
  }

  // Short volume ratio
  if (shortVol) {
    const sv = shortVol as any;
    let ratio: number | undefined;
    if (Number.isFinite(sv.short_volume) && Number.isFinite(sv.total_volume) && sv.total_volume > 0) {
      ratio = sv.short_volume / sv.total_volume;
    }
    if (typeof ratio === 'number') {
      if (ratio < 0.25) {
        signals.push({ category: 'technical', indicator: 'Short Volume Ratio', value: ratio, signal: 'buy', score: 1 });
      } else if (ratio > 0.45) {
        signals.push({ category: 'technical', indicator: 'Short Volume Ratio', value: ratio, signal: 'sell', score: -1 });
      } else {
        signals.push({ category: 'technical', indicator: 'Short Volume Ratio', value: ratio, signal: 'hold', score: 0 });
      }
    }
  }

  // === Fundamentals ===
  const latestQ = finQ?.[0];
  const latestA = finA?.[0];

  if (latestQ) {
    const currentAssets = getNested(latestQ, ['financials', 'balance_sheet', 'current_assets', 'value']);
    const currentLiabilities = getNested(latestQ, ['financials', 'balance_sheet', 'current_liabilities', 'value']);
    if (Number.isFinite(currentAssets) && Number.isFinite(currentLiabilities) && currentLiabilities !== 0) {
      const cr = currentAssets / currentLiabilities;
      if (cr > 2) {
        signals.push({ category: 'fundamental', indicator: 'Current Ratio', value: cr, signal: 'buy', score: 1 });
      } else if (cr < 1) {
        signals.push({ category: 'fundamental', indicator: 'Current Ratio', value: cr, signal: 'sell', score: -1 });
      } else {
        signals.push({ category: 'fundamental', indicator: 'Current Ratio', value: cr, signal: 'hold', score: 0 });
      }
    }

    const totalLiab = getNested(latestQ, ['financials', 'balance_sheet', 'total_liabilities', 'value']);
    const equity =
      getNested(latestQ, ['financials', 'balance_sheet', 'stockholders_equity', 'value']) ??
      getNested(latestQ, ['financials', 'balance_sheet', 'total_stockholders_equity', 'value']);
    if (Number.isFinite(totalLiab) && Number.isFinite(equity) && equity !== 0) {
      const de = totalLiab / equity;
      if (de < 0.8) {
        signals.push({ category: 'fundamental', indicator: 'Debt/Equity', value: de, signal: 'buy', score: 1 });
      } else if (de > 2.5) {
        signals.push({ category: 'fundamental', indicator: 'Debt/Equity', value: de, signal: 'sell', score: -1 });
      } else {
        signals.push({ category: 'fundamental', indicator: 'Debt/Equity', value: de, signal: 'hold', score: 0 });
      }
    }

    const netIncome = getNested(latestQ, ['financials', 'income_statement', 'net_income', 'value']);
    const revenue =
      getNested(latestQ, ['financials', 'income_statement', 'revenues', 'value']) ??
      getNested(latestQ, ['financials', 'income_statement', 'net_sales', 'value']);
    if (Number.isFinite(netIncome) && Number.isFinite(revenue) && revenue !== 0) {
      const nm = netIncome / revenue;
      if (nm > 0.12) {
        signals.push({ category: 'fundamental', indicator: 'Net Margin', value: nm, signal: 'buy', score: 2 });
      } else if (nm < 0) {
        signals.push({ category: 'fundamental', indicator: 'Net Margin', value: nm, signal: 'sell', score: -2 });
      } else {
        signals.push({ category: 'fundamental', indicator: 'Net Margin', value: nm, signal: 'hold', score: 0 });
      }
    }

    // Operating Cash Flow
    const ocfValues = finQ
      .map((r: any) =>
        getNested(r, ['financials', 'cash_flow_statement', 'net_cash_provided_by_operating_activities', 'value'])
      )
      .filter((v): v is number => Number.isFinite(v));
    if (ocfValues.length) {
      const ocfLatest = ocfValues[0];
      const ocfGrowing = ocfValues.length >= 3 && ocfValues[0] > ocfValues[1] && ocfValues[1] > ocfValues[2];
      const ocfNeg2 = ocfValues.slice(0, 2).every((v) => v < 0);
      if (ocfLatest > 0 && ocfGrowing) {
        signals.push({ category: 'fundamental', indicator: 'Operating Cash Flow', signal: 'buy', score: 1 });
      } else if (ocfNeg2) {
        signals.push({ category: 'fundamental', indicator: 'Operating Cash Flow', signal: 'sell', score: -1 });
      } else {
        signals.push({ category: 'fundamental', indicator: 'Operating Cash Flow', signal: 'hold', score: 0 });
      }
    }

    // Net Cash Flow
    const netCFValues = finQ
      .map((r: any) => getNested(r, ['financials', 'cash_flow_statement', 'net_cash_flow', 'value']))
      .filter((v): v is number => Number.isFinite(v));
    if (netCFValues.length) {
      const netCFLatest = netCFValues[0];
      const netCFNegCount = netCFValues.slice(0, 4).filter((v) => v < 0).length;
      if (netCFLatest > 0) {
        signals.push({ category: 'fundamental', indicator: 'Net Cash Flow', signal: 'buy', score: 1 });
      } else if (netCFNegCount > 2) {
        signals.push({ category: 'fundamental', indicator: 'Net Cash Flow', signal: 'sell', score: -1 });
      } else {
        signals.push({ category: 'fundamental', indicator: 'Net Cash Flow', signal: 'hold', score: 0 });
      }
    }

    // Valuation metrics
    if (typeof price === 'number') {
      const shares = sharesFor(latestA ?? latestQ);
      const eps = Number.isFinite(netIncome) && typeof shares === 'number' && shares > 0 ? netIncome / shares : undefined;
      const bvps = (() => {
        const eq =
          getNested(latestA ?? latestQ, ['financials', 'balance_sheet', 'stockholders_equity', 'value']) ??
          getNested(latestA ?? latestQ, ['financials', 'balance_sheet', 'total_stockholders_equity', 'value']);
        return Number.isFinite(eq) && typeof shares === 'number' && shares > 0 ? eq / shares : undefined;
      })();
      const revenuePS = Number.isFinite(revenue) && typeof shares === 'number' && shares > 0 ? revenue / shares : undefined;
      const pe = typeof eps === 'number' && eps !== 0 ? price / eps : undefined;
      const ps = typeof revenuePS === 'number' && revenuePS !== 0 ? price / revenuePS : undefined;
      const pr = ps; // treat P/R same as P/S

      if (typeof pe === 'number') {
        if (pe >= 8 && pe <= 18) {
          signals.push({ category: 'fundamental', indicator: 'PE Ratio', value: pe, signal: 'buy', score: 1 });
        } else if (pe > 35 || pe < 0) {
          signals.push({ category: 'fundamental', indicator: 'PE Ratio', value: pe, signal: 'sell', score: -1 });
        } else {
          signals.push({ category: 'fundamental', indicator: 'PE Ratio', value: pe, signal: 'hold', score: 0 });
        }
      } else {
        signals.push({ category: 'fundamental', indicator: 'PE Ratio', signal: 'hold', score: 0 });
      }

      if (typeof ps === 'number') {
        if (ps < 2) {
          signals.push({ category: 'fundamental', indicator: 'Price/Sales Ratio', value: ps, signal: 'buy', score: 1 });
        } else if (ps > 4) {
          signals.push({ category: 'fundamental', indicator: 'Price/Sales Ratio', value: ps, signal: 'sell', score: -1 });
        } else {
          signals.push({ category: 'fundamental', indicator: 'Price/Sales Ratio', value: ps, signal: 'hold', score: 0 });
        }
      } else {
        signals.push({ category: 'fundamental', indicator: 'Price/Sales Ratio', signal: 'hold', score: 0 });
      }

      if (typeof pr === 'number') {
        if (pr < 2) {
          signals.push({ category: 'fundamental', indicator: 'Price/Revenue Ratio', value: pr, signal: 'buy', score: 1 });
        } else if (pr > 4) {
          signals.push({ category: 'fundamental', indicator: 'Price/Revenue Ratio', value: pr, signal: 'sell', score: -1 });
        } else {
          signals.push({ category: 'fundamental', indicator: 'Price/Revenue Ratio', value: pr, signal: 'hold', score: 0 });
        }
      } else {
        signals.push({ category: 'fundamental', indicator: 'Price/Revenue Ratio', signal: 'hold', score: 0 });
      }

      if (typeof bvps === 'number') {
        if (price <= 0.9 * bvps) {
          signals.push({ category: 'fundamental', indicator: 'Price/BVPS', value: price / bvps, signal: 'buy', score: 1 });
        } else if (bvps <= 0 || price >= 2.5 * bvps) {
          signals.push({ category: 'fundamental', indicator: 'Price/BVPS', value: price / bvps, signal: 'sell', score: -1 });
        } else {
          signals.push({ category: 'fundamental', indicator: 'Price/BVPS', value: price / bvps, signal: 'hold', score: 0 });
        }
      } else {
        signals.push({ category: 'fundamental', indicator: 'Price/BVPS', signal: 'hold', score: 0 });
      }
    }

    // Comprehensive income
    const compValues = finQ
      .map((r: any) => getNested(r, ['financials', 'income_statement', 'comprehensive_income', 'value']))
      .filter((v): v is number => Number.isFinite(v));
    if (compValues.length >= 2) {
      const pos2 = compValues.slice(0, 2).every((v) => v > 0);
      const neg2 = compValues.slice(0, 2).every((v) => v < 0);
      if (pos2) {
        signals.push({ category: 'fundamental', indicator: 'Comprehensive Income', signal: 'buy', score: 1 });
      } else if (neg2) {
        signals.push({ category: 'fundamental', indicator: 'Comprehensive Income', signal: 'sell', score: -1 });
      } else {
        signals.push({ category: 'fundamental', indicator: 'Comprehensive Income', signal: 'hold', score: 0 });
      }
    }
  }

  // === Growth Metrics ===

  // Revenue growth
  const revGrowthQ =
    computeGrowth(finQ, ['financials', 'income_statement', 'revenues', 'value']) ??
    computeGrowth(finQ, ['financials', 'income_statement', 'net_sales', 'value']);
  const revGrowthA =
    computeGrowth(finA, ['financials', 'income_statement', 'revenues', 'value']) ??
    computeGrowth(finA, ['financials', 'income_statement', 'net_sales', 'value']);
  if (typeof revGrowthQ === 'number' || typeof revGrowthA === 'number') {
    if ((revGrowthQ ?? -Infinity) > 0.08 || (revGrowthA ?? -Infinity) > 0.07) {
      signals.push({ category: 'growth', indicator: 'Revenue Growth', signal: 'buy', score: 1 });
    } else if ((revGrowthQ ?? Infinity) < -0.08 || (revGrowthA ?? Infinity) < -0.07) {
      signals.push({ category: 'growth', indicator: 'Revenue Growth', signal: 'sell', score: -1 });
    } else {
      signals.push({ category: 'growth', indicator: 'Revenue Growth', signal: 'hold', score: 0 });
    }
  }

  // Net income growth
  const niGrowthQ = computeGrowth(finQ, ['financials', 'income_statement', 'net_income', 'value']);
  const niGrowthA = computeGrowth(finA, ['financials', 'income_statement', 'net_income', 'value']);
  if (typeof niGrowthQ === 'number' || typeof niGrowthA === 'number') {
    if ((niGrowthQ ?? -Infinity) > 0.08 || (niGrowthA ?? -Infinity) > 0.07) {
      signals.push({ category: 'growth', indicator: 'Net Income Growth', signal: 'buy', score: 1 });
    } else if ((niGrowthQ ?? Infinity) < -0.08 || (niGrowthA ?? Infinity) < -0.07) {
      signals.push({ category: 'growth', indicator: 'Net Income Growth', signal: 'sell', score: -1 });
    } else {
      signals.push({ category: 'growth', indicator: 'Net Income Growth', signal: 'hold', score: 0 });
    }
  }

  // Operating cash flow growth
  const ocfGrowthQ = computeGrowth(finQ, ['financials', 'cash_flow_statement', 'net_cash_provided_by_operating_activities', 'value']);
  const ocfGrowthA = computeGrowth(finA, ['financials', 'cash_flow_statement', 'net_cash_provided_by_operating_activities', 'value']);
  if (typeof ocfGrowthQ === 'number' || typeof ocfGrowthA === 'number') {
    if ((ocfGrowthQ ?? -Infinity) > 0.08 || (ocfGrowthA ?? -Infinity) > 0.07) {
      signals.push({ category: 'growth', indicator: 'Operating Cash Flow Growth', signal: 'buy', score: 1 });
    } else if ((ocfGrowthQ ?? Infinity) < -0.08 || (ocfGrowthA ?? Infinity) < -0.07) {
      signals.push({ category: 'growth', indicator: 'Operating Cash Flow Growth', signal: 'sell', score: -1 });
    } else {
      signals.push({ category: 'growth', indicator: 'Operating Cash Flow Growth', signal: 'hold', score: 0 });
    }
  }

  // EPS growth
  const epsValuesQ = finQ
    .map((r: any) => {
      const ni = getNested(r, ['financials', 'income_statement', 'net_income', 'value']);
      const sh = sharesFor(r);
      return typeof ni === 'number' && typeof sh === 'number' && sh > 0 ? ni / sh : undefined;
    })
    .filter((v): v is number => Number.isFinite(v));
  const epsValuesA = finA
    .map((r: any) => {
      const ni = getNested(r, ['financials', 'income_statement', 'net_income', 'value']);
      const sh = sharesFor(r);
      return typeof ni === 'number' && typeof sh === 'number' && sh > 0 ? ni / sh : undefined;
    })
    .filter((v): v is number => Number.isFinite(v));
  const epsGrowthQ = computeGrowthFromValues(epsValuesQ);
  const epsGrowthA = computeGrowthFromValues(epsValuesA);
  if (typeof epsGrowthQ === 'number' || typeof epsGrowthA === 'number') {
    if ((epsGrowthQ ?? -Infinity) > 0.08 || (epsGrowthA ?? -Infinity) > 0.07) {
      signals.push({ category: 'growth', indicator: 'EPS Growth', signal: 'buy', score: 2 });
    } else if ((epsGrowthQ ?? Infinity) < -0.08 || (epsGrowthA ?? Infinity) < -0.07) {
      signals.push({ category: 'growth', indicator: 'EPS Growth', signal: 'sell', score: -2 });
    } else {
      signals.push({ category: 'growth', indicator: 'EPS Growth', signal: 'hold', score: 0 });
    }
  }

  // Share dilution
  const sharesValuesQ = finQ
    .map((r: any) => sharesFor(r))
    .filter((v): v is number => Number.isFinite(v));
  const sharesGrowth = computeGrowthFromValues(sharesValuesQ);
  if (typeof sharesGrowth === 'number') {
    if (sharesGrowth < -0.03) {
      signals.push({ category: 'growth', indicator: 'Share Dilution', signal: 'buy', score: 1 });
    } else if (sharesGrowth > 0.03) {
      signals.push({ category: 'growth', indicator: 'Share Dilution', signal: 'sell', score: -1 });
    } else {
      signals.push({ category: 'growth', indicator: 'Share Dilution', signal: 'hold', score: 0 });
    }
  }

  // Revenue per share growth
  const revPerShareQ = finQ
    .map((r: any) => {
      const rev =
        getNested(r, ['financials', 'income_statement', 'revenues', 'value']) ??
        getNested(r, ['financials', 'income_statement', 'net_sales', 'value']);
      const sh = sharesFor(r);
      return typeof rev === 'number' && typeof sh === 'number' && sh > 0 ? rev / sh : undefined;
    })
    .filter((v): v is number => Number.isFinite(v));
  const revPerShareA = finA
    .map((r: any) => {
      const rev =
        getNested(r, ['financials', 'income_statement', 'revenues', 'value']) ??
        getNested(r, ['financials', 'income_statement', 'net_sales', 'value']);
      const sh = sharesFor(r);
      return typeof rev === 'number' && typeof sh === 'number' && sh > 0 ? rev / sh : undefined;
    })
    .filter((v): v is number => Number.isFinite(v));
  const revPSGrowthQ = computeGrowthFromValues(revPerShareQ);
  const revPSGrowthA = computeGrowthFromValues(revPerShareA);
  if (typeof revPSGrowthQ === 'number' || typeof revPSGrowthA === 'number') {
    if ((revPSGrowthQ ?? -Infinity) > 0.08 || (revPSGrowthA ?? -Infinity) > 0.07) {
      signals.push({ category: 'growth', indicator: 'Revenue/Share Growth', signal: 'buy', score: 1 });
    } else if ((revPSGrowthQ ?? Infinity) < -0.08 || (revPSGrowthA ?? Infinity) < -0.07) {
      signals.push({ category: 'growth', indicator: 'Revenue/Share Growth', signal: 'sell', score: -1 });
    } else {
      signals.push({ category: 'growth', indicator: 'Revenue/Share Growth', signal: 'hold', score: 0 });
    }
  }

  // BVPS growth
  const bvpsValuesQ = finQ
    .map((r: any) => {
      const eq =
        getNested(r, ['financials', 'balance_sheet', 'stockholders_equity', 'value']) ??
        getNested(r, ['financials', 'balance_sheet', 'total_stockholders_equity', 'value']);
      const sh = sharesFor(r);
      return typeof eq === 'number' && typeof sh === 'number' && sh > 0 ? eq / sh : undefined;
    })
    .filter((v): v is number => Number.isFinite(v));
  const bvpsValuesA = finA
    .map((r: any) => {
      const eq =
        getNested(r, ['financials', 'balance_sheet', 'stockholders_equity', 'value']) ??
        getNested(r, ['financials', 'balance_sheet', 'total_stockholders_equity', 'value']);
      const sh = sharesFor(r);
      return typeof eq === 'number' && typeof sh === 'number' && sh > 0 ? eq / sh : undefined;
    })
    .filter((v): v is number => Number.isFinite(v));
  const bvpsGrowthQ = computeGrowthFromValues(bvpsValuesQ);
  const bvpsGrowthA = computeGrowthFromValues(bvpsValuesA);
  if (typeof bvpsGrowthQ === 'number' || typeof bvpsGrowthA === 'number') {
    if ((bvpsGrowthQ ?? -Infinity) > 0.08 || (bvpsGrowthA ?? -Infinity) > 0.07) {
      signals.push({ category: 'growth', indicator: 'BVPS Growth', signal: 'buy', score: 1 });
    } else if ((bvpsGrowthQ ?? Infinity) < -0.08 || (bvpsGrowthA ?? Infinity) < -0.07) {
      signals.push({ category: 'growth', indicator: 'BVPS Growth', signal: 'sell', score: -1 });
    } else {
      signals.push({ category: 'growth', indicator: 'BVPS Growth', signal: 'hold', score: 0 });
    }
  }

  return signals;
}

