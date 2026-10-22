from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

from fastapi import FastAPI, HTTPException

from .anomaly import AnomalyDetector, AnomalyResult
from .baseline import actual_change, build_baseline
from .carbon import CarbonEstimate, CarbonModel
from .classifier import EcosystemClassifier
from .earth_engine import init_earth_engine
from .gee_service import fetch_plot_pixels, fetch_quarter_observation, resolve_window, window_quarter
from .schemas import ActualChangeRequest, BaselineRequest, CarbonOut, MlvInferRequest, MlvInferResponse

app = FastAPI(title="Blue Carbon ML Service", version="2.0.0")
classifier = EcosystemClassifier()
anomaly_detector = AnomalyDetector()
carbon_model = CarbonModel()


def _earth_engine_ready() -> bool:
    try:
        return init_earth_engine()
    except Exception as exc:  # noqa: BLE001
        print(f"Earth Engine sign-in failed: {exc}")
        return False


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "earthEngine": _earth_engine_ready(),
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


def plot_carbon(coordinates: list[list[float]], start: date, end: date, pixels: dict | None = None, explain: bool = True):
    """Classify the plot's pixels and estimate tree carbon now and in the same season a year earlier."""
    pixels = pixels if pixels is not None else fetch_plot_pixels(coordinates, start, end)
    if not pixels:
        return None, CarbonEstimate("unavailable"), CarbonEstimate("unavailable")
    longitude = sum(p[1] for p in coordinates) / len(coordinates)
    latitude = sum(p[0] for p in coordinates) / len(coordinates)
    is_mangrove = classifier.pixel_is(pixels["annual"], "mangrove")
    quarter = window_quarter(start, end)
    with_quarter = lambda rows: [{**row, "quarter": quarter} for row in rows]
    now = carbon_model.estimate(with_quarter(pixels["current"]), is_mangrove, longitude, latitude, explain=explain)
    before = carbon_model.estimate(with_quarter(pixels["previous"]), is_mangrove, longitude, latitude, explain=False)
    return pixels, now, before


def _windows(pairs: list[list[str]]) -> list[tuple[date, date]]:
    """[start, end-inclusive] strings -> [start, end) dates."""
    return [(date.fromisoformat(a), date.fromisoformat(b) + timedelta(days=1)) for a, b in pairs]


@app.post("/mrv/baseline")
def baseline(req: BaselineRequest) -> dict:
    """Day-0 baseline: synthetic control from unenrolled mangrove donors (see app/baseline.py)."""
    if not carbon_model.available:
        raise HTTPException(status_code=503, detail="Carbon model not trained")
    windows = _windows(req.preWindows)

    def plot_level(window):
        _, now, before = plot_carbon(req.coordinates, *window, explain=False)
        ok = now.status == "ok" and before.status == "ok" and now.applicable_share >= 0.5
        return {**now.co2_t_ha, "change": now.co2_t_ha["mid"] - before.co2_t_ha["mid"]} if ok else None

    with ThreadPoolExecutor(4) as pool:
        plot_quarters = list(pool.map(plot_level, windows))
    return build_baseline(carbon_model, plot_quarters, req.coordinates, windows, req.excludePolygons)


@app.post("/mrv/baseline/actual")
def baseline_actual(req: ActualChangeRequest) -> dict:
    """Month-12 check: what the baseline donors actually did in the monitoring windows."""
    if not carbon_model.available:
        raise HTTPException(status_code=503, detail="Carbon model not trained")
    return {"quarters": actual_change(carbon_model, req.donors, _windows(req.windows))}


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

    _, carbon_now, carbon_prev = plot_carbon(req.coordinates, start, end, pixels=pixels or {})

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
