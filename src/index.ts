import 'dotenv/config';
import { generateSignals, IndicatorSignal } from './signals';
import { google } from 'googleapis';
import * as path from 'path';

// tiny contract:
// input: none – fetches an array of tickers from Massive API
// output: prints indicator signals for each ticker and
//         lists the top stocks to buy and top stocks to sell based on aggregated scores
//         Creates a Google Sheet with the results

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'service-account.json');

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

async function authorize() {
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth.getClient();
}

async function createOrUpdateGoogleSheet(
  title: string,
  allData: any[],
  results: any[]
): Promise<string> {
  const auth = await authorize();

  const sheets = google.sheets({ version: 'v4', auth: auth as any });
  const existingSheetId = process.env.GOOGLE_SHEET_ID;

  let spreadsheetId: string;

  // Indicator reference data
  const indicatorReference = [
    ['Indicator', 'Buy Signal', 'Sell Signal', 'Description'],
    ['RSI', 'RSI < 30', 'RSI > 70', 'Relative Strength Index - measures momentum; low values suggest oversold, high values suggest overbought'],
    ['SMA', 'Price > SMA + 0.1%', 'Price < SMA - 0.1%', 'Simple Moving Average (50-day) - trend indicator showing average price over time'],
    ['EMA', 'Price > EMA + 0.1%', 'Price < EMA - 0.1%', 'Exponential Moving Average (50-day) - weighted moving average favoring recent prices'],
    ['MACD', 'Histogram positive & rising', 'Histogram negative & falling', 'Moving Average Convergence Divergence - momentum and trend indicator'],
    ['52W', 'Within 1% of 52-week low', 'Within 1% of 52-week high', '52-Week High/Low - compares current price to yearly extremes'],
    ['Short Interest', '< 5% of float', '> 20% of float', 'Percentage of shares sold short - high values may indicate bearish sentiment'],
    ['Short Volume', 'Ratio < 0.2', 'Ratio > 0.4', 'Daily short selling volume as percentage of total volume'],
    ['Current Ratio', '> 1.5', '< 1.0', 'Current Assets / Current Liabilities - measures liquidity'],
    ['Debt/Equity', '< 1.0', '> 2.0', 'Total Debt / Shareholder Equity - measures financial leverage'],
    ['Net Margin', '> 10%', '< 0%', 'Net Income / Revenue - profitability metric'],
    ['Operating Cash Flow', '> 0', '< 0', 'Cash generated from operations - measures business health'],
    ['Net Cash Flow', '> 0', '< 0', 'Total cash flow - overall cash generation/consumption'],
    ['P/E', '< 15', '> 30 or < 0', 'Price-to-Earnings Ratio - valuation metric'],
    ['P/S', '< 1.0', '> 3.0', 'Price-to-Sales Ratio - valuation metric'],
    ['P/R', '< 1.0', '> 3.0', 'Price-to-Revenue Ratio - alternative valuation metric'],
    ['Book Value Per Share', 'Price < Book Value', 'Price > 2x Book Value', 'Net assets per share - value investing metric'],
    ['Comprehensive Income', '> 0', '< 0', 'Total change in equity - includes all income sources'],
    ['Revenue Growth (Q)', '> 5%', '< -5%', 'Quarterly revenue growth rate'],
    ['Revenue Growth (Y)', '> 5%', '< -5%', 'Yearly revenue growth rate'],
    ['Net Income Growth (Q)', '> 5%', '< -5%', 'Quarterly net income growth rate'],
    ['Net Income Growth (Y)', '> 5%', '< -5%', 'Yearly net income growth rate'],
    ['Operating Cash Flow Growth (Q)', '> 5%', '< -5%', 'Quarterly operating cash flow growth'],
    ['Operating Cash Flow Growth (Y)', '> 5%', '< -5%', 'Yearly operating cash flow growth'],
    ['Share Dilution', 'Shares decrease > 2%', 'Shares increase > 2%', 'Change in shares outstanding - buybacks vs dilution'],
    ['EPS Growth (Q)', '> 5%', '< -5%', 'Quarterly earnings per share growth'],
    ['EPS Growth (Y)', '> 5%', '< -5%', 'Yearly earnings per share growth'],
    ['Revenue Per Share Growth (Q)', '> 5%', '< -5%', 'Quarterly revenue per share growth'],
    ['Revenue Per Share Growth (Y)', '> 5%', '< -5%', 'Yearly revenue per share growth'],
    ['Book Value Per Share Growth (Q)', '> 5%', '< -5%', 'Quarterly book value per share growth'],
    ['Book Value Per Share Growth (Y)', '> 5%', '< -5%', 'Yearly book value per share growth'],
  ];

  if (existingSheetId) {
    // Update existing spreadsheet
    spreadsheetId = existingSheetId;
    console.log(`Updating existing Google Sheet: ${spreadsheetId}`);

    // Get existing sheets
    const metadata = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = metadata.data.sheets?.map((s) => s.properties?.title) || [];

    // Create missing sheets
    const requiredSheets = ['Indicator Reference', 'All Signals'];
    const requests = [];

    for (const sheetName of requiredSheets) {
      if (!existingSheets.includes(sheetName)) {
        requests.push({
          addSheet: {
            properties: { title: sheetName },
          },
        });
      }
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });
      console.log(`Created missing sheets: ${requests.map((r) => r.addSheet.properties.title).join(', ')}`);
    }
  } else {
    // Create new spreadsheet
    const createResponse = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: [
          { properties: { title: 'Indicator Reference' } },
          { properties: { title: 'All Signals' } },
        ],
      },
    });
    spreadsheetId = createResponse.data.spreadsheetId!;
    console.log(`\nCreated new Google Sheet. To reuse this sheet, add to .env:\nGOOGLE_SHEET_ID=${spreadsheetId}`);
  }

  // Get all symbols for individual sheets
  const allSymbols = allData.map((row) => row.Symbol);

  // Get existing sheets and create any missing symbol sheets
  const metadata = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = metadata.data.sheets?.map((s) => s.properties?.title) || [];
  const allSignalsSheet = metadata.data.sheets?.find((s) => s.properties?.title === 'All Signals');
  const allSignalsSheetId = allSignalsSheet?.properties?.sheetId || 0;

  const requiredSheets = ['Indicator Reference', 'All Signals', ...allSymbols];
  const requests = [];

  for (const sheetName of requiredSheets) {
    if (!existingSheets.includes(sheetName)) {
      requests.push({
        addSheet: {
          properties: { title: sheetName },
        },
      });
    }
  }

  // Only send batchUpdate if there are sheets to create
  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
    console.log(`Created ${requests.length} missing sheets`);
  }

  // Get updated metadata with all sheet IDs
  const updatedMetadata = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetIdMap = new Map<string, number>();
  for (const sheet of updatedMetadata.data.sheets || []) {
    const title = sheet.properties?.title;
    const sheetId = sheet.properties?.sheetId;
    if (title && sheetId !== undefined && sheetId !== null) {
      sheetIdMap.set(title, sheetId);
    }
  }

  // Helper to convert JSON to 2D array
  const jsonToRows = (data: any[]) => {
    if (data.length === 0) return [];
    const headers = Object.keys(data[0]);
    const rows = data.map((row) => headers.map((h) => row[h] ?? ''));
    return [headers, ...rows];
  };

  // Helper to find and update rows in existing sheets
  const updateSheetRows = async (sheetName: string, data: any[], sheetIdMap: Map<string, number>) => {
    if (data.length === 0) return;

    // Read existing data
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:ZZ`,
    });

    const existingRows = existingData.data.values || [];
    const headers = existingRows.length > 0 ? existingRows[0] : Object.keys(data[0]);
    
    // Build a map of symbol to row index
    const symbolToRowIndex = new Map<string, number>();
    for (let i = 1; i < existingRows.length; i++) {
      // Extract symbol from hyperlink formula or plain text
      const cellValue = existingRows[i][0];
      let symbol = cellValue;
      if (typeof cellValue === 'string' && cellValue.startsWith('=HYPERLINK')) {
        const match = cellValue.match(/,\s*"([^"]+)"/);
        if (match) symbol = match[1];
      }
      if (symbol) {
        symbolToRowIndex.set(symbol, i + 1); // +1 for 1-indexed rows
      }
    }

    const updates: Array<{ range: string; values: any[][] }> = [];

    for (const item of data) {
      const symbol = item.Symbol;
      const rowData = headers.map((h: string) => {
        if (h === 'Symbol') {
          // Create hyperlink formula to the symbol's sheet using its gid
          const symbolSheetId = sheetIdMap.get(symbol);
          if (symbolSheetId !== undefined) {
            return `=HYPERLINK("#gid=${symbolSheetId}", "${symbol}")`;
          }
          return symbol;
        }
        return item[h] ?? '';
      });
      const rowIndex = symbolToRowIndex.get(symbol);

      if (rowIndex) {
        // Update existing row
        updates.push({
          range: `${sheetName}!A${rowIndex}`,
          values: [rowData],
        });
      } else {
        // Append new row
        const nextRow = existingRows.length + updates.filter(u => !symbolToRowIndex.has(u.range.split('!')[0])).length + 1;
        updates.push({
          range: `${sheetName}!A${nextRow}`,
          values: [rowData],
        });
      }
    }

    // Write headers if sheet is empty
    if (existingRows.length === 0) {
      updates.unshift({
        range: `${sheetName}!A1`,
        values: [headers],
      });
    }

    return updates;
  };

  // Build symbol-specific sheets data with all raw API data
  const symbolSheetData: Array<{ range: string; values: any[][] }> = [];
  
  for (const result of results) {
    const symbol = result.symbol;
    const score = result.score;
    const raw = result.rawData;
    
    // Extract all indicator signals for this symbol
    const row = allData.find(r => r.Symbol === symbol);
    const indicators = row ? Object.keys(row)
      .filter((key) => key !== 'Symbol' && key !== 'Score')
      .map((indicator) => ({
        Indicator: indicator,
        Signal: row[indicator] || 'hold',
      })) : [];

    const sheetData: any[][] = [
      ['Symbol', symbol],
      ['Total Score', score],
      ['Price (Close)', raw.oc?.close || 'N/A'],
      [''],
      ['INDICATOR SIGNALS'],
      ['Indicator', 'Signal'],
      ...indicators.map((ind) => [ind.Indicator, ind.Signal]),
      [''],
      ['PRICE DATA'],
      ['Open', raw.oc?.open || 'N/A'],
      ['High', raw.oc?.high || 'N/A'],
      ['Low', raw.oc?.low || 'N/A'],
      ['Close', raw.oc?.close || 'N/A'],
      ['Volume', raw.oc?.volume || 'N/A'],
      [''],
      ['TECHNICAL INDICATORS'],
      ['SMA (50-day)', raw.sma?.[0]?.value || 'N/A'],
      ['EMA (50-day)', raw.ema?.[0]?.value || 'N/A'],
      ['RSI (14-day)', raw.rsi?.[0]?.value || 'N/A'],
      ['MACD Value', raw.macd?.[0]?.value || 'N/A'],
      ['MACD Signal', raw.macd?.[0]?.signal || 'N/A'],
      ['MACD Histogram', raw.macd?.[0]?.histogram || 'N/A'],
      ['52-Week High', raw.hiLo?.high || 'N/A'],
      ['52-Week Low', raw.hiLo?.low || 'N/A'],
      [''],
      ['SHORT INTEREST'],
      ['Short Volume Ratio', raw.shortVol?.short_volume_ratio || 'N/A'],
      ['Short Interest', raw.shortInt?.short_interest || 'N/A'],
      ['Days to Cover', raw.shortInt?.days_to_cover || 'N/A'],
      [''],
      ['COMPANY INFO'],
      ['Shares Outstanding', raw.shares || 'N/A'],
    ];

    // Add quarterly financials
    if (raw.finQ && Array.isArray(raw.finQ) && raw.finQ.length > 0) {
      sheetData.push(['']);
      sheetData.push(['QUARTERLY FINANCIALS (Most Recent)']);
      const latestQ = raw.finQ[0];
      sheetData.push(['Fiscal Period', latestQ.fiscal_period || 'N/A']);
      sheetData.push(['End Date', latestQ.end_date || 'N/A']);
      if (latestQ.financials) {
        if (latestQ.financials.income_statement) {
          sheetData.push(['Revenue', latestQ.financials.income_statement.revenues?.value || 'N/A']);
          sheetData.push(['Net Income', latestQ.financials.income_statement.net_income_loss?.value || 'N/A']);
          sheetData.push(['EPS Basic', latestQ.financials.income_statement.basic_earnings_per_share?.value || 'N/A']);
        }
        if (latestQ.financials.balance_sheet) {
          sheetData.push(['Total Assets', latestQ.financials.balance_sheet.assets?.value || 'N/A']);
          sheetData.push(['Total Liabilities', latestQ.financials.balance_sheet.liabilities?.value || 'N/A']);
          sheetData.push(['Stockholders Equity', latestQ.financials.balance_sheet.equity?.value || 'N/A']);
        }
        if (latestQ.financials.cash_flow_statement) {
          sheetData.push(['Operating Cash Flow', latestQ.financials.cash_flow_statement.net_cash_flow_from_operating_activities?.value || 'N/A']);
        }
      }
    }

    // Add annual financials
    if (raw.finA && Array.isArray(raw.finA) && raw.finA.length > 0) {
      sheetData.push(['']);
      sheetData.push(['ANNUAL FINANCIALS (Most Recent)']);
      const latestA = raw.finA[0];
      sheetData.push(['Fiscal Year', latestA.fiscal_year || 'N/A']);
      sheetData.push(['End Date', latestA.end_date || 'N/A']);
      if (latestA.financials) {
        if (latestA.financials.income_statement) {
          sheetData.push(['Revenue', latestA.financials.income_statement.revenues?.value || 'N/A']);
          sheetData.push(['Net Income', latestA.financials.income_statement.net_income_loss?.value || 'N/A']);
          sheetData.push(['EPS Basic', latestA.financials.income_statement.basic_earnings_per_share?.value || 'N/A']);
        }
        if (latestA.financials.balance_sheet) {
          sheetData.push(['Total Assets', latestA.financials.balance_sheet.assets?.value || 'N/A']);
          sheetData.push(['Total Liabilities', latestA.financials.balance_sheet.liabilities?.value || 'N/A']);
          sheetData.push(['Stockholders Equity', latestA.financials.balance_sheet.equity?.value || 'N/A']);
        }
        if (latestA.financials.cash_flow_statement) {
          sheetData.push(['Operating Cash Flow', latestA.financials.cash_flow_statement.net_cash_flow_from_operating_activities?.value || 'N/A']);
        }
      }
    }

    symbolSheetData.push({
      range: `${symbol}!A1`,
      values: sheetData,
    });
  }

  // Update or append rows in main sheets
  const allSignalsUpdates = await updateSheetRows('All Signals', allData, sheetIdMap);

  // Clear symbol sheets and indicator reference (these are always overwritten)
  const rangesToClear = ['Indicator Reference!A:ZZ'];
  rangesToClear.push(...allSymbols.map((sym) => `${sym}!A:ZZ`));

  await sheets.spreadsheets.values.batchClear({
    spreadsheetId,
    requestBody: {
      ranges: rangesToClear,
    },
  });

  // Write all data
  const allUpdates = [
    { range: 'Indicator Reference!A1', values: indicatorReference },
    ...(allSignalsUpdates || []),
    ...symbolSheetData,
  ];

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED', // Changed from RAW to USER_ENTERED to process formulas
      data: allUpdates,
    },
  });

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}

async function main(): Promise<void> {
  const tickers = ['NVDA','MSFT','BCH','AMZN','TLK','KOF','AVGO','FMX','AMX','HSBC',
 'TSLA','WMT','JPM','TV','CMS','PDD','LLY','V','ORCL','HDB',
 'BP','MA','NFLX','XOM','COST','JNJ','NTES','HD','CX','PLTR',
 'PG','EC','ABBV','BAC','CHT','NGG','SAP','CVX','KO','TMUS',
 'ASML','BCS','VOD','UNH','BHP','AMD','LYG','CSCO','PM','DEO',
 'AMC', 'GME', 'HITI', 'RKLB', 'BULL', 'APLD', 'EOSE', 'UROY',
 'COIN', 'BKNG', 'SMR', 'BABA', 'IBM', 'HYMC', 'INTC',
 'CRON', 'TLRY', 'CGC', 'ACB', 'SNDL', 'CRM', 'TSM'];
  const date = previousDay();
  console.log(`Generating signals for ${tickers.join(', ')} on ${date}`);
  try {
    // Process tickers in small batches to avoid opening too many simultaneous
    // connections to the Massive API which can cause "socket hang up" errors.
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
      
      // Fetch all raw data for the symbol
      const [oc, sma, ema, macd, rsi, hiLo, shortVol, shortInt, shares, finQ, finA] = await Promise.all([
        import('./massiveClient').then(m => m.getOpenClose(symbol, date).catch(() => null)),
        import('./massiveClient').then(m => m.getSMA(symbol).catch(() => [])),
        import('./massiveClient').then(m => m.getEMA(symbol).catch(() => [])),
        import('./massiveClient').then(m => m.getMACD(symbol).catch(() => [])),
        import('./massiveClient').then(m => m.getRSI(symbol).catch(() => [])),
        import('./massiveClient').then(m => m.get52WeekHighLow(symbol, date).catch(() => null)),
        import('./massiveClient').then(m => m.getShortVolume(symbol, date).catch(() => null)),
        import('./massiveClient').then(m => m.getShortInterest(symbol).catch(() => null)),
        import('./massiveClient').then(m => m.getSharesOutstanding(symbol).catch(() => null)),
        import('./massiveClient').then(m => m.getFinancialsHistory(symbol, 'quarterly', 10).catch(() => [])),
        import('./massiveClient').then(m => m.getFinancialsHistory(symbol, 'annual', 10).catch(() => [])),
      ]);
      
      return { 
        symbol, 
        signals, 
        score,
        rawData: { oc, sma, ema, macd, rsi, hiLo, shortVol, shortInt, shares, finQ, finA }
      };
    });

    results.forEach(({ symbol, signals, score }) => {
      console.log(`\n${symbol} signals:`, signals);
      console.log(`Total score: ${score}`);
    });

    const sorted = results.slice().sort((a, b) => b.score - a.score);
    const bestTickers = sorted.filter((r) => r.score > 0);
    const worstTickers = sorted.filter((r) => r.score < 0).reverse();
    console.log('\nTop Stocks to Buy:', bestTickers.map((r) => `${r.symbol} (${r.score})`));
    console.log('Top Stocks to Sell:', worstTickers.map((r) => `${r.symbol} (${r.score})`));

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

    // Create or update Google Sheet
    const sheetUrl = await createOrUpdateGoogleSheet(
      `Market Signals ${date}`,
      buildRows(results),
      results
    );

    console.log(`\nGoogle Sheet: ${sheetUrl}`);
  } catch (err: any) {
    console.error('Error fetching market data:', err?.message || err);
    process.exitCode = 1;
  }
}

if (require.main === module) void main();
