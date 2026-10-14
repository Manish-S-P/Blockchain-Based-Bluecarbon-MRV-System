from datetime import timedelta

from fastapi import FastAPI, HTTPException

from .anomaly import AnomalyDetector, AnomalyResult
from .carbon import CarbonEstimate, CarbonModel
from .classifier import EcosystemClassifier
from .gee_service import fetch_plot_pixels, fetch_quarter_observation, resolve_window, window_quarter
from .schemas import CarbonOut, MlvInferRequest, MlvInferResponse

app = FastAPI(title="Blue Carbon ML Service", version="2.0.0")
classifier = EcosystemClassifier()
anomaly_detector = AnomalyDetector()
carbon_model = CarbonModel()


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "classifierLoaded": classifier.available,
        "anomalyDetectorLoaded": anomaly_detector.available,
        "carbonModelLoaded": carbon_model.available,
    }


def _carbon_out(estimate: CarbonEstimate) -> CarbonOut:
    return CarbonOut(
        status=estimate.status,
        treeCo2=estimate.co2_t_ha,
        treeCo2Above=estimate.co2_above_t_ha,
        treeCo2Below=estimate.co2_below_t_ha,
        canopyHeight=estimate.height_m,
        biomass=estimate.agb_t_ha,
        mangroveCover=estimate.mangrove_cover,
        applicableShare=estimate.applicable_share,
        climateZone=estimate.climate_zone,
        pixels=estimate.pixels,
        explanation=estimate.explanation,
    )


@app.post("/mrv/infer", response_model=MlvInferResponse)
def infer(req: MlvInferRequest) -> MlvInferResponse:
    start, end = resolve_window(req.startDate, req.endDate)
    observed = fetch_quarter_observation(req.coordinates, start_date=req.startDate, end_date=req.endDate)
    pixels = fetch_plot_pixels(req.coordinates, start, end)

    if req.strictRealData and not (observed and pixels):
        raise HTTPException(status_code=503, detail="Strict real-data mode enabled and GEE data unavailable")
    if req.strictRealData and not (classifier.available and anomaly_detector.available and carbon_model.available):
        raise HTTPException(status_code=503, detail="Strict real-data mode enabled and a model is not trained")

    annual = pixels["annual"] if pixels else []
    classification = classifier.classify(annual, req.vegetationType)
    anomaly = (
        anomaly_detector.check(req.vegetationType, observed["current"], observed["previous"])
        if observed else AnomalyResult("insufficient_data")
    )

    # Tree carbon now and in the same season one year earlier, from the same pixels.
    longitude = sum(p[1] for p in req.coordinates) / len(req.coordinates)
    latitude = sum(p[0] for p in req.coordinates) / len(req.coordinates)
    if pixels:
        is_mangrove = classifier.pixel_is(annual, "mangrove")
        quarter = window_quarter(start, end)
        with_quarter = lambda rows: [{**row, "quarter": quarter} for row in rows]
        carbon_now = carbon_model.estimate(with_quarter(pixels["current"]), is_mangrove, longitude, latitude)
        carbon_prev = carbon_model.estimate(with_quarter(pixels["previous"]), is_mangrove, longitude, latitude,
                                            explain=False)
    else:
        carbon_now = carbon_prev = CarbonEstimate("unavailable")

    ndvi = observed["ndvi"] if observed else None
    return MlvInferResponse(
        ndvi=ndvi,
        ecosystemMatchesClaim=classification.identified_ecosystem == req.vegetationType.lower(),
        identifiedEcosystem=classification.identified_ecosystem,
        ecosystemConfidence=classification.confidence,
        classificationDecision=classification.decision,
        classProbabilities=classification.probabilities,
        classifiedPixels=classification.pixel_count,
        anomalyDetected=anomaly.is_anomaly,
        anomalyStatus=anomaly.status,
        anomalyScore=anomaly.score,
        anomalySignals=anomaly.signal_scores,
        carbon=_carbon_out(carbon_now),
        carbonPreviousYear=_carbon_out(carbon_prev),
        estimatedCo2Tonnes=round(carbon_now.co2_t_ha.get("mid", 0.0) * req.area, 2),
        source="gee" if observed else "unavailable",
        windowStart=start.isoformat(),
        windowEnd=(end - timedelta(days=1)).isoformat(),
        geeImageCount=observed["geeImageCount"] if observed else 0,
    )
