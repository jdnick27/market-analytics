import { TwitterApi } from 'twitter-api-v2';

interface TickerScore {
  symbol: string;
  score: number;
}

export async function postBestTickers(tickers: TickerScore[]): Promise<void> {
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET } = process.env;

  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_SECRET) {
    console.warn('X API credentials not fully provided; skipping tweet.');
    return;
  }

  try {
    const client = new TwitterApi({
      appKey: X_API_KEY,
      appSecret: X_API_SECRET,
      accessToken: X_ACCESS_TOKEN,
      accessSecret: X_ACCESS_SECRET,
    });

    const top = tickers
      .slice(0, 5)
      .map((t) => `${t.symbol} (${t.score.toFixed(2)})`);
    const text = `Best stocks to buy: ${top.join(', ')}`;

    await client.v2.tweet(text);
    console.log('Posted best tickers to X');
  } catch (err: any) {
    console.error('Failed to post to X:', err?.message || err);
  }
}
