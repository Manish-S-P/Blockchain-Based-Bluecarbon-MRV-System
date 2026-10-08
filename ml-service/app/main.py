from datetime import date

from fastapi import FastAPI, HTTPException

from .anomaly import AnomalyDetector, AnomalyResult
from .classifier import EcosystemClassifier
from .gee_service import fetch_plot_pixel_features, fetch_quarter_observation
from .model_manager import ModelManager
from .schemas import MlvInferRequest, MlvInferResponse

app = FastAPI(title="Blue Carbon ML Service", version="1.0.0")
manager = ModelManager()
classifier = EcosystemClassifier()
anomaly_detector = AnomalyDetector()

# Placeholder NDVI used only when GEE is unavailable and strict mode is off.
DEFAULT_NDVI = 0.45


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {"status": "ok", "classifierLoaded": classifier.available, "anomalyDetectorLoaded": anomaly_detector.available}


@app.post("/mrv/infer", response_model=MlvInferResponse)
def infer(req: MlvInferRequest) -> MlvInferResponse:
    previous_ndvis = [cycle.ndvi for cycle in req.previousCycles if cycle.ndvi is not None]
    observed = fetch_quarter_observation(
        req.coordinates,
        start_date=req.startDate,
        end_date=req.endDate,
    )

    # Classification uses the 12 months up to the end of this cycle (or today at registration).
    as_of = date.fromisoformat(req.endDate) if req.endDate else date.today()
    pixels = fetch_plot_pixel_features(req.coordinates, as_of)

    if req.strictRealData and not observed:
        raise HTTPException(status_code=503, detail="Strict real-data mode enabled and GEE data unavailable")
    if req.strictRealData and not (pixels and classifier.available):
        raise HTTPException(status_code=503, detail="Strict real-data mode enabled and ecosystem classification unavailable")
    if req.strictRealData and not anomaly_detector.available:
        raise HTTPException(status_code=503, detail="Strict real-data mode enabled and anomaly detector not trained")

    classification = classifier.classify(pixels or [], req.vegetationType)
    # Without GEE data (and strict mode off) there is nothing to compare, so no anomaly verdict.
    anomaly = (
        anomaly_detector.check(req.vegetationType, observed["current"], observed["previous"])
        if observed else AnomalyResult("insufficient_data")
    )

    result = manager.infer(
        vegetation_type=req.vegetationType,
        area=req.area,
        previous_ndvis=previous_ndvis,
        ndvi=observed["ndvi"] if observed else DEFAULT_NDVI,
        classification=classification,
        anomaly_detected=anomaly.is_anomaly,
        source="gee" if observed else "default-features",
    )
    return MlvInferResponse(
        ndvi=result.ndvi,
        ecosystemMatchesClaim=result.ecosystem_matches_claim,
        identifiedEcosystem=result.identified_ecosystem,
        ecosystemConfidence=result.ecosystem_confidence,
        classificationDecision=classification.decision,
        classProbabilities=classification.probabilities,
        classifiedPixels=classification.pixel_count,
        anomalyDetected=result.anomaly_detected,
        anomalyStatus=anomaly.status,
        anomalyScore=anomaly.score,
        anomalySignals=anomaly.signal_scores,
        estimatedCo2Tonnes=result.estimated_co2_tonnes,
        source=result.source,
        windowStart=observed["windowStart"] if observed else req.startDate,
        windowEnd=observed["windowEnd"] if observed else req.endDate,
        geeImageCount=observed["geeImageCount"] if observed else 0,
    )
