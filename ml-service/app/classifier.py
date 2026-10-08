"""Ecosystem classifier: decides what a plot really is from its satellite pixels.

Every pixel in the plot is classified, the per-pixel probabilities are averaged, and the
plot gets the class with the highest average. Only *after* that is the farmer's claim
compared:

  accept  - the plot is classified as the claimed ecosystem with confidence >= threshold
  reject  - anything else (different ecosystem, not confident enough, or no satellite data)
"""

import json
from dataclasses import dataclass, field
from pathlib import Path

import joblib
import pandas as pd

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_PATH = MODEL_DIR / "ecosystem_classifier.joblib"
METADATA_PATH = MODEL_DIR / "ecosystem_classifier.json"

CONFIDENCE_THRESHOLD = 0.7


@dataclass
class Classification:
    identified_ecosystem: str
    confidence: float
    decision: str
    pixel_count: int
    probabilities: dict[str, float] = field(default_factory=dict)


class EcosystemClassifier:
    def __init__(self) -> None:
        self.model = None
        self.features: list[str] = []
        if MODEL_PATH.exists() and METADATA_PATH.exists():
            metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
            self.model = joblib.load(MODEL_PATH)
            self.features = metadata["features"]

    @property
    def available(self) -> bool:
        return self.model is not None

    def classify(self, pixel_rows: list[dict], claimed_ecosystem: str) -> Classification:
        if not self.available or not pixel_rows:
            return Classification("unknown", 0.0, "reject", len(pixel_rows))

        pixels = pd.DataFrame(pixel_rows, columns=self.features)
        mean_proba = self.model.predict_proba(pixels).mean(axis=0)
        best = int(mean_proba.argmax())
        identified = str(self.model.classes_[best])
        confidence = float(mean_proba[best])

        matches = identified == claimed_ecosystem.lower() and confidence >= CONFIDENCE_THRESHOLD
        decision = "accept" if matches else "reject"

        return Classification(
            identified_ecosystem=identified,
            confidence=round(confidence, 4),
            decision=decision,
            pixel_count=len(pixel_rows),
            probabilities={str(name): round(float(p), 4) for name, p in zip(self.model.classes_, mean_proba)},
        )
