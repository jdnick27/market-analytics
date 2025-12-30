# market-analytics — polygon.io example

This small example fetches market data from Polygon.io, generates indicator signals for many tickers, and prints both the top stocks to buy and the top stocks to sell.

## Signal Reference

### Composite Buy/Sell Signal Framework

This system combines technical, fundamental, and growth indicators into a weighted scoring model. Each individual signal contributes a bullish (+), bearish (–), or neutral (0) score. The composite is normalized and mapped to a final recommendation.

#### Weighting
- Technical indicators – 40%
- Fundamentals – 40%
- Growth metrics – 20%

### Technical Indicators (40%)
#### RSI
- **Buy (+2):** RSI < 35
- **Sell (–2):** RSI > 65

#### SMA Trend
- **Buy (+1):** Price ≥ 0.5% above SMA and slope upward
- **Sell (–1):** Price ≤ 0.5% below SMA and slope downward

#### EMA Trend
- **Buy (+1):** Price ≥ 0.5% above EMA and slope upward
- **Sell (–1):** Price ≤ 0.5% below EMA and slope downward

#### MACD
- **Buy (+2):** Bullish cross and histogram > 0
- **Sell (–2):** Bearish cross and histogram < 0

#### 52-Week High/Low
- **Buy (+1):** Within 2% of 52-week low with volume confirmation
- **Sell (–1):** Within 2% of 52-week high with momentum stalling

#### Short Interest
- If % of float available:
  - **Buy (+1):** < 10%
  - **Sell (–1):** > 25%
- Else using days-to-cover:
  - **Buy (+1):** < 2
  - **Sell (–1):** > 6

#### Short Volume Ratio
- **Buy (+1):** < 0.25
- **Sell (–1):** > 0.45

### Fundamentals (40%)
#### Current Ratio
- **Buy (+1):** > 2.0
- **Sell (–1):** < 1.0

#### Debt/Equity
- **Buy (+1):** < 0.8
- **Sell (–1):** > 2.5

#### Net Margin
- **Buy (+2):** > 12%
- **Sell (–2):** < 0%

#### Operating Cash Flow
- **Buy (+1):** OCF positive and growing ≥ 3 consecutive quarters
- **Sell (–1):** OCF negative ≥ 2 consecutive quarters

#### Net Cash Flow
- **Buy (+1):** Net CF positive
- **Sell (–1):** Net CF negative in >2 of last 4 quarters

#### PE Ratio
- **Buy (+1):** PE 8–18
- **Sell (–1):** PE > 35 or < 0

#### Price/Sales Ratio
- **Buy (+1):** P/S < 2
- **Sell (–1):** P/S > 4

#### Price/Revenue Ratio
- **Buy (+1):** P/R < 2
- **Sell (–1):** P/R > 4

#### Price/BVPS
- **Buy (+1):** Price ≤ 0.9 × BVPS
- **Sell (–1):** BVPS ≤ 0 or Price ≥ 2.5 × BVPS

#### Comprehensive Income
- **Buy (+1):** Positive ≥ 2 periods
- **Sell (–1):** Negative ≥ 2 periods

### Growth Metrics (20%)
#### Revenue Growth
- **Buy (+1):** Quarterly > 8% or Yearly > 7%
- **Sell (–1):** Quarterly < –8% or Yearly < –7%

#### Net Income Growth
- **Buy (+1):** Quarterly > 8% or Yearly > 7%
- **Sell (–1):** Quarterly < –8% or Yearly < –7%

#### Operating Cash Flow Growth
- **Buy (+1):** Quarterly > 8% or Yearly > 7%
- **Sell (–1):** Quarterly < –8% or Yearly < –7%

#### EPS Growth
- **Buy (+2):** Quarterly > 8% or Yearly > 7%
- **Sell (–2):** Quarterly < –8% or Yearly < –7%

#### Share Dilution
- **Buy (+1):** Shares decrease > 3% (excluding distress events)
- **Sell (–1):** Shares increase > 3% or show consistent dilution trend

#### Revenue/Share Growth
- **Buy (+1):** RPS growth > 8% (Q) or > 7% (Y)
- **Sell (–1):** RPS growth < –8% (Q) or < –7% (Y)

#### BVPS Growth
- **Buy (+1):** BVPS growth > 8% (Q) or > 7% (Y)
- **Sell (–1):** BVPS growth < –8% (Q) or < –7% (Y)

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
