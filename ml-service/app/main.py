from fastapi import FastAPI, HTTPException

from .gee_service import fetch_ndvi_from_gee
from .model_manager import ModelManager
from .schemas import MlvInferRequest, MlvInferResponse

app = FastAPI(title="Blue Carbon ML Service", version="1.0.0")
manager = ModelManager()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/mrv/infer", response_model=MlvInferResponse)
def infer(req: MlvInferRequest) -> MlvInferResponse:
    previous_ndvis = [cycle.ndvi for cycle in req.previousCycles]
    observed = fetch_ndvi_from_gee(
        req.coordinates,
        start_date=req.startDate,
        end_date=req.endDate,
    )
    observed_ndvi = observed["ndvi"] if observed else None
    if req.strictRealData and observed_ndvi is None:
        raise HTTPException(status_code=503, detail="Strict real-data mode enabled and GEE NDVI unavailable")

    result = manager.infer(
        vegetation_type=req.vegetationType,
        area=req.area,
        coordinates=req.coordinates,
        previous_ndvis=previous_ndvis,
        ndvi_override=observed_ndvi,
    )
    return MlvInferResponse(
        ndvi=result.ndvi,
        ecosystemMatchesClaim=result.ecosystem_matches_claim,
        identifiedEcosystem=result.identified_ecosystem,
        ecosystemConfidence=result.ecosystem_confidence,
        anomalyDetected=result.anomaly_detected,
        estimatedCo2Tonnes=result.estimated_co2_tonnes,
        source=result.source,
        windowStart=observed["windowStart"] if observed else req.startDate,
        windowEnd=observed["windowEnd"] if observed else req.endDate,
        geeImageCount=observed["geeImageCount"] if observed else 0,
    )
