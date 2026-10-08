from dataclasses import dataclass

import numpy as np

from .classifier import Classification


@dataclass
class MlvOutput:
    ndvi: float | None
    ecosystem_matches_claim: bool
    identified_ecosystem: str
    ecosystem_confidence: float
    anomaly_detected: bool
    health_status: str
    estimated_co2_tonnes: float
    source: str


class ModelManager:
    """Placeholder carbon estimate. Anomalies come from app/anomaly.py."""

    def _evaluate_ecosystem_health(self, ndvi_history):
        if len(ndvi_history) < 2:
            return "insufficient_data"

        trend = ndvi_history[-1] - ndvi_history[0]
        if min(ndvi_history) < 0.25:
            return "degraded"
        if float(np.std(ndvi_history)) > 0.3:
            return "unstable"
        if trend < -0.15:
            return "declining"
        return "healthy"

    def infer(
        self,
        vegetation_type: str,
        area: float,
        previous_ndvis: list[float],
        ndvi: float | None,
        classification: Classification,
        anomaly_detected: bool,
        source: str = "gee",
    ) -> MlvOutput:
        observed_ndvi = ndvi
        # A fully cloudy quarter has no NDVI; carry the last known value for the estimate.
        if ndvi is None:
            ndvi = previous_ndvis[-1] if previous_ndvis else 0.0
        ndvi = float(np.clip(ndvi, -1.0, 1.0))
        predicted_veg = classification.identified_ecosystem
        confidence = classification.confidence
        ecosystem_matches = predicted_veg == vegetation_type.lower()

        ndvi_history = previous_ndvis + [ndvi]
        initial_ndvi = ndvi_history[0]
        health_status = self._evaluate_ecosystem_health(ndvi_history)

        
        # CARBON MODEL (Density-based annual sequestration rate in tonnes CO2/ha/yr)
        
        carbon_fraction = 1.0

        biomass_map = {
            "mangrove": 1.35,
            "seagrass": 1.10,
            "saltmarsh": 0.95
        }

        biomass = biomass_map.get(predicted_veg, 0.5)

        ndvi_factor = 0.5 + (ndvi * 0.5)
        confidence_factor = max(confidence, 0.7)

        base_co2 = (
            area *
            biomass *
            carbon_fraction *
            ndvi_factor *
            confidence_factor
        )

        baseline_ndvi_map = {
            "mangrove": 0.35,
            "seagrass": 0.30,
            "saltmarsh": 0.30
        }

        if initial_ndvi >= 0.6:
            baseline_ndvi = initial_ndvi
        else:
            baseline_ndvi = baseline_ndvi_map.get(predicted_veg, 0.3)

        baseline_co2 = (
            area *
            biomass *
            carbon_fraction *
            baseline_ndvi *
            0.4
        )

        additional_co2 = max(0.0, base_co2 - baseline_co2)

        if health_status == "healthy":
            credit_factor = 1.0
        elif health_status == "unstable":
            credit_factor = 0.6
        elif health_status == "declining":
            credit_factor = 0.3
        elif health_status == "degraded":
            credit_factor = 0.2
        elif health_status == "insufficient_data":
            credit_factor = 0.5
        else:
            credit_factor = 0.0

        estimated_co2 = additional_co2 * credit_factor

        if not ecosystem_matches:
            if predicted_veg.lower() == "other" and ndvi > 0.25:
               
                estimated_co2 *= 0.2
            else:
                
                estimated_co2 = 0.0

        
        if anomaly_detected:
            estimated_co2 = 0.0

        
        
        if estimated_co2 == 0.0 and ecosystem_matches and not anomaly_detected:
           
            estimated_co2 = area * biomass * 0.2

        estimated_co2 = min(estimated_co2, area * 5.0)

        return MlvOutput(
            ndvi=None if observed_ndvi is None else round(ndvi, 4),
            ecosystem_matches_claim=ecosystem_matches,
            identified_ecosystem=predicted_veg,
            ecosystem_confidence=round(float(confidence), 4),
            anomaly_detected=anomaly_detected,
            health_status=health_status,
            estimated_co2_tonnes=round(float(estimated_co2), 4),
            source=source,
        )