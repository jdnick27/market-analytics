import 'dotenv/config';
import { generateSignals, IndicatorSignal } from './signals';
import * as XLSX from 'xlsx';

// tiny contract:
// input: none – fetches an array of tickers from Polygon.io
// output: prints indicator signals for each ticker and
//         lists the top stocks to buy and top stocks to sell based on aggregated scores

function previousDay(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1); // previous local day
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function compositeScore(signals: IndicatorSignal[]): number {
  const totals = { technical: 0, fundamental: 0, growth: 0 };
  for (const s of signals) totals[s.category] += s.score;
  const normTech = totals.technical / 9; // max +/-9
  const normFund = totals.fundamental / 11; // max +/-11
  const normGrowth = totals.growth / 8; // max +/-8
  return 0.4 * normTech + 0.4 * normFund + 0.2 * normGrowth;
}

async function main(): Promise<void> {
  const tickers = ['NVDA','MSFT','BCH','AMZN','TLK','KOF','AVGO','FMX','AMX','HSBC',
 'TSLA','WMT','JPM','TV','CMS','PDD','LLY','V','ORCL','HDB',
 'BP','MA','NFLX','XOM','COST','JNJ','NTES','HD','CX','PLTR',
 'PG','EC','ABBV','BAC','CHT','NGG','SAP','CVX','KO','TMUS',
 'ASML','BCS','VOD','UNH','BHP','AMD','LYG','CSCO','PM','DEO',
 'AMC', 'GME', 'HITI', 'RKLB', 'BULL', 'APLD', 'EOSE', 'UROY',
 'COIN', 'BKNG', 'SMR', 'BABA', 'AMD', 'IBM', 'HYMC', 'INTC',
 'CRON', 'TLRY', 'CGC', 'ACB', 'SNDL', 'CRM', 'TSM'];
  const date = previousDay();
  console.log(`Generating signals for ${tickers.join(', ')} on ${date}`);
  try {
    // Process tickers in small batches to avoid opening too many simultaneous
    // connections to the Polygon API which can cause "socket hang up" errors.
    async function mapBatched<T, R>(items: T[], batchSize: number, fn: (t: T) => Promise<R>) {
      const out: R[] = [];
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const res = await Promise.all(batch.map(fn));
        out.push(...res);
      }
      return out;
    }

    const BATCH_SIZE = 5;
    const results = await mapBatched(tickers, BATCH_SIZE, async (symbol) => {
      const signals = await generateSignals(symbol, date);
      const score = compositeScore(signals);
      return { symbol, signals, score };
    });

    results.forEach(({ symbol, signals, score }) => {
      console.log(`\n${symbol} signals:`, signals);
      console.log(`Composite score: ${score}`);
    });

    const sorted = results.slice().sort((a, b) => b.score - a.score);
    const bestTickers = sorted.filter((r) => r.score > 0);
    const worstTickers = sorted.filter((r) => r.score < 0).reverse();
    console.log('\nTop Stocks to Buy:', bestTickers.map((r) => `${r.symbol} (${r.score.toFixed(2)})`));
    console.log('Top Stocks to Sell:', worstTickers.map((r) => `${r.symbol} (${r.score.toFixed(2)})`));

    const indicatorKeys = Array.from(
      new Set(results.flatMap(({ signals }) => signals.map((s) => s.indicator)))
    ).sort();

    const buildRows = (items: typeof results) =>
      items.map(({ symbol, signals, score }) => {
        const indicatorMap = Object.fromEntries(
          signals.map((s) => [s.indicator, s.signal])
        ) as Record<string, 'buy' | 'sell' | 'hold'>;

        return {
          Symbol: symbol,
          Score: score,
          ...Object.fromEntries(
            indicatorKeys.map((key) => [key, indicatorMap[key] ?? ''])
          ),
        };
      });

    const workbook = XLSX.utils.book_new();
    const allSheet = XLSX.utils.json_to_sheet(buildRows(results));
    XLSX.utils.book_append_sheet(workbook, allSheet, 'All Signals');

    const topBuys = bestTickers.slice(0, 10);
    const topSells = worstTickers.slice(0, 10);
    const buySheet = XLSX.utils.json_to_sheet(buildRows(topBuys));
    XLSX.utils.book_append_sheet(workbook, buySheet, 'Top Buys');
    const sellSheet = XLSX.utils.json_to_sheet(buildRows(topSells));
    XLSX.utils.book_append_sheet(workbook, sellSheet, 'Top Sells');

    const outputFile = `market-signals-${date}.xlsx`;
    XLSX.writeFile(workbook, outputFile);
    console.log(`\nSaved Excel report to ${outputFile}`);
  } catch (err: any) {
    console.error('Error fetching market data:', err?.message || err);
    process.exitCode = 1;
  }
}

if (require.main === module) void main();
