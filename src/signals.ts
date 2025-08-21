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

  const macdVal = macdArr?.[0]?.value;
  const macdSignal = macdArr?.[0]?.signal;
  const macdHist = macdArr?.[0]?.histogram;
  if (typeof macdVal === 'number' && typeof macdSignal === 'number' && typeof macdHist === 'number') {
    // histogram is typically macd - signal; use it for direction/strength
    const diff = macdHist;
    const score = Math.min(100, Math.round(Math.abs(diff) * 100));
    if (Math.abs(diff) < 0.01) {
      signals.push({
        indicator: 'MACD',
        macd: { value: macdVal, signal: macdSignal, histogram: macdHist },
        signal: 'hold',
        score: 0,
      });
    } else if (diff > 0) {
      signals.push({
        indicator: 'MACD',
        macd: { value: macdVal, signal: macdSignal, histogram: macdHist },
        signal: 'buy',
        score,
      });
    } else {
      signals.push({
        indicator: 'MACD',
        macd: { value: macdVal, signal: macdSignal, histogram: macdHist },
        signal: 'sell',
        score,
      });
    }
  }

  return signals;
}

