# market-analytics — polygon.io example

This small example shows how to fetch stock data from Polygon.io, generate indicator signals, and post the best tickers to X (Twitter).

Setup

1. Copy `.env.example` to `.env` and add the required values:

   ```
   POLYGON_API_KEY=your_polygon_api_key_here
   X_API_KEY=your_x_api_key_here
   X_API_SECRET=your_x_api_secret_here
   X_ACCESS_TOKEN=your_x_access_token_here
   X_ACCESS_SECRET=your_x_access_secret_here
   ```

2. Install dependencies:

```bash
npm install
```

Run

```bash
# default runs analysis and posts top tickers to X
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
