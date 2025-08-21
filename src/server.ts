import express from 'express';
import path from 'path';
import { getDailyAggregates } from './polygonClient';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '..', 'public')));

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

app.get('/api/historical', async (req, res) => {
  const ticker = String(req.query.ticker || '').toUpperCase();
  if (!ticker) return res.status(400).json({ error: 'ticker query param required' });
  try {
    const to = new Date();
    const from = new Date();
    from.setFullYear(to.getFullYear() - 5);
    const data = await getDailyAggregates(ticker, formatDate(from), formatDate(to));
    const formatted = data.map((d: any) => ({ date: d.t, close: d.c }));
    res.json(formatted);
  } catch (err: any) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Error fetching data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
