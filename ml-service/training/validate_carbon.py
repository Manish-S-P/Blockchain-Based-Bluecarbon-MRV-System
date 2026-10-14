"""Independent check of the carbon model against data it was NOT trained on.

For each mangrove region, random mangrove pixels are run through the full carbon chain
(Sentinel features for Jan-Mar 2021 -> canopy height model -> Simard 2019 allometry ->
IPCC factors) and compared with:
  - TanDEM-X mangrove canopy height (2015, radar; Simard et al.)
  - Simard et al. 2019 mangrove above-ground biomass map (nominal 2000, SRTM-based)
  - ESA CCI Biomass v6 (2020, generic forest model)
  - published field plot means where available (see FIELD_REFERENCES)

Usage (from ml-service/, after train_height.py):
    GEE_PROJECT=<project> .venv/bin/python -m training.validate_carbon
"""

import json
import sys
from pathlib import Path

import ee
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.carbon import CarbonModel, height_to_agb  # noqa: E402
from app.earth_engine import HEIGHT_IMAGE_FEATURES, build_height_feature_image, init_earth_engine  # noqa: E402
from training.build_height_dataset import MANGROVE_REGIONS, mangrove_mask  # noqa: E402

WINDOW = ("2021-01-01", "2021-04-01")
SIMARD_AGB = "projects/sat-io/open-datasets/global_mangrove_distribution/agb"
TANDEMX_HEIGHT = "projects/sat-io/open-datasets/GLOBAL_MANGROVE_HT_TANDEMX"
ESA_CCI = "ESA/CCI/Above_Ground_Biomass/V6_0"

# Published field measurements (above-ground biomass, t/ha). Plot means in mature stands,
# so they are expected to exceed region-wide medians that include young and fringe stands.
FIELD_REFERENCES = {
    "bhitarkanika": {"agb_t_ha": 318.79, "sd": 44.42,
                     "source": "Bhitarkanika stand biomass study (AGB 318.79 +/- 44.42 t/ha); "
                               "https://ouci.dntb.gov.ua/en/works/4N6e2be4/"},
}


def main() -> None:
    if not init_earth_engine():
        sys.exit("Earth Engine credentials not found.")
    model = CarbonModel()
    if not model.available:
        sys.exit("Train the canopy height model first (training.train_height).")

    references = ee.Image.cat([
        ee.ImageCollection(TANDEMX_HEIGHT).mosaic().select(0).rename("tdx_height"),
        ee.ImageCollection(SIMARD_AGB).mosaic().select(0).rename("simard_agb"),
        ee.ImageCollection(ESA_CCI).filterDate("2020-01-01", "2021-01-01").first().select("agb").rename("cci_agb"),
    ])

    rows = []
    for name, bbox in MANGROVE_REGIONS.items():
        region = ee.Geometry.Rectangle(bbox)
        stack = (build_height_feature_image(*WINDOW, region).addBands(references)
                 .addBands(ee.Image(1).rename("cls").toInt()).updateMask(mangrove_mask()))
        samples = stack.stratifiedSample(numPoints=300, classBand="cls", region=region, scale=30, seed=3,
                                         tileScale=16, dropNulls=False).getInfo()["features"]
        data = pd.DataFrame([f["properties"] for f in samples])
        data = data.dropna(subset=HEIGHT_IMAGE_FEATURES)
        if data.empty:
            print(f"{name:22} no clear pixels in {WINDOW}")
            continue
        X = data[HEIGHT_IMAGE_FEATURES].assign(quarter=1)[model.features].to_numpy(np.float32)
        height = model.bundle["model"].predict_quantiles(X)[:, 1]
        agb = height_to_agb(height)
        med = lambda col: round(float(data[col].dropna().median()), 1) if col in data and data[col].notna().any() else None
        rows.append({
            "region": name,
            "pixels": len(data),
            "our_height_m": round(float(np.median(height)), 1),
            "tandemx_height_m": med("tdx_height"),
            "our_agb_t_ha": round(float(np.median(agb)), 1),
            "our_agb_p90_t_ha": round(float(np.percentile(agb, 90)), 1),
            "simard_agb_t_ha": med("simard_agb"),
            "esa_cci_agb_t_ha": med("cci_agb"),
            "field_agb_t_ha": FIELD_REFERENCES.get(name, {}).get("agb_t_ha"),
        })
        print(rows[-1], flush=True)

    table = pd.DataFrame(rows)
    report_lines = [
        "CARBON MODEL - INDEPENDENT COMPARISON (medians over mangrove pixels, Jan-Mar 2021)",
        "=" * 78,
        table.to_string(index=False),
        "",
        "Field references:",
        *[f"  {name}: {ref['source']}" for name, ref in FIELD_REFERENCES.items()],
    ]
    report = "\n".join(report_lines)
    print("\n" + report)
    out = Path(__file__).resolve().parent.parent / "models" / "carbon_validation_report.txt"
    out.write_text(report + "\n", encoding="utf-8")
    (out.with_suffix(".json")).write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print(f"\nSaved {out}")


if __name__ == "__main__":
    main()
