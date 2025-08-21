import 'dotenv/config';
import { getOpenClose } from './polygonClient';

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
  const symbol = 'AAPL';
  const date = previousDay();
  console.log(`Fetching open/close for: ${symbol} on ${date}`);
  try {
    const data = await getOpenClose(symbol, date);
    console.log('Open/Close summary:');
    console.dir(data, { depth: null });
  } catch (err: any) {
    console.error('Error fetching open/close:', err?.message || err);
    process.exitCode = 1;
  }
}

if (require.main === module) void main();
