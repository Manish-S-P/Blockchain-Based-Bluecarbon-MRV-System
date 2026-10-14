"""Builds the canopy-height training set: GEDI laser heights over South Asian mangroves,
each paired with Sentinel features from the same quarter.

Label: GEDI L2A RH98 (height in metres below which 98% of the returned laser energy lies,
i.e. top-of-canopy height), from LARSE/GEDI/GEDI02_A_002_MONTHLY. Only shots with
quality_flag = 1, degrade_flag = 0 and sensitivity >= 0.95 are used.

Mangrove mask: Global Mangrove Watch v4 (2020) AND ESA WorldCover class 95 (mangroves),
the same definition the ecosystem classifier was trained on.

Usage (from ml-service/):
    GEE_PROJECT=<project> .venv/bin/python -m training.build_height_dataset
"""

import argparse
import csv
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import ee

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.earth_engine import (  # noqa: E402
    HEIGHT_IMAGE_FEATURES,
    HEIGHT_SCALE_M,
    build_height_feature_image,
    init_earth_engine,
)
from training.build_dataset import REGIONS  # noqa: E402
from training.validate_plots import HELD_OUT_REGIONS  # noqa: E402

GEDI_L2A = "LARSE/GEDI/GEDI02_A_002_MONTHLY"
GMW_2020 = "projects/sat-io/open-datasets/GMW/annual-extent/GMW_MNG_2020"
MIN_SENSITIVITY = 0.95
MAX_HEIGHT_M = 60

# Regions with mangroves (Chilika has none in the label maps).
MANGROVE_REGIONS = {name: bbox for name, bbox in {**REGIONS, **HELD_OUT_REGIONS}.items() if name != "chilika"}

# GEDI was in storage between March 2023 and April 2024.
QUARTERS = [
    (year, q) for year in range(2019, 2026) for q in range(1, 5)
    if (2019, 2) <= (year, q) <= (2025, 2) and not ((2023, 2) <= (year, q) <= (2024, 1))
]


def quarter_window(year: int, quarter: int) -> tuple[str, str]:
    start_month = 3 * (quarter - 1) + 1
    end_year, end_month = (year + 1, 1) if quarter == 4 else (year, start_month + 3)
    return f"{year}-{start_month:02d}-01", f"{end_year}-{end_month:02d}-01"


def mangrove_mask() -> ee.Image:
    gmw = ee.ImageCollection(GMW_2020).mosaic().mask().reduce(ee.Reducer.max()).gt(0)
    worldcover = ee.ImageCollection("ESA/WorldCover/v200").first().select("Map").eq(95)
    return gmw.And(worldcover)


def gedi_heights(start: str, end: str, region: ee.Geometry) -> ee.Image:
    def keep_good(image):
        good = (
            image.select("quality_flag").eq(1)
            .And(image.select("degrade_flag").eq(0))
            .And(image.select("sensitivity").gte(MIN_SENSITIVITY))
            .And(image.select("rh98").gt(0))
            .And(image.select("rh98").lt(MAX_HEIGHT_M))
        )
        return image.select("rh98").updateMask(good)

    return ee.ImageCollection(GEDI_L2A).filterBounds(region).filterDate(start, end).map(keep_good).median()


def sample(region_name: str, bbox: list[float], year: int, quarter: int, points: int, seed: int) -> list[dict]:
    region = ee.Geometry.Rectangle(bbox)
    start, end = quarter_window(year, quarter)
    height = gedi_heights(start, end, region)
    valid = height.mask().And(mangrove_mask())
    # Pick quality GEDI shots inside mangroves first (cheap), then compute the Sentinel
    # features only at those points.
    shots = (
        height.rename("rh98").addBands(ee.Image(1).rename("cls").toInt()).updateMask(valid)
        .stratifiedSample(numPoints=points, classBand="cls", region=region, scale=HEIGHT_SCALE_M,
                          seed=seed, geometries=True, tileScale=16, dropNulls=True)
    )
    features = (
        build_height_feature_image(start, end, region)
        .sampleRegions(collection=shots, properties=["rh98"], scale=HEIGHT_SCALE_M, tileScale=16, geometries=True)
        .getInfo()["features"]
    )

    rows = []
    for feature in features:
        props = feature["properties"]
        lon, lat = feature["geometry"]["coordinates"]
        row = {"region": region_name, "year": year, "quarter": quarter, "longitude": round(lon, 6), "latitude": round(lat, 6),
               "rh98": props["rh98"]}
        row.update({name: props[name] for name in HEIGHT_IMAGE_FEATURES})
        rows.append(row)
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--points", type=int, default=80, help="Max GEDI shots per region per quarter")
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--out", default=str(Path(__file__).resolve().parent / "data" / "height_samples.csv"))
    args = parser.parse_args()

    if not init_earth_engine():
        sys.exit("Earth Engine credentials not found.")

    jobs = [(name, bbox, year, q) for name, bbox in MANGROVE_REGIONS.items() for year, q in QUARTERS]
    print(f"{len(jobs)} region-quarters to sample", flush=True)

    columns = ["region", "year", "quarter", "longitude", "latitude", "rh98", *HEIGHT_IMAGE_FEATURES]
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    total, failed = 0, []
    with out_path.open("w", newline="", encoding="utf-8") as fp, ThreadPoolExecutor(args.workers) as pool:
        writer = csv.DictWriter(fp, fieldnames=columns)
        writer.writeheader()
        futures = {pool.submit(sample, name, bbox, year, q, args.points, args.seed): (name, year, q)
                   for name, bbox, year, q in jobs}
        for done, future in enumerate(as_completed(futures), start=1):
            name, year, q = futures[future]
            try:
                rows = future.result()
            except Exception as exc:  # noqa: BLE001
                failed.append((name, year, q, str(exc)[:120]))
                continue
            writer.writerows(rows)
            fp.flush()
            total += len(rows)
            if done % 20 == 0:
                print(f"{done}/{len(jobs)} done, {total} samples", flush=True)

    print(f"Wrote {total} samples to {out_path}")
    for item in failed:
        print("FAILED", *item)


if __name__ == "__main__":
    main()
