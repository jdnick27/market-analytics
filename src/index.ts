import 'dotenv/config';
import { getOpenClose, listTickers } from './polygonClient';
import { generateSignals } from './signals';

// tiny contract:
// input: symbol (string) via CLI arg or default 'AAPL'
// optional date (YYYY-MM-DD) via second arg; defaults to today
// output: prints the daily open/close summary to console

function previousDay(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1); // previous local day
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

async function main(): Promise<void> {
  const date = previousDay();
  console.log(`Fetching tickers and market data for ${date}`);
  try {
    const tickers = await listTickers(5, { market: 'stocks', active: true });
    console.log('Tickers:', tickers);
    for (const symbol of tickers) {
      const data = await getOpenClose(symbol, date);
      console.log(`Open/Close summary for ${symbol}:`);
      console.dir(data, { depth: null });

      const signals = await generateSignals(symbol, date);
      console.log(`Signals for ${symbol}:`, signals);
    }
  } catch (err: any) {
    console.error('Error fetching market data:', err?.message || err);
    process.exitCode = 1;
  }
}

if (require.main === module) void main();
