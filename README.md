# market-analytics — polygon.io example

This small example fetches market data from Polygon.io, generates indicator signals for many tickers, and prints both the best tickers to buy and the worst tickers to sell.

Setup

1. Copy `.env` and add your Polygon API key:

   POLYGON_API_KEY=your_real_key_here

2. Install dependencies:

```bash
npm install
```

Run

```bash
# analyzes a predefined list of tickers and prints best and worst picks
npm test
```

Testing

```bash
# requires POLYGON_API_KEY in your environment or .env file
npm test
```

Notes

- The `.env` file is ignored by `.gitignore`.
- The code uses `axios` and `dotenv`.
