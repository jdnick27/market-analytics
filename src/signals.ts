import { getSMA, getEMA, getMACD, getRSI } from './polygonClient';

export interface IndicatorSignal {
  indicator: string;
  signal: 'buy' | 'sell' | 'hold';
  score: number; // 0 (neutral) to 100 (strong)
}

export async function generateSignals(symbol: string, price: number): Promise<IndicatorSignal[]> {
  const [smaArr, emaArr, macdArr, rsiArr] = await Promise.all([
    getSMA(symbol),
    getEMA(symbol),
    getMACD(symbol),
    getRSI(symbol),
  ]);
  const signals: IndicatorSignal[] = [];

  const rsiValue = rsiArr?.[0]?.value;
  if (typeof rsiValue === 'number') {
    if (rsiValue > 70) {
      const score = Math.min(100, Math.round(((rsiValue - 70) / 30) * 100));
      signals.push({ indicator: 'RSI', signal: 'sell', score });
    } else if (rsiValue < 30) {
      const score = Math.min(100, Math.round(((30 - rsiValue) / 30) * 100));
      signals.push({ indicator: 'RSI', signal: 'buy', score });
    } else {
      signals.push({ indicator: 'RSI', signal: 'hold', score: 0 });
    }
  }

  const smaValue = smaArr?.[0]?.value;
  if (typeof smaValue === 'number' && typeof price === 'number') {
    const diffPerc = ((price - smaValue) / smaValue) * 100;
    const score = Math.min(100, Math.round(Math.abs(diffPerc)));
    if (Math.abs(diffPerc) < 0.1) {
      signals.push({ indicator: 'SMA', signal: 'hold', score: 0 });
    } else if (diffPerc > 0) {
      signals.push({ indicator: 'SMA', signal: 'buy', score });
    } else {
      signals.push({ indicator: 'SMA', signal: 'sell', score });
    }
  }

  const emaValue = emaArr?.[0]?.value;
  if (typeof emaValue === 'number' && typeof price === 'number') {
    const diffPerc = ((price - emaValue) / emaValue) * 100;
    const score = Math.min(100, Math.round(Math.abs(diffPerc)));
    if (Math.abs(diffPerc) < 0.1) {
      signals.push({ indicator: 'EMA', signal: 'hold', score: 0 });
    } else if (diffPerc > 0) {
      signals.push({ indicator: 'EMA', signal: 'buy', score });
    } else {
      signals.push({ indicator: 'EMA', signal: 'sell', score });
    }
  }

  const macdVal = macdArr?.[0]?.macd;
  const macdSignal = macdArr?.[0]?.signal;
  if (typeof macdVal === 'number' && typeof macdSignal === 'number') {
    const diff = macdVal - macdSignal;
    const score = Math.min(100, Math.round(Math.abs(diff) * 100));
    if (Math.abs(diff) < 0.01) {
      signals.push({ indicator: 'MACD', signal: 'hold', score: 0 });
    } else if (diff > 0) {
      signals.push({ indicator: 'MACD', signal: 'buy', score });
    } else {
      signals.push({ indicator: 'MACD', signal: 'sell', score });
    }
  }

  return signals;
}

