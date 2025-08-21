import 'dotenv/config';
import { generateSignals, IndicatorSignal } from './signals';

// tiny contract:
// input: none – uses a fixed array of tickers
// output: prints indicator signals for each ticker and
//         lists the best tickers to buy based on aggregated scores

function previousDay(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1); // previous local day
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function aggregateSignalScore(signals: IndicatorSignal[]): number {
  return signals.reduce((total, s) => {
    if (s.signal === 'buy') return total + s.score;
    if (s.signal === 'sell') return total - s.score;
    return total;
  }, 0);
}

async function main(): Promise<void> {
  const tickers = ['AAPL', 'MSFT', 'GOOGL'];
  const date = previousDay();
  console.log(`Generating signals for ${tickers.join(', ')} on ${date}`);
  try {
    const results = await Promise.all(
      tickers.map(async (symbol) => {
        const signals = await generateSignals(symbol, date);
        const score = aggregateSignalScore(signals);
        return { symbol, signals, score };
      }),
    );

    results.forEach(({ symbol, signals, score }) => {
      console.log(`\n${symbol} signals:`, signals);
      console.log(`Total score: ${score}`);
    });

    const sorted = results.slice().sort((a, b) => b.score - a.score);
    const bestTickers = sorted.filter((r) => r.score > 0);
    console.log('\nBest tickers to buy:', bestTickers.map((r) => `${r.symbol} (${r.score})`));
  } catch (err: any) {
    console.error('Error fetching market data:', err?.message || err);
    process.exitCode = 1;
  }
}

if (require.main === module) void main();
