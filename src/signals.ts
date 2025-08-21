import {
  getOpenClose,
  getSMA,
  getEMA,
  getMACD,
  getRSI,
  get52WeekHighLow,
  getShortInterest,
  getShortVolume,
  getTicker,
  getSharesOutstanding,
  getFinancials,
} from './polygonClient';

export interface IndicatorSignal {
  indicator: string;
  value?: number;
  macd?: {
    value: number;
    signal: number;
    histogram: number;
  };
  signal: 'buy' | 'sell' | 'hold';
  score: number; // 0 (neutral) to 100 (strong)
}

function previousDay(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function generateSignals(symbol: string, date = previousDay()): Promise<IndicatorSignal[]> {
  const [
    oc,
    smaArr,
    emaArr,
    macdArr,
    rsiArr,
    hiLo,
    shortVol,
    shortInt,
    sharesOutstanding,
    fin,
  ] = await Promise.all([
    getOpenClose(symbol, date),
    getSMA(symbol),
    getEMA(symbol),
    getMACD(symbol),
    getRSI(symbol),
    get52WeekHighLow(symbol, date),
    getShortVolume(symbol, date),
    getShortInterest(symbol),
    getSharesOutstanding(symbol),
    getFinancials(symbol),
  ]);

  // oc is Polygon open-close response which has .close
  const price: number | undefined = oc?.close;
  const signals: IndicatorSignal[] = [];

  // RSI signal
  const rsiValue = rsiArr?.[0]?.value;
  if (typeof rsiValue === 'number') {
    if (rsiValue > 70) {
      const score = Math.min(100, Math.round(((rsiValue - 70) / 30) * 100));
      signals.push({ indicator: 'RSI', value: rsiValue, signal: 'sell', score });
    } else if (rsiValue < 30) {
      const score = Math.min(100, Math.round(((30 - rsiValue) / 30) * 100));
      signals.push({ indicator: 'RSI', value: rsiValue, signal: 'buy', score });
    } else {
      signals.push({ indicator: 'RSI', value: rsiValue, signal: 'hold', score: 0 });
    }
  }

  // SMA signal
  const smaValue = smaArr?.[0]?.value;
  if (typeof smaValue === 'number' && typeof price === 'number') {
    const diffPerc = ((price - smaValue) / smaValue) * 100;
    const score = Math.min(100, Math.round(Math.abs(diffPerc)));
    if (Math.abs(diffPerc) < 0.1) {
      signals.push({ indicator: 'SMA', value: smaValue, signal: 'hold', score: 0 });
    } else if (diffPerc > 0) {
      signals.push({ indicator: 'SMA', value: smaValue, signal: 'buy', score });
    } else {
      signals.push({ indicator: 'SMA', value: smaValue, signal: 'sell', score });
    }
  }

  // 52-week high / low signal
  if (hiLo && typeof price === 'number') {
    const { high, low } = hiLo as { high: number; low: number };
    if (Number.isFinite(high) && Number.isFinite(low) && high > 0 && low > 0) {
      const distHighPerc = ((high - price) / high) * 100; // percent below the high
      const distLowPerc = ((price - low) / low) * 100; // percent above the low

      // thresholds (percent): within 1% of either extreme is notable
      const threshold = 1.0;

      if (distHighPerc <= threshold) {
        // price is within threshold of 52w high -> consider taking profits (sell)
        const closeness = Math.max(0, 1 - distHighPerc / threshold); // 0..1 where 1 = at high
        let score = Math.min(100, Math.round(closeness * 100));
        // small boost if extremely close (within 0.25%)
        if (distHighPerc <= 0.25) score = Math.min(100, score + 10);
        signals.push({ indicator: '52W', value: high, signal: 'sell', score });
      } else if (distLowPerc <= threshold) {
        // price is within threshold of 52w low -> consider buying (oversold)
        const closeness = Math.max(0, 1 - distLowPerc / threshold); // 0..1 where 1 = at low
        let score = Math.min(100, Math.round(closeness * 100));
        if (distLowPerc <= 0.25) score = Math.min(100, score + 10);
        signals.push({ indicator: '52W', value: low, signal: 'buy', score });
      } else {
        signals.push({ indicator: '52W', value: price, signal: 'hold', score: 0 });
      }
    }
  }

  // Short interest signal
  if (shortInt) {
    const si = shortInt as any;
    // short_percent will never be present per your note; compute from short_interest / sharesOutstanding
    let shortPercent: number | undefined;
    if (Number.isFinite(si.short_interest)) {
      const shortInterestVal = Number(si.short_interest);
      if (Number.isFinite((sharesOutstanding as any)) && Number(sharesOutstanding) > 0) {
        shortPercent = (shortInterestVal / Number(sharesOutstanding)) * 100;
      }
      // If float is provided directly in SI, prefer that
      else if (Number.isFinite(si.float) && si.float > 0) {
        shortPercent = (shortInterestVal / Number(si.float)) * 100;
      }
    }

    if (typeof shortPercent === 'number') {
      // Use percentage-based thresholds when we have a true percent
      let signal: 'buy' | 'sell' | 'hold' = 'hold';
      let score = 0;
      if (shortPercent > 20) {
        signal = 'sell';
        score = Math.min(100, Math.round(((shortPercent - 20) / 80) * 100));
      } else if (shortPercent < 5) {
        signal = 'buy';
        score = Math.min(100, Math.round(((5 - shortPercent) / 5) * 100));
      }
      signals.push({ indicator: 'SHORT_INT', value: shortPercent, signal, score });
    } else if (Number.isFinite(si.days_to_cover)) {
      // Fallback: many APIs return short_interest, avg_daily_volume and days_to_cover instead of a percent.
      // Use days_to_cover as a liquidity-based heuristic: high days-to-cover -> bearish, low -> bullish.
      const days = Number(si.days_to_cover);
      let signal: 'buy' | 'sell' | 'hold' = 'hold';
      let score = 0;
      if (days > 5) {
        // heavy short interest relative to liquidity
        signal = 'sell';
        score = Math.min(100, Math.round(((days - 5) / 45) * 100)); // scale: 5..50 -> 0..100
      } else if (days < 1) {
        // very easy to cover shorts -> bullish
        signal = 'buy';
        score = Math.min(100, Math.round(((1 - days) / 1) * 100));
      }
      // store days_to_cover as the value when percent is not available
      signals.push({ indicator: 'SHORT_INT', value: days, signal, score });
    }
  }

  // Short volume signal
  const shortVolVal = Number((shortVol as any)?.short_volume ?? (shortVol as any)?.shortVolume);
  const totalVolVal = Number((shortVol as any)?.volume ?? (shortVol as any)?.total_volume);
  if (Number.isFinite(shortVolVal) && Number.isFinite(totalVolVal) && totalVolVal > 0) {
    const ratio = shortVolVal / totalVolVal;
    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    let score = 0;
    if (ratio > 0.4) {
      signal = 'sell';
      score = Math.min(100, Math.round(((ratio - 0.4) / 0.6) * 100));
    } else if (ratio < 0.2) {
      signal = 'buy';
      score = Math.min(100, Math.round(((0.2 - ratio) / 0.2) * 100));
    }
    signals.push({ indicator: 'SHORT_VOL', value: ratio, signal, score });
  }

  // EMA signal
  const emaValue = emaArr?.[0]?.value;
  if (typeof emaValue === 'number' && typeof price === 'number') {
    const diffPerc = ((price - emaValue) / emaValue) * 100;
    const score = Math.min(100, Math.round(Math.abs(diffPerc)));
    if (Math.abs(diffPerc) < 0.1) {
      signals.push({ indicator: 'EMA', value: emaValue, signal: 'hold', score: 0 });
    } else if (diffPerc > 0) {
      signals.push({ indicator: 'EMA', value: emaValue, signal: 'buy', score });
    } else {
      signals.push({ indicator: 'EMA', value: emaValue, signal: 'sell', score });
    }
  }

  // Reworked MACD logic: look at multiple days to detect turning points.
  // We prefer setups where the histogram has bottomed (more negative previously) and
  // is now rising toward zero while the MACD line is approaching the signal line
  // (i.e., the MACD - signal difference is shrinking and moving toward a positive cross).
  // Also consider crosses of the 0.00 baseline (for MACD and histogram) as a bullish/bearish confirmation.
  const macdArrRaw = macdArr ?? [];
  if (Array.isArray(macdArrRaw) && macdArrRaw.length > 0) {
    // Ensure we have newest-first ordering by timestamp when available.
    const sorted = macdArrRaw.slice().sort((a: any, b: any) => {
      const ta = a.t ?? a.timestamp ?? 0;
      const tb = b.t ?? b.timestamp ?? 0;
      return tb - ta; // newest first
    });

    const lookback = Math.min(5, sorted.length);
    const recent = sorted.slice(0, lookback);

    const hist = recent.map((r: any) => Number(r.histogram));
    const macdVals = recent.map((r: any) => Number(r.value));
    const sigVals = recent.map((r: any) => Number(r.signal));

    const currentHist = hist[0];
    const currentMacd = macdVals[0];
    const currentSignal = sigVals[0];

    const valid = [currentHist, currentMacd, currentSignal].every((v) => Number.isFinite(v));
    if (valid) {
      // Simple guard: if histogram is extremely small, treat as hold
      if (Math.abs(currentHist) < 0.001) {
        signals.push({
          indicator: 'MACD',
          macd: { value: currentMacd, signal: currentSignal, histogram: currentHist },
          signal: 'hold',
          score: 0,
        });
      } else {
        // Determine whether the histogram has recently bottomed and is rising
        const histFinite = hist.filter(Number.isFinite);
        const histMin = histFinite.length ? Math.min(...histFinite) : NaN;
        const histMinIdx = hist.indexOf(histMin); // index in recent (0 = newest)
        const prevHist = hist[1];
        const histRising = Number.isFinite(prevHist) ? currentHist > prevHist : false;

        // Compute MACD - signal diffs and whether they're approaching a cross
        const diffs = recent.map((r: any, i: number) =>
          Number.isFinite(macdVals[i]) && Number.isFinite(sigVals[i]) ? macdVals[i] - sigVals[i] : NaN
        );
        const currDiff = diffs[0];
        const prevDiff = diffs[1];
        const approaching = Number.isFinite(currDiff) && Number.isFinite(prevDiff)
          ? Math.abs(prevDiff) > Math.abs(currDiff) && currDiff > prevDiff
          : false;

        // Baseline (0.00) crossover checks for MACD line and histogram
        const prevMacd = macdVals[1];
        const macdCrossUp = Number.isFinite(prevMacd) ? currentMacd > 0 && prevMacd <= 0 : false;
        const macdCrossDown = Number.isFinite(prevMacd) ? currentMacd < 0 && prevMacd >= 0 : false;
        const histCrossUp = Number.isFinite(prevHist) ? currentHist > 0 && prevHist <= 0 : false;
        const histCrossDown = Number.isFinite(prevHist) ? currentHist < 0 && prevHist >= 0 : false;

        // Score: prefer a deep bottom (big negative hist min) + strong approach to cross
        let score = Math.min(100, Math.round(Math.abs(currentHist) * 100));

        if (histMinIdx > 0 && histRising && approaching) {
          // deeper bottom increases score; approaching improvement increases score
          const depthScore = Math.min(100, Math.round(Math.abs(histMin) * 100));
          const approachImprovement = Number.isFinite(prevDiff) && Math.abs(prevDiff) > 0
            ? Math.min(100, Math.round(((Math.abs(prevDiff) - Math.abs(currDiff)) / Math.abs(prevDiff)) * 100))
            : 0;
          // blend depth and approach (60% depth, 40% approach)
          score = Math.min(100, Math.round(depthScore * 0.6 + approachImprovement * 0.4));
        }

        // Boost score if we observe baseline cross confirmations
        if (macdCrossUp || histCrossUp) {
          score = Math.min(100, score + 20); // bullish confirmation
        } else if (macdCrossDown || histCrossDown) {
          score = Math.min(100, score + 20); // bearish confirmation
        }

        // Determine directional signal (consider cross-of-zero as confirmation/override)
        if ((currentHist > 0 && currDiff > 0) || macdCrossUp || histCrossUp) {
          signals.push({
            indicator: 'MACD',
            macd: { value: currentMacd, signal: currentSignal, histogram: currentHist },
            signal: 'buy',
            score,
          });
        } else if (histMinIdx > 0 && histRising && approaching && currDiff <= 0) {
          // Bottoming and approaching cross from below — treat as a buy setup
          signals.push({
            indicator: 'MACD',
            macd: { value: currentMacd, signal: currentSignal, histogram: currentHist },
            signal: 'buy',
            score,
          });
        } else if ((currentHist < 0 && currDiff < 0) || macdCrossDown || histCrossDown) {
          signals.push({
            indicator: 'MACD',
            macd: { value: currentMacd, signal: currentSignal, histogram: currentHist },
            signal: 'sell',
            score,
          });
        } else {
          signals.push({
            indicator: 'MACD',
            macd: { value: currentMacd, signal: currentSignal, histogram: currentHist },
            signal: 'hold',
            score: 0,
          });
        }
      }
    }
  }

  // Fundamental financial signals
  if (fin && fin.financials) {
    const fs = fin.financials;

    // Current ratio: current assets / current liabilities
    const ca = fs.balance_sheet?.current_assets?.value;
    const cl = fs.balance_sheet?.current_liabilities?.value;
    if (Number.isFinite(ca) && Number.isFinite(cl) && cl !== 0) {
      const ratio = ca / cl;
      let signal: 'buy' | 'sell' | 'hold' = 'hold';
      let score = 0;
      if (ratio > 1.5) {
        signal = 'buy';
        score = Math.min(100, Math.round((ratio - 1.5) * 50));
      } else if (ratio < 1) {
        signal = 'sell';
        score = Math.min(100, Math.round((1 - ratio) * 100));
      }
      signals.push({ indicator: 'Current Ratio', value: ratio, signal, score });
    }

    // Debt to equity: liabilities / equity
    const liab = fs.balance_sheet?.liabilities?.value;
    const eq = fs.balance_sheet?.equity?.value;
    if (Number.isFinite(liab) && Number.isFinite(eq) && eq !== 0) {
      const ratio = liab / eq;
      let signal: 'buy' | 'sell' | 'hold' = 'hold';
      let score = 0;
      if (ratio < 1) {
        signal = 'buy';
        score = Math.min(100, Math.round((1 - ratio) * 100));
      } else if (ratio > 2) {
        signal = 'sell';
        score = Math.min(100, Math.round((ratio - 2) * 50));
      }
      signals.push({ indicator: 'Debt/Equity', value: ratio, signal, score });
    }

    // Net margin: net income / revenues
    const rev = fs.income_statement?.revenues?.value;
    const net = fs.income_statement?.net_income_loss?.value;
    if (Number.isFinite(rev) && Number.isFinite(net) && rev !== 0) {
      const margin = net / rev;
      let signal: 'buy' | 'sell' | 'hold' = 'hold';
      let score = 0;
      if (margin > 0.1) {
        signal = 'buy';
        score = Math.min(100, Math.round(margin * 1000));
      } else if (margin < 0) {
        signal = 'sell';
        score = Math.min(100, Math.round(Math.abs(margin) * 1000));
      }
      signals.push({ indicator: 'Net Margin', value: margin, signal, score });
    }

    // Operating cash flow
    const opCash = fs.cash_flow_statement?.net_cash_flow_from_operating_activities?.value;
    if (Number.isFinite(opCash)) {
      let signal: 'buy' | 'sell' | 'hold' = 'hold';
      let score = Math.min(100, Math.round(Math.abs(opCash) / 1e6));
      if (opCash > 0) {
        signal = 'buy';
      } else if (opCash < 0) {
        signal = 'sell';
      } else {
        score = 0;
      }
      signals.push({ indicator: 'Operating Cash Flow', value: opCash, signal, score });
    }

    // Net cash flow
    const netCash = fs.cash_flow_statement?.net_cash_flow?.value;
    if (Number.isFinite(netCash)) {
      let signal: 'buy' | 'sell' | 'hold' = 'hold';
      let score = Math.min(100, Math.round(Math.abs(netCash) / 1e6));
      if (netCash > 0) {
        signal = 'buy';
      } else if (netCash < 0) {
        signal = 'sell';
      } else {
        score = 0;
      }
      signals.push({ indicator: 'Net Cash Flow', value: netCash, signal, score });
    }

    // Comprehensive income
    const compInc = fs.comprehensive_income?.comprehensive_income_loss?.value;
    if (Number.isFinite(compInc)) {
      let signal: 'buy' | 'sell' | 'hold' = 'hold';
      let score = Math.min(100, Math.round(Math.abs(compInc) / 1e6));
      if (compInc > 0) {
        signal = 'buy';
      } else if (compInc < 0) {
        signal = 'sell';
      } else {
        score = 0;
      }
      signals.push({ indicator: 'Comprehensive Income', value: compInc, signal, score });
    }
  }

  return signals;
}

