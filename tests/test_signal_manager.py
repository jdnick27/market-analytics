import pandas as pd
import pytest
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from signal_manager import SignalManager

@pytest.fixture
def sample_df():
    """Simple DataFrame with binary signals."""
    return pd.DataFrame({
        'sig1': [1, 0, 1],
        'sig2': [0, 1, 0],
        'sig3': [1, 1, 0],
    })

@pytest.fixture
def manager(sample_df):
    mgr = SignalManager()
    for name in sample_df.columns:
        mgr.add_signal(name, sample_df[name])
    return mgr

def test_calculate_composite_signal(manager):
    weights = {'sig1': 0.5, 'sig2': 0.3, 'sig3': 0.2}
    result = manager.calculate_composite_signal(weights)
    expected = pd.Series([0.7, 0.5, 0.5], name='Composite_Signal')
    pd.testing.assert_series_equal(result['Composite_Signal'], expected)
