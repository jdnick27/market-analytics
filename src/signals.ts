import { getOpenClose, getSMA, getEMA, getMACD, getRSI } from './polygonClient';

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
  const [oc, smaArr, emaArr, macdArr, rsiArr] = await Promise.all([
    getOpenClose(symbol, date),
    getSMA(symbol),
    getEMA(symbol),
    getMACD(symbol),
    getRSI(symbol),
  ]);

  const price: number | undefined = oc?.close;
  const signals: IndicatorSignal[] = [];

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
        const histMin = Math.min(...hist.filter(Number.isFinite));
        const histMinIdx = hist.indexOf(histMin); // index in recent (0 = newest)
        const prevHist = hist[1];
        const histRising = Number.isFinite(prevHist) ? currentHist > prevHist : false;

        // Compute MACD - signal diffs and whether they're approaching a cross
        const diffs = recent.map((r: any, i: number) => Number.isFinite(macdVals[i]) && Number.isFinite(sigVals[i]) ? macdVals[i] - sigVals[i] : NaN);
        const currDiff = diffs[0];
        const prevDiff = diffs[1];
        const approaching = Number.isFinite(currDiff) && Number.isFinite(prevDiff) ? Math.abs(prevDiff) > Math.abs(currDiff) && currDiff > prevDiff : false;

        // Score: prefer a deep bottom (big negative hist min) + strong approach to cross
        let score = Math.min(100, Math.round(Math.abs(currentHist) * 100));

        if (histMinIdx > 0 && histRising && approaching) {
          // deeper bottom increases score; approaching improvement increases score
          const depthScore = Math.min(100, Math.round(Math.abs(histMin) * 100));
          const approachImprovement = Number.isFinite(prevDiff) && Math.abs(prevDiff) > 0 ? Math.min(100, Math.round(((Math.abs(prevDiff) - Math.abs(currDiff)) / Math.abs(prevDiff)) * 100)) : 0;
          // blend depth and approach (60% depth, 40% approach)
          score = Math.min(100, Math.round(depthScore * 0.6 + approachImprovement * 0.4));
        }

        // Determine directional signal
        if (currentHist > 0 && currDiff > 0) {
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
        } else if (currentHist < 0 && currDiff < 0) {
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

  return signals;
}

