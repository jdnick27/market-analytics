import yfinance as yf
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta

# Load environment variables from .env file
load_dotenv()
api_key = os.getenv('YAHOO_FINANCE_API_KEY')

# Define an array of tickers to read data from
tickers = ['AAPL', 'GOOGL', 'MSFT']

# Fetch data for the last week for each ticker
end_date = datetime.now()
start_date = end_date - timedelta(days=7)

for ticker in tickers:
    data = yf.download(ticker, start=start_date, end=end_date)
    print(f"Data for {ticker}:")
    print(data)
    print("\n")
