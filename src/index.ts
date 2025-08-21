import 'dotenv/config';
import { getSnapshots } from './polygonClient';
import { generateSignals } from './signals';

// tiny contract:
// input: comma-separated symbols via CLI arg or default 'AAPL'
// output: prints the full market snapshot and signals for each symbol

async function main(): Promise<void> {
  const tickersArg = process.argv[2] || 'AAPL';
  const tickers = tickersArg.split(',').map((t) => t.trim()).filter(Boolean);
  console.log(`Fetching snapshots for: ${tickers.join(', ')}`);
  try {
    const snapshots = await getSnapshots(tickers);
    const snapshotMap = new Map(snapshots.map((s: any) => [s.ticker, s]));

    await Promise.all(
      tickers.map(async (sym) => {
        const snap = snapshotMap.get(sym);
        if (!snap) {
          console.warn(`No snapshot found for ${sym}`);
          return;
        }
        console.log(`Snapshot for ${sym}:`);
        console.dir(snap, { depth: null });
        const price = snap?.day?.c ?? snap?.lastTrade?.p;
        if (typeof price !== 'number') {
          console.warn(`No price available for ${sym}`);
          return;
        }
        const signals = await generateSignals(sym, price);
        console.log(`Signals for ${sym}:`, signals);
      }),
    );
  } catch (err: any) {
    console.error('Error fetching market data:', err?.message || err);
    process.exitCode = 1;
  }
}

if (require.main === module) void main();
