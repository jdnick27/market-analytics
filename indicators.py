import pandas as pd

class MACD:
    def __init__(self, short_window=12, long_window=26, signal_window=9):
        self.short_window = short_window
        self.long_window = long_window
        self.signal_window = signal_window

    def calculate(self, data: pd.DataFrame, column: str = 'Close'):
        data['EMA_short'] = data[column].ewm(span=self.short_window, adjust=False).mean()
        data['EMA_long'] = data[column].ewm(span=self.long_window, adjust=False).mean()
        data['MACD'] = data['EMA_short'] - data['EMA_long']
        data['Signal_Line'] = data['MACD'].ewm(span=self.signal_window, adjust=False).mean()
        data['MACD_Signal'] = (data['MACD'] > data['Signal_Line']).astype(int)
        return data

class RSI:
    def __init__(self, period=14):
        self.period = period

    def calculate(self, data: pd.DataFrame, column: str = 'Close'):
        delta = data[column].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=self.period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=self.period).mean()
        rs = gain / loss
        data['RSI'] = 100 - (100 / (1 + rs))
        data['RSI_Signal'] = ((data['RSI'] > 70) | (data['RSI'] < 30)).astype(int)
        return data

class VolumeIndicator:
    def __init__(self, threshold=1.5):
        self.threshold = threshold

    def calculate(self, data: pd.DataFrame, column: str = 'Volume'):
        data['Volume_Signal'] = (data[column] > data[column].rolling(window=20).mean() * self.threshold).astype(int)
        return data
