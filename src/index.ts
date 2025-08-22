import 'dotenv/config';
import { generateSignals, IndicatorSignal } from './signals';
import { formatPosts, Snapshot } from './makePosts';

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

function aggregateSignalScore(signals: IndicatorSignal[]): number {
  return signals.reduce((total, s) => {
    if (s.signal === 'buy') return total + s.score;
    if (s.signal === 'sell') return total - s.score;
    return total;
  }, 0);
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
      const { price, projectedPrice, signals } = await generateSignals(symbol, date);
      const score = aggregateSignalScore(signals);
      return { symbol, price, projectedPrice, signals, score };
    });

    results.forEach(({ symbol, price, projectedPrice, signals, score }) => {
      console.log(`\n${symbol} signals:`, signals);
      console.log(`Total score: ${score}`);
      if (typeof price === 'number' && typeof projectedPrice === 'number') {
        console.log(`Projected Price: ${projectedPrice.toFixed(2)} (current: ${price.toFixed(2)})`);
      }
    });

    const sorted = results.slice().sort((a, b) => b.score - a.score);
    const bestTickers = sorted.filter((r) => r.score > 0);
    const worstTickers = sorted.filter((r) => r.score < 0).reverse();
    console.log('\nTop Stocks to Buy:', bestTickers.map((r) => `${r.symbol} (${r.score})`));
    console.log('Top Stocks to Sell:', worstTickers.map((r) => `${r.symbol} (${r.score})`));

    const withChange = results
      .filter(
        (r): r is (typeof results)[number] & {
          price: number;
          projectedPrice: number;
        } => typeof r.price === 'number' && typeof r.projectedPrice === 'number'
      )
      .map((r) => ({
        ...r,
        changePercent: ((r.projectedPrice - r.price) / r.price) * 100,
      }));

    const topIncreases = withChange
      .filter((r) => r.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 10);

    const topDecreases = withChange
      .filter((r) => r.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 10);

    console.log(
      '\nTop 10 Highest Price Increases:',
      topIncreases.map(
        (r) =>
          `${r.symbol} (current: ${r.price.toFixed(2)}, projected: ${r.projectedPrice.toFixed(
            2
          )}, change: ${r.changePercent.toFixed(2)}%)`
      )
    );

    console.log(
      'Top 10 Highest Price Decreases:',
      topDecreases.map(
        (r) =>
          `${r.symbol} (current: ${r.price.toFixed(2)}, projected: ${r.projectedPrice.toFixed(
            2
          )}, change: ${r.changePercent.toFixed(2)}%)`
      )
    );

    // Create posts summarizing signals for the top 5 stocks to buy
    const topBuys = bestTickers.slice(0, 5);
    const buySnapshots: Snapshot[] = topBuys.map(({ symbol, signals, score }) => ({
      ticker: symbol,
      score,
      indicators: Object.fromEntries(
        signals.map((s) => [s.indicator, s.signal])
      ) as Record<string, 'buy' | 'sell' | 'hold'>,
    }));

    // Create posts summarizing signals for the top 5 stocks to sell
    const topSells = worstTickers.slice(0, 5);
    const sellSnapshots: Snapshot[] = topSells.map(({ symbol, signals, score }) => ({
      ticker: symbol,
      score,
      indicators: Object.fromEntries(
        signals.map((s) => [s.indicator, s.signal])
      ) as Record<string, 'buy' | 'sell' | 'hold'>,
    }));

    const buyPosts = formatPosts(buySnapshots, {
      maxBullets: 3,
      emojis: {
        header: ['🚀', '📉', '📊'],
        strength: '🟢',
        weakness: '🔴',
      },
      hashtags: [],
    });
    const sellPosts = formatPosts(sellSnapshots, {
      maxBullets: 3,
      emojis: {
        header: ['🚀', '📉', '📊'],
        strength: '🟢',
        weakness: '🔴',
      },
      hashtags: [],
    });
    console.log('\nPosts (Top Stocks to Buy):', buyPosts);
    console.log('\nPosts (Top Stocks to Sell):', sellPosts);
  } catch (err: any) {
    console.error('Error fetching market data:', err?.message || err);
    process.exitCode = 1;
  }
}

if (require.main === module) void main();
