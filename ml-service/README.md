# ML Service (FastAPI)

This service provides `POST /mrv/infer` used by backend MRV quarterly runs.

## Setup

```bash
cd ml-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## GEE credentials

Set environment variable before running:

```bash
export GEE_PROJECT="river-carrier-398207"
export GEE_SERVICE_ACCOUNT_JSON_PATH="ml-service/keys/gee-service-account.json"
```

If GEE auth or API access fails, the service falls back to synthetic NDVI so development can continue.

## Endpoint contract

- `POST /mrv/infer`
- Request:
  - `plotId: string`
  - `coordinates: number[][]`
  - `vegetationType: "mangrove" | "seagrass" | "saltmarsh"`
  - `area: number`
  - `previousCycles: [{ cycleNumber, ndvi, anomalyDetected? }]`
- Response:
  - `ndvi: number`
  - `ecosystemMatchesClaim: boolean`
  - `anomalyDetected: boolean`
  - `estimatedCo2Tonnes: number`
  - `source: "fastapi-ml-service"`

## Notes

- Random Forest / Isolation Forest / regression are trained on synthetic data for demonstration.
- NDVI is fetched from Google Earth Engine (Sentinel-2, last 90 days) when service account auth works.
