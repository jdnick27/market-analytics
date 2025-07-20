import pandas as pd

class SignalManager:
    def __init__(self):
        self.signals = pd.DataFrame()

    def add_signal(self, name: str, signal_data: pd.Series):
        self.signals[name] = signal_data

    def calculate_composite_signal(self, weights: dict):
        """Return DataFrame with a weighted composite signal column."""
        missing = set(weights) - set(self.signals.columns)
        if missing:
            raise KeyError(f"Missing signal columns: {', '.join(missing)}")

        weighted = self.signals[list(weights.keys())].mul(pd.Series(weights))
        result = self.signals.copy()
        result['Composite_Signal'] = weighted.sum(axis=1)
        return result

    def add_new_indicator(
        self, indicator_class, data: pd.DataFrame, signal_column: str, **kwargs
    ):
        """Calculate an indicator and store its signal column."""
        indicator = indicator_class(**kwargs)
        updated = indicator.calculate(data)

        if signal_column not in updated:
            raise KeyError(f"{signal_column} not found in indicator output")

        self.add_signal(signal_column, updated[signal_column])
        return updated
