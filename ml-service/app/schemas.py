from pydantic import BaseModel, Field


class PreviousCycle(BaseModel):
    cycleNumber: int
    ndvi: float
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


class MlvInferResponse(BaseModel):
    ndvi: float
    ecosystemMatchesClaim: bool
    identifiedEcosystem: str
    ecosystemConfidence: float
    anomalyDetected: bool
    estimatedCo2Tonnes: float
    source: str
    windowStart: str | None = None
    windowEnd: str | None = None
    geeImageCount: int = 0
