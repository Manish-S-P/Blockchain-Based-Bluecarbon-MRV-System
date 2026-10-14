"""Earth Engine setup and the satellite feature stack shared by training and inference.

The ecosystem classifier is only valid if live plots are described by exactly the same
features it was trained on, so both `training/build_dataset.py` and the API build them
through `build_feature_image`.
"""

import json
import os
from datetime import date, timedelta
from pathlib import Path

import ee

# Order matters: the classifier is trained on columns in this order.
FEATURE_NAMES = [
    "B2", "B3", "B4", "B5", "B8", "B11", "B12",  # Sentinel-2 surface reflectance (0-1)
    "NDVI", "NDWI", "MNDWI", "EVI", "NDMI",       # spectral indices
    "VV", "VH", "VH_VV",                           # Sentinel-1 radar backscatter (dB)
    "elevation",                                   # NASADEM (m)
]

# Classification uses a full year so seasonal and tidal variation is averaged out.
COMPOSITE_DAYS = 365
SAMPLE_SCALE_M = 30

_S2_BANDS = ["B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B11", "B12"]
# Sentinel-2 scene classification values to drop: cloud shadow, clouds, cirrus, snow.
_S2_BAD_SCL = [3, 8, 9, 10, 11]

_initialized = False


def _load_service_account() -> tuple[str, str] | None:
    json_path = os.getenv("GEE_SERVICE_ACCOUNT_JSON_PATH", "")
    if not json_path:
        json_path = str(Path(__file__).resolve().parent.parent / "keys" / "gee-service-account.json")
    resolved = Path(json_path)
    if not resolved.is_absolute():
        resolved = Path.cwd() / resolved
    if not resolved.exists():
        return None

    payload = json.loads(resolved.read_text(encoding="utf-8"))
    return payload["client_email"], payload["private_key"]


def init_earth_engine() -> bool:
    """Initializes Earth Engine once per process. Returns False if credentials are missing."""
    global _initialized
    if _initialized:
        return True

    account = _load_service_account()
    if account is None:
        return False

    service_account_email, private_key = account
    credentials = ee.ServiceAccountCredentials(service_account_email, key_data=private_key)
    ee.Initialize(credentials, project=os.getenv("GEE_PROJECT"))
    _initialized = True
    return True


def annual_window(as_of: date) -> tuple[str, str]:
    """The 12-month window ending on `as_of`, as Earth Engine date strings (end exclusive)."""
    end = as_of + timedelta(days=1)
    start = end - timedelta(days=COMPOSITE_DAYS)
    return start.isoformat(), end.isoformat()


def _empty_collection(bands: list[str]) -> ee.ImageCollection:
    """A fully masked image with the given bands. Merged into a collection so the composite
    keeps its bands (as no-data) when no scene matches, instead of failing on missing bands."""
    return ee.ImageCollection([ee.Image.constant([0] * len(bands)).rename(bands).toFloat().selfMask().updateMask(0)])


def sentinel2_scenes(start: str, end: str, region: ee.Geometry) -> ee.ImageCollection:
    """Cloud-masked Sentinel-2 scenes, reflectance scaled to 0-1."""
    def mask_clouds(image):
        scl = image.select("SCL")
        clear = scl.remap(_S2_BAD_SCL, [0] * len(_S2_BAD_SCL), 1)
        return image.updateMask(clear).select(_S2_BANDS).divide(10000).toFloat()

    return (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(region)
        .filterDate(start, end)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 60))
        .map(mask_clouds)
    )


def _sentinel1_scenes(start: str, end: str, region: ee.Geometry) -> ee.ImageCollection:
    return (
        ee.ImageCollection("COPERNICUS/S1_GRD")
        .filterBounds(region)
        .filterDate(start, end)
        .filter(ee.Filter.eq("instrumentMode", "IW"))
        .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
        .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VH"))
        .select(["VV", "VH"])
        .map(lambda image: image.toFloat())
    )


def _sentinel2_composite(start: str, end: str, region: ee.Geometry) -> ee.Image:
    return sentinel2_scenes(start, end, region).merge(_empty_collection(_S2_BANDS)).median()


def _sentinel1_composite(start: str, end: str, region: ee.Geometry) -> ee.Image:
    radar = _sentinel1_scenes(start, end, region).merge(_empty_collection(["VV", "VH"])).median()
    return radar.addBands(radar.select("VH").subtract(radar.select("VV")).rename("VH_VV"))


def build_feature_image(start: str, end: str, region: ee.Geometry) -> ee.Image:
    """Per-pixel feature stack for the period [start, end), with bands in FEATURE_NAMES order."""
    s2 = _sentinel2_composite(start, end, region)
    nir, red, blue = (s2.select(b) for b in ["B8", "B4", "B2"])

    indices = [
        s2.normalizedDifference(["B8", "B4"]).rename("NDVI"),
        s2.normalizedDifference(["B3", "B8"]).rename("NDWI"),
        s2.normalizedDifference(["B3", "B11"]).rename("MNDWI"),
        nir.subtract(red).multiply(2.5)
        .divide(nir.add(red.multiply(6)).subtract(blue.multiply(7.5)).add(1))
        .rename("EVI"),
        s2.normalizedDifference(["B8", "B11"]).rename("NDMI"),
    ]

    # The DEM may have no data over open sea; treat that as sea level so seagrass pixels are kept.
    elevation = ee.Image("NASA/NASADEM_HGT/001").select("elevation").unmask(0).toFloat()

    return (
        s2.addBands(indices)
        .addBands(_sentinel1_composite(start, end, region))
        .addBands(elevation)
        .select(FEATURE_NAMES)
        .toFloat()
    )


# ---------------------------------------------------------------------------
# Quarterly monitoring (anomaly detection)
# ---------------------------------------------------------------------------

# Signals watched for each ecosystem, with the direction that indicates damage:
# -1 means a drop signals loss (less vegetation / less tree structure on radar),
# +1 means a rise signals loss (seagrass is dark; bare sand underneath is brighter).
MONITOR_SIGNALS = {
    "mangrove": {"NDVI": -1, "VH": -1},
    "saltmarsh": {"NDVI": -1, "NDMI": -1},
    "seagrass": {"B2": 1, "B3": 1},
}
OPTICAL_SIGNALS = {"NDVI", "NDMI", "B2", "B3"}
RADAR_SIGNALS = {"VH"}

# Minimum observations per pixel in a window for a signal to be trusted.
MIN_CLEAR_OPTICAL = 2
MIN_RADAR_SCENES = 2


def build_monitoring_image(start: str, end: str, region: ee.Geometry) -> ee.Image:
    """Monitoring signals for [start, end) plus how many clear observations each pixel had."""
    # Padded with a masked placeholder so median/count keep their bands when no scene matches.
    optical_scenes = sentinel2_scenes(start, end, region).merge(_empty_collection(_S2_BANDS))
    radar_scenes = _sentinel1_scenes(start, end, region).merge(_empty_collection(["VV", "VH"]))
    optical = optical_scenes.median()
    radar = radar_scenes.median()

    return ee.Image.cat([
        optical.normalizedDifference(["B8", "B4"]).rename("NDVI"),
        optical.normalizedDifference(["B8", "B11"]).rename("NDMI"),
        optical.select(["B2", "B3"]),
        radar.select("VH"),
        optical_scenes.select("B2").count().unmask(0).rename("S2_CLEAR"),
        radar_scenes.select("VH").count().unmask(0).rename("S1_COUNT"),
    ]).toFloat()


# ---------------------------------------------------------------------------
# Canopy height / biomass features (carbon model)
# ---------------------------------------------------------------------------

# Features for the canopy-height model, computed from a single quarter's composite so
# predictions match the season of the GEDI measurement they were trained on.
# "quarter" (1-4) is added outside Earth Engine.
HEIGHT_IMAGE_FEATURES = [
    "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B11", "B12",
    "NDVI", "NDWI", "MNDWI", "EVI", "NDMI", "NDRE",
    "VV", "VH", "VH_VV",
    "elevation",
]
HEIGHT_FEATURES = HEIGHT_IMAGE_FEATURES + ["quarter"]
HEIGHT_SCALE_M = 25  # GEDI footprint diameter


def build_height_feature_image(start: str, end: str, region: ee.Geometry) -> ee.Image:
    """Per-pixel features for the canopy-height model for the period [start, end)."""
    s2 = _sentinel2_composite(start, end, region)
    nir, red, blue = (s2.select(b) for b in ["B8", "B4", "B2"])
    indices = [
        s2.normalizedDifference(["B8", "B4"]).rename("NDVI"),
        s2.normalizedDifference(["B3", "B8"]).rename("NDWI"),
        s2.normalizedDifference(["B3", "B11"]).rename("MNDWI"),
        nir.subtract(red).multiply(2.5)
        .divide(nir.add(red.multiply(6)).subtract(blue.multiply(7.5)).add(1))
        .rename("EVI"),
        s2.normalizedDifference(["B8", "B11"]).rename("NDMI"),
        s2.normalizedDifference(["B8", "B5"]).rename("NDRE"),
    ]
    elevation = ee.Image("NASA/NASADEM_HGT/001").select("elevation").unmask(0).toFloat()
    return (
        s2.addBands(indices)
        .addBands(_sentinel1_composite(start, end, region))
        .addBands(elevation)
        .select(HEIGHT_IMAGE_FEATURES)
        .toFloat()
    )


def quarter_of(start: str) -> int:
    """Calendar quarter (1-4) of a window's start date, YYYY-MM-DD."""
    return (int(start[5:7]) - 1) // 3 + 1


def mangrove_mask() -> ee.Image:
    """Mangroves in Global Mangrove Watch v4 (2020) AND ESA WorldCover class 95."""
    gmw = (ee.ImageCollection("projects/sat-io/open-datasets/GMW/annual-extent/GMW_MNG_2020")
           .mosaic().mask().reduce(ee.Reducer.max()).gt(0))
    worldcover = ee.ImageCollection("ESA/WorldCover/v200").first().select("Map").eq(95)
    return gmw.And(worldcover)
