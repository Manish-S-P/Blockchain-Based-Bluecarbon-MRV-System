"""Quarterly anomaly detector: did something damage the plot this quarter?

Each quarter is compared with the *same quarter one year earlier* for the same plot, so
normal seasonal and tidal swings cancel out. The year-on-year change of each signal is
turned into a score that says how unusual it is compared with healthy plots of the same
ecosystem (learned from real data in training/train_anomaly.py):

    score = direction * (change - typical change) / typical spread

Positive scores point towards damage. The signal scores are combined into one quarter score
(see COMBINE_METHODS), and the quarter is an anomaly if that is above the learned threshold.
A quarter without enough clear satellite observations is
"insufficient_data", never an anomaly, so clouds don't cause false alarms.
"""

import json
from dataclasses import dataclass, field
from pathlib import Path

from .earth_engine import (
    MIN_CLEAR_OPTICAL,
    MIN_RADAR_SCENES,
    MONITOR_SIGNALS,
    OPTICAL_SIGNALS,
)

PARAMS_PATH = Path(__file__).resolve().parent.parent / "models" / "anomaly_detector.json"

# How per-signal scores become one score: "max" lets any single signal raise the alarm,
# "mean" requires the signals to agree.
COMBINE_METHODS = ("max", "mean")


@dataclass
class AnomalyResult:
    status: str  # "normal" | "anomaly" | "insufficient_data"
    score: float | None = None
    signal_scores: dict[str, float] = field(default_factory=dict)

    @property
    def is_anomaly(self) -> bool:
        return self.status == "anomaly"


def _usable(signal: str, current: dict, previous: dict) -> bool:
    if current.get(signal) is None or previous.get(signal) is None:
        return False
    if signal in OPTICAL_SIGNALS:
        count_band, minimum = "S2_CLEAR", MIN_CLEAR_OPTICAL
    else:
        count_band, minimum = "S1_COUNT", MIN_RADAR_SCENES
    return min(current.get(count_band) or 0, previous.get(count_band) or 0) >= minimum


def signal_scores(ecosystem: str, current: dict, previous: dict, stats: dict) -> dict[str, float]:
    """Damage score per usable signal. `stats` holds each signal's typical change and spread."""
    scores = {}
    for signal, direction in MONITOR_SIGNALS[ecosystem].items():
        if not _usable(signal, current, previous):
            continue
        change = current[signal] - previous[signal]
        typical = stats[signal]
        scores[signal] = direction * (change - typical["median"]) / typical["scale"]
    return scores


def combine_scores(scores: dict[str, float], method: str) -> float:
    values = list(scores.values())
    return max(values) if method == "max" else sum(values) / len(values)


class AnomalyDetector:
    def __init__(self) -> None:
        self.params: dict = {}
        if PARAMS_PATH.exists():
            self.params = json.loads(PARAMS_PATH.read_text(encoding="utf-8"))["ecosystems"]

    @property
    def available(self) -> bool:
        return bool(self.params)

    def check(self, ecosystem: str, current: dict | None, previous: dict | None) -> AnomalyResult:
        params = self.params.get(ecosystem.lower())
        if not params or not current or not previous:
            return AnomalyResult("insufficient_data")

        scores = signal_scores(ecosystem.lower(), current, previous, params["signals"])
        if not scores:
            return AnomalyResult("insufficient_data")

        score = combine_scores(scores, params["combine"])
        status = "anomaly" if score > params["threshold"] else "normal"
        return AnomalyResult(
            status=status,
            score=round(score, 3),
            signal_scores={name: round(value, 3) for name, value in scores.items()},
        )
