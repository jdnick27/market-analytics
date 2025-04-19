import pandas as pd

class SignalManager:
    def __init__(self):
        self.signals = pd.DataFrame()

    def add_signal(self, name: str, signal_data: pd.Series):
        self.signals[name] = signal_data

    def calculate_composite_signal(self, weights: dict):
        self.signals['Composite_Signal'] = sum(
            self.signals[col] * weight for col, weight in weights.items()
        )
        return self.signals

    def add_new_indicator(self, indicator_class, data: pd.DataFrame, **kwargs):
        indicator = indicator_class(**kwargs)
        return indicator.calculate(data)
