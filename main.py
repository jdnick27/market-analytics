import yfinance as yf
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from indicators import MACD, RSI, VolumeIndicator
from signal_manager import SignalManager

# Load environment variables from .env file
load_dotenv()
api_key = os.getenv('YAHOO_FINANCE_API_KEY')

# Define an array of tickers to read data from
tickers = ['AAPL', 'GOOGL', 'MSFT']

def calculate_macd(data):
    """Calculate MACD, Signal Line, and Histogram."""
    short_ema = data['Close'].ewm(span=12, adjust=False).mean()
    long_ema = data['Close'].ewm(span=26, adjust=False).mean()
    macd = short_ema - long_ema
    signal = macd.ewm(span=9, adjust=False).mean()
    histogram = macd - signal
    return macd, signal, histogram

def calculate_rsi(data, period=14):
    """Calculate 14-period RSI."""
    delta = data['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def calculate_volume_signal(data, threshold=2):
    """Generate volume-based Buy/Sell signals."""
    volume_ma = data['Volume'].rolling(window=20).mean()
    volume_spike = data['Volume'] > (threshold * volume_ma)
    return volume_spike

def generate_signals(data):
    """Generate Buy/Sell signals for MACD, RSI, and Volume."""
    macd, signal, _ = calculate_macd(data)
    rsi = calculate_rsi(data)
    volume_spike = calculate_volume_signal(data)

    signals = pd.DataFrame(index=data.index)
    signals['MACD_Buy'] = (macd > signal) & (macd.shift(1) <= signal.shift(1))
    signals['MACD_Sell'] = (macd < signal) & (macd.shift(1) >= signal.shift(1))
    signals['RSI_Buy'] = rsi < 30
    signals['RSI_Sell'] = rsi > 70
    signals['Volume_Buy'] = volume_spike
    signals['Volume_Sell'] = ~volume_spike & (data['Volume'] < data['Volume'].shift(1))
    return signals

# Fetch data and calculate signals for each ticker
end_date = datetime.now()
start_date = end_date - timedelta(days=30)  # Extend timeframe for indicators

all_signals = []

for ticker in tickers:
    data = yf.download(ticker, start=start_date, end=end_date)
    if data.empty:
        print(f"No data for {ticker}")
        continue

    # Initialize indicators
    macd = MACD()
    rsi = RSI()
    volume = VolumeIndicator()

    # Calculate indicators
    data = macd.calculate(data)
    data = rsi.calculate(data)
    data = volume.calculate(data)

    # Manage signals
    manager = SignalManager()
    manager.add_signal('MACD_Signal', data['MACD_Signal'])
    manager.add_signal('RSI_Signal', data['RSI_Signal'])
    manager.add_signal('Volume_Signal', data['Volume_Signal'])

    # Calculate composite signal
    weights = {'MACD_Signal': 0.5, 'RSI_Signal': 0.3, 'Volume_Signal': 0.2}
    composite_signals = manager.calculate_composite_signal(weights)

    # Add ticker information and save results
    composite_signals['Ticker'] = ticker
    all_signals.append(composite_signals)

# Combine all signals into a single DataFrame
if all_signals:
    combined_signals = pd.concat(all_signals)
    print(combined_signals)
    # Save to CSV for further analysis
    combined_signals.to_csv('signals_output.csv', index=False)
