from pydantic import BaseModel, Field


class PreviousCycle(BaseModel):
    cycleNumber: int
    ndvi: float | None = None
    anomalyDetected: bool | None = None


class MlvInferRequest(BaseModel):
    plotId: str
    coordinates: list[list[float]] = Field(default_factory=list)
    vegetationType: str
    area: float = Field(gt=0)
    previousCycles: list[PreviousCycle] = Field(default_factory=list)
    startDate: str | None = None
    endDate: str | None = None
    strictRealData: bool = False


class CarbonOut(BaseModel):
    """Tree carbon for the plot (t CO2 per hectare), with a 90% range."""
    status: str  # "ok" | "insufficient_data" | "unavailable"
    treeCo2: dict[str, float] = Field(default_factory=dict)       # low / mid / high
    treeCo2Above: float = 0.0
    treeCo2Below: float = 0.0
    canopyHeight: dict[str, float] = Field(default_factory=dict)  # metres
    biomass: dict[str, float] = Field(default_factory=dict)       # t dry matter / ha
    mangroveCover: float = 0.0
    applicableShare: float = 0.0
    climateZone: str = ""
    pixels: int = 0
    explanation: list[dict] = Field(default_factory=list)


class MlvInferResponse(BaseModel):
    ndvi: float | None
    ecosystemMatchesClaim: bool
    identifiedEcosystem: str
    ecosystemConfidence: float
    classificationDecision: str  # "accept" | "reject"
    classProbabilities: dict[str, float] = Field(default_factory=dict)
    classifiedPixels: int = 0
    anomalyDetected: bool
    anomalyStatus: str  # "normal" | "anomaly" | "insufficient_data"
    anomalyScore: float | None = None
    anomalySignals: dict[str, float] = Field(default_factory=dict)
    carbon: CarbonOut
    carbonPreviousYear: CarbonOut
    estimatedCo2Tonnes: float
    source: str
    windowStart: str | None = None
    windowEnd: str | None = None
    geeImageCount: int = 0
