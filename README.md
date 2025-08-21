# market-analytics — polygon.io example

This small example shows how to fetch the last trade for a stock using Polygon.io and print it to the console.

Setup

1. Copy `.env` and add your Polygon API key:

   POLYGON_API_KEY=your_real_key_here

2. Install dependencies:

```bash
npm install
```

Run

```bash
# default uses AAPL
npm start

# or pass a symbol
node src/index.js TSLA
```

Notes

- The `.env` file is ignored by `.gitignore`.
- The code uses `axios` and `dotenv`.
