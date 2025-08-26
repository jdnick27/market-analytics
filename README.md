# market-analytics — polygon.io example

This small example fetches market data from Polygon.io, generates indicator signals for many tickers, and prints both the top stocks to buy and the top stocks to sell.

## Signal Reference

Update this section whenever a new indicator signal is added.

### RSI
- **Buy:** RSI < 30
- **Sell:** RSI > 70

### Simple Moving Average (SMA)
- **Buy:** price is more than 0.1% above the SMA
- **Sell:** price is more than 0.1% below the SMA

### 52-Week High/Low
- **Buy:** price is within 1% of the 52-week low
- **Sell:** price is within 1% of the 52-week high

### Short Interest
- If short interest percent is available:
  - **Buy:** short interest < 5% of float
  - **Sell:** short interest > 20% of float
- Otherwise, using days to cover:
  - **Buy:** days to cover < 1
  - **Sell:** days to cover > 5

### Short Volume
- **Buy:** short volume ratio < 0.2
- **Sell:** short volume ratio > 0.4

### Exponential Moving Average (EMA)
- **Buy:** price is more than 0.1% above the EMA
- **Sell:** price is more than 0.1% below the EMA

### MACD
- **Buy:** histogram and MACD–signal are positive, MACD or histogram crosses above zero, or histogram rises from a recent low while MACD approaches a bullish cross
- **Sell:** histogram and MACD–signal are negative or MACD/histogram cross below zero

### Current Ratio
- **Buy:** current ratio > 1.5
- **Sell:** current ratio < 1.0

### Debt/Equity
- **Buy:** debt/equity < 1
- **Sell:** debt/equity > 2

### Net Margin
- **Buy:** net margin > 10%
- **Sell:** net margin < 0%

### Operating Cash Flow
- **Buy:** operating cash flow > 0
- **Sell:** operating cash flow < 0

### Net Cash Flow
- **Buy:** net cash flow > 0
- **Sell:** net cash flow < 0

### Price/Earnings
- **Buy:** P/E < 15
- **Sell:** P/E > 30 or P/E < 0

### Price/Sales
- **Buy:** P/S < 1
- **Sell:** P/S > 3

### Price/Revenue
- **Buy:** P/R < 1
- **Sell:** P/R > 3

### Book Value Per Share
- **Buy:** price < book value per share
- **Sell:** book value per share ≤ 0 or price > 2× book value per share

### Comprehensive Income
- **Buy:** comprehensive income > 0
- **Sell:** comprehensive income < 0

### Revenue Growth (Q)
- **Buy:** quarterly revenue growth > 5%
- **Sell:** quarterly revenue growth < -5%

### Revenue Growth (Y)
- **Buy:** yearly revenue growth > 5%
- **Sell:** yearly revenue growth < -5%

### Net Income Growth (Q)
- **Buy:** quarterly net income growth > 5%
- **Sell:** quarterly net income growth < -5%

### Net Income Growth (Y)
- **Buy:** yearly net income growth > 5%
- **Sell:** yearly net income growth < -5%

### Operating Cash Flow Growth (Q)
- **Buy:** quarterly operating cash flow growth > 5%
- **Sell:** quarterly operating cash flow growth < -5%

### Operating Cash Flow Growth (Y)
- **Buy:** yearly operating cash flow growth > 5%
- **Sell:** yearly operating cash flow growth < -5%

### Share Dilution
- **Buy:** shares outstanding decrease by more than 2% without large single-period drops
- **Sell:** shares outstanding increase by more than 2% or show consistent increases

### EPS Growth (Q)
- **Buy:** quarterly EPS growth > 5%
- **Sell:** quarterly EPS growth < -5%

### EPS Growth (Y)
- **Buy:** yearly EPS growth > 5%
- **Sell:** yearly EPS growth < -5%

### Revenue Per Share Growth (Q)
- **Buy:** quarterly revenue per share growth > 5%
- **Sell:** quarterly revenue per share growth < -5%

### Revenue Per Share Growth (Y)
- **Buy:** yearly revenue per share growth > 5%
- **Sell:** yearly revenue per share growth < -5%

### Book Value Per Share Growth (Q)
- **Buy:** quarterly book value per share growth > 5%
- **Sell:** quarterly book value per share growth < -5%

### Book Value Per Share Growth (Y)
- **Buy:** yearly book value per share growth > 5%
- **Sell:** yearly book value per share growth < -5%

## Setup

1. Copy `.env` and add your Polygon API key:

   POLYGON_API_KEY=your_real_key_here

2. Install dependencies:

```bash
npm install
```

## Run

```bash
# analyzes a predefined list of tickers and prints top stocks to buy and top stocks to sell
npm test
```

## Testing

```bash
# requires POLYGON_API_KEY in your environment or .env file
npm test
```

## Notes

- Update the *Signal Reference* section when adding a new signal.
- The `.env` file is ignored by `.gitignore`.
- The code uses `axios` and `dotenv`.
