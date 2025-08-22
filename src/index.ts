import 'dotenv/config';
import { generateSignals, IndicatorSignal } from './signals';
import { formatPosts, Snapshot } from './makePosts';

// tiny contract:
// input: none – fetches an array of tickers from Polygon.io
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
      const score = aggregateSignalScore(signals);
      return { symbol, signals, score };
    });

    results.forEach(({ symbol, signals, score }) => {
      console.log(`\n${symbol} signals:`, signals);
      console.log(`Total score: ${score}`);
    });

    const sorted = results.slice().sort((a, b) => b.score - a.score);
    const bestTickers = sorted.filter((r) => r.score > 0);
    const worstTickers = sorted.filter((r) => r.score < 0).reverse();
    console.log('\nBest tickers to buy:', bestTickers.map((r) => `${r.symbol} (${r.score})`));
    console.log('Worst tickers to sell:', worstTickers.map((r) => `${r.symbol} (${r.score})`));

    // Create posts summarizing signals for the top 5 tickers to buy
    const topFive = bestTickers.slice(0, 5);
    const snapshots: Snapshot[] = topFive.map(({ symbol, signals, score }) => ({
      ticker: symbol,
      score,
      indicators: Object.fromEntries(
        signals.map((s) => [s.indicator, s.signal])
      ) as Record<string, 'buy' | 'sell' | 'hold'>,
    }));

    // Create posts summarizing signals for the bottom 5 tickers to sell
    const bottomFive = worstTickers.slice(0, 5);
    const worstSnapshots: Snapshot[] = bottomFive.map(({ symbol, signals, score }) => ({
      ticker: symbol,
      score,
      indicators: Object.fromEntries(
        signals.map((s) => [s.indicator, s.signal])
      ) as Record<string, 'buy' | 'sell' | 'hold'>,
    }));

    const posts = formatPosts(snapshots, {
      maxBullets: 3,
      emojis: {
        header: ['🚀', '📉', '📊'],
        strength: '🟢',
        weakness: '🔴',
      },
      hashtags: [],
    });
    const worstPosts = formatPosts(worstSnapshots, {
      maxBullets: 3,
      emojis: {
        header: ['🚀', '📉', '📊'],
        strength: '🟢',
        weakness: '🔴',
      },
      hashtags: [],
    });
    console.log('\nPosts (best):', posts);
    console.log('\nPosts (worst):', worstPosts);
  } catch (err: any) {
    console.error('Error fetching market data:', err?.message || err);
    process.exitCode = 1;
  }
}

if (require.main === module) void main();
