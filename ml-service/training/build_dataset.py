"""Builds the ecosystem-classifier training set from real, published label maps.

Labels (all for 2020, matching the satellite composite year):
  - mangrove  : GWL_FCS30 class 185 (mangrove forest) AND ESA WorldCover class 95 (mangroves)
  - saltmarsh : GWL_FCS30 class 186 (salt marsh), not WorldCover mangrove
  - seagrass  : Allen Coral Atlas benthic class 14 (seagrass)
  - other     : land, permanent water, tidal/flooded flats, saline pans (GWL_FCS30) and
                sand, rubble, rock, microalgal mats, coral (Allen Coral Atlas)

Only "pure" pixels are kept (the whole 3x3 neighbourhood has the same label), so mixed
edge pixels don't teach the model wrong examples. "Other" is sampled per sub-type so the
confusing cases (mudflats, shallow sand, open water) are well represented, not just farmland.

Usage (from ml-service/):
    GEE_PROJECT=<project> .venv/bin/python -m training.build_dataset
"""

import argparse
import csv
import sys
from pathlib import Path

import ee

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.earth_engine import FEATURE_NAMES, SAMPLE_SCALE_M, build_feature_image, init_earth_engine  # noqa: E402

LABEL_YEAR_START = "2020-01-01"
LABEL_YEAR_END = "2021-01-01"

# Sampling codes -> training class. "Other" is split into sub-types only for sampling.
SAMPLE_CLASSES = {
    1: "mangrove",
    2: "saltmarsh",
    3: "seagrass",
    10: "other",  # non-wetland land
    11: "other",  # permanent water
    12: "other",  # tidal / flooded flats and saline pans
    13: "other",  # shallow sand, rubble, rock, algal mats, coral
}

# Coastal regions of India with their bounding boxes [west, south, east, north].
# (Lakshadweep was tried and dropped: it has almost no Sentinel-1 radar coverage.)
REGIONS = {
    "sundarbans": [88.5, 21.5, 89.2, 22.2],
    "bhitarkanika": [86.7, 20.5, 87.1, 20.85],
    "godavari": [82.1, 16.5, 82.4, 16.8],
    "pichavaram_cauvery": [79.7, 11.3, 79.9, 11.6],
    "chilika": [85.1, 19.45, 85.6, 19.95],
    "gulf_of_kutch": [69.0, 22.3, 70.4, 23.0],
    "rann_kutch_coast": [68.4, 23.0, 69.3, 23.7],
    "gulf_of_mannar": [78.9, 9.1, 79.5, 9.4],
    "palk_bay": [79.0, 9.25, 79.9, 10.0],
    "andaman": [92.5, 11.5, 92.9, 12.3],
}


def _pure(mask: ee.Image) -> ee.Image:
    """Keeps a pixel only if its whole 3x3 neighbourhood is in the mask."""
    return mask.unmask(0).reduceNeighborhood(ee.Reducer.min(), ee.Kernel.square(1)).eq(1)


def build_label_image() -> ee.Image:
    gwl = ee.Image("projects/sat-io/open-datasets/GWL_FCS30/GWL_FCS30_2020").select("b1").unmask(0)
    worldcover = ee.ImageCollection("ESA/WorldCover/v200").first().select("Map").unmask(0)
    benthic = ee.Image("ACA/reef_habitat/v2_0").select("benthic").unmask(0)

    not_wc_mangrove = worldcover.neq(95)
    not_seagrass = benthic.neq(14)

    masks = {
        1: gwl.eq(185).And(worldcover.eq(95)),
        2: gwl.eq(186).And(not_wc_mangrove),
        3: benthic.eq(14),
        10: gwl.eq(0).And(not_wc_mangrove).And(benthic.eq(0)),
        11: gwl.eq(180).And(not_wc_mangrove).And(not_seagrass).And(benthic.eq(0)),
        12: gwl.remap([183, 184, 187], [1, 1, 1], 0).And(not_wc_mangrove).And(not_seagrass),
        13: benthic.remap([11, 12, 13, 15, 18], [1, 1, 1, 1, 1], 0),
    }

    label = ee.Image(0)
    valid = ee.Image(0)
    for code, mask in masks.items():
        pure = _pure(mask)
        label = label.where(pure, code)
        valid = valid.Or(pure)
    return label.updateMask(valid).rename("label").toInt()


def sample_region(name: str, bbox: list[float], points_per_class: int, seed: int) -> list[dict]:
    region = ee.Geometry.Rectangle(bbox)
    features = build_feature_image(LABEL_YEAR_START, LABEL_YEAR_END, region)
    stack = features.addBands(build_label_image())

    codes = list(SAMPLE_CLASSES.keys())
    samples = stack.stratifiedSample(
        numPoints=points_per_class,
        classBand="label",
        region=region,
        scale=SAMPLE_SCALE_M,
        classValues=codes,
        classPoints=[points_per_class] * len(codes),
        seed=seed,
        geometries=True,
        tileScale=16,
    )

    rows = []
    for feature in samples.getInfo()["features"]:
        props = feature["properties"]
        lon, lat = feature["geometry"]["coordinates"]
        code = int(props["label"])
        row = {
            "region": name,
            "class_name": SAMPLE_CLASSES[code],
            "sample_code": code,
            "longitude": round(lon, 6),
            "latitude": round(lat, 6),
        }
        row.update({feature_name: props[feature_name] for feature_name in FEATURE_NAMES})
        rows.append(row)
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--points-per-class", type=int, default=250,
                        help="Max points per sampling class per region")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--regions", nargs="*", default=list(REGIONS), help="Subset of regions to sample")
    parser.add_argument("--out", default=str(Path(__file__).resolve().parent / "data" / "ecosystem_samples.csv"))
    args = parser.parse_args()

    if not init_earth_engine():
        sys.exit("Earth Engine credentials not found (keys/gee-service-account.json).")

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    columns = ["region", "class_name", "sample_code", "longitude", "latitude", *FEATURE_NAMES]

    total = 0
    with out_path.open("w", newline="", encoding="utf-8") as fp:
        writer = csv.DictWriter(fp, fieldnames=columns)
        writer.writeheader()
        for name in args.regions:
            rows = sample_region(name, REGIONS[name], args.points_per_class, args.seed)
            writer.writerows(rows)
            fp.flush()
            total += len(rows)
            counts: dict[str, int] = {}
            for row in rows:
                counts[row["class_name"]] = counts.get(row["class_name"], 0) + 1
            print(f"{name:20} {len(rows):5} samples  {counts}", flush=True)

    print(f"Wrote {total} samples to {out_path}")


if __name__ == "__main__":
    main()
