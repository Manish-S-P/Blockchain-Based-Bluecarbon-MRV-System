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

If GEE auth or API access fails and `strictRealData` is false, the service falls back to
placeholder features and labels the result `source: "default-features"`.

## Ecosystem classifier

The classifier decides what a plot really is (mangrove, saltmarsh, seagrass or other) from
real satellite data, before comparing it with the farmer's claim.

**Features** (`app/earth_engine.py`, 12-month composite, 30 m pixels): Sentinel-2 bands
B2-B12, NDVI, NDWI, MNDWI, EVI, NDMI, Sentinel-1 VV/VH radar, and NASADEM elevation.

**Labels** (2020): GWL_FCS30 wetland map + ESA WorldCover (mangrove, saltmarsh, flats, water,
land) and the Allen Coral Atlas (seagrass, sand, rubble, rock). Only pure 3x3 pixels are used.
Samples come from 11 coastal regions of India.

**Decision for a plot**: every pixel in the polygon is classified and the probabilities are
averaged. The plot is accepted only if the top class matches the claim with confidence >= 0.7;
otherwise it is rejected with a reason. There is no manual review step.

**Known limitation**: in leave-one-region-out testing, mangrove and "other" are recognised
reliably in new regions, but seagrass (underwater, so water clarity varies by region) and
saltmarsh are not. Many genuine seagrass/saltmarsh plots in new regions will be rejected.

Rebuild the dataset and retrain:

```bash
export GEE_PROJECT=<your-project>
.venv/bin/python -m training.build_dataset      # writes training/data/ecosystem_samples.csv
.venv/bin/python -m training.train_classifier   # writes models/ecosystem_classifier.*
```

The trainer evaluates with leave-one-region-out validation (each region is tested by a model
that never saw it) and writes the report to `models/ecosystem_classifier_report.txt`.

## Anomaly detector

Checks every quarter whether something damaged the plot (cutting, clearing, dieback).

1. **Same season, one year apart**: the quarter is compared with the same window a year
   earlier, so seasonal and tidal swings cancel out.
2. **Signals per ecosystem**: mangrove -> NDVI + Sentinel-1 VH radar; saltmarsh -> NDVI +
   NDMI (moisture); seagrass -> blue/green reflectance (bare sand is brighter than seagrass).
3. **Learned "normal"**: for healthy plots of each ecosystem, the typical year-on-year change
   and its spread are learned from real data; a change far outside that in the damage
   direction is an anomaly. The threshold is set so ~5% of healthy plots are flagged per year.
4. **Data quality first**: a signal is only used if both windows had at least 2 clear
   observations. A quarter with no usable signal is `insufficient_data`, never an anomaly.

Any anomaly in the year blocks minting; at least 2 of the 4 quarters must have usable data.

```bash
.venv/bin/python -m training.train_anomaly   # writes models/anomaly_detector.json + report
```

It is evaluated on real 2021 mangrove loss from Global Forest Watch (Myanmar, Indonesia) and on
healthy plots in held-out regions; see `models/anomaly_detector_report.txt`.

## Endpoint contract

- `POST /mrv/infer`
- Request:
  - `plotId: string`
  - `coordinates: number[][]` (`[lat, lon]` pairs)
  - `vegetationType: "mangrove" | "seagrass" | "saltmarsh"`
  - `area: number`
  - `previousCycles: [{ cycleNumber, ndvi, anomalyDetected? }]`
  - `startDate`, `endDate`: optional quarter window (`YYYY-MM-DD`)
  - `strictRealData: boolean`
- Response:
  - `ndvi: number | null` (null when the quarter had no clear optical image)
  - `identifiedEcosystem: string`, `ecosystemConfidence: number`, `ecosystemMatchesClaim: boolean`
  - `classificationDecision: "accept" | "reject"`
  - `classProbabilities: { [class]: number }`, `classifiedPixels: number`
  - `anomalyDetected: boolean`, `anomalyStatus: "normal" | "anomaly" | "insufficient_data"`
  - `anomalyScore: number | null`, `anomalySignals: { [signal]: number }`
  - `estimatedCo2Tonnes: number`
  - `source: "gee" | "default-features"`

## Notes

- The carbon estimate (`estimatedCo2Tonnes`) is still a rule-based placeholder.
