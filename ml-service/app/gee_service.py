from datetime import date, datetime, timedelta, timezone

from .earth_engine import (
    FEATURE_NAMES,
    HEIGHT_IMAGE_FEATURES,
    SAMPLE_SCALE_M,
    annual_window,
    build_feature_image,
    build_height_feature_image,
    build_monitoring_image,
    init_earth_engine,
    sentinel2_scenes,
)

MAX_CLASSIFICATION_PIXELS = 500
MONITOR_SCALE_M = 10


def _plot_polygon(coordinates: list[list[float]]):
    import ee

    # Frontend coordinates are [lat, lon]; Earth Engine wants [lon, lat] and a closed ring.
    gee_coords = [[point[1], point[0]] for point in coordinates]
    if gee_coords[0] != gee_coords[-1]:
        gee_coords.append(gee_coords[0])
    return ee.Geometry.Polygon([gee_coords])


NO_DATA = -9999


def resolve_window(start_date: str | None, end_date: str | None) -> tuple[date, date]:
    """Monitoring window as [start, end) dates; `end_date` is inclusive. Defaults to the last 90 days."""
    if start_date and end_date:
        return date.fromisoformat(start_date), date.fromisoformat(end_date) + timedelta(days=1)
    end = datetime.now(timezone.utc).date() + timedelta(days=1)
    return end - timedelta(days=90), end


def window_quarter(start: date, end: date) -> int:
    """Calendar quarter (1-4) of the window's midpoint, used as the season feature."""
    mid = start + (end - start) / 2
    return (mid.month - 1) // 3 + 1


def fetch_plot_pixels(coordinates: list[list[float]], start: date, end: date) -> dict | None:
    """Per-pixel features for one plot, all from the same 30 m pixels:

    - "annual": classifier features from the 12 months ending at the window end;
    - "current": canopy-height features for the window [start, end);
    - "previous": canopy-height features for the same window one year earlier.

    Values missing because of clouds are None. Returns None when Earth Engine is unavailable.
    """
    if len(coordinates) < 3:
        return None

    try:
        if not init_earth_engine():
            return None
        import ee

        polygon = _plot_polygon(coordinates)
        annual_start, annual_end = annual_window(end - timedelta(days=1))
        prev_start, prev_end = _one_year_earlier(start), _one_year_earlier(end)
        stack = ee.Image.cat([
            build_feature_image(annual_start, annual_end, polygon).rename([f"a_{n}" for n in FEATURE_NAMES]),
            build_height_feature_image(start.isoformat(), end.isoformat(), polygon)
            .rename([f"c_{n}" for n in HEIGHT_IMAGE_FEATURES]),
            build_height_feature_image(prev_start.isoformat(), prev_end.isoformat(), polygon)
            .rename([f"p_{n}" for n in HEIGHT_IMAGE_FEATURES]),
        ]).unmask(NO_DATA)

        samples = stack.sample(region=polygon, scale=SAMPLE_SCALE_M, numPixels=MAX_CLASSIFICATION_PIXELS, seed=0)
        rows = [feature["properties"] for feature in samples.getInfo()["features"]]
        if not rows:
            # Plot smaller than one pixel: use the pixel under its centre.
            centre = stack.reduceRegion(ee.Reducer.first(), polygon.centroid(1), SAMPLE_SCALE_M).getInfo()
            rows = [centre] if centre else []
        if not rows:
            return None

        def part(prefix: str, names: list[str]) -> list[dict]:
            return [{n: (None if row.get(f"{prefix}{n}") in (None, NO_DATA) else row[f"{prefix}{n}"]) for n in names}
                    for row in rows]

        return {
            "annual": part("a_", FEATURE_NAMES),
            "current": part("c_", HEIGHT_IMAGE_FEATURES),
            "previous": part("p_", HEIGHT_IMAGE_FEATURES),
        }
    except Exception as exc:  # noqa: BLE001
        print(f"GEE plot pixel fetch failed: {exc}")
        return None


def fetch_plot_pixel_features(coordinates: list[list[float]], as_of: date) -> list[dict] | None:
    """Classifier features for each 30 m pixel in the plot, from the 12 months ending `as_of`.

    Returns None when Earth Engine is unavailable or the plot has no usable pixels.
    """
    if len(coordinates) < 3:
        return None

    try:
        if not init_earth_engine():
            return None
        import ee

        polygon = _plot_polygon(coordinates)
        start, end = annual_window(as_of)
        image = build_feature_image(start, end, polygon)
        samples = image.sample(
            region=polygon,
            scale=SAMPLE_SCALE_M,
            numPixels=MAX_CLASSIFICATION_PIXELS,
            seed=0,
            dropNulls=True,
        ).getInfo()["features"]
        rows = [feature["properties"] for feature in samples]

        if not rows:
            # Plot smaller than one pixel: use the pixel under its centre.
            centre = image.reduceRegion(ee.Reducer.first(), polygon.centroid(1), SAMPLE_SCALE_M).getInfo()
            if all(centre.get(name) is not None for name in FEATURE_NAMES):
                rows = [centre]
        return rows or None
    except Exception as exc:  # noqa: BLE001
        print(f"GEE classification features fetch failed: {exc}")
        return None


def _one_year_earlier(day: date) -> date:
    try:
        return day.replace(year=day.year - 1)
    except ValueError:  # 29 February
        return day.replace(year=day.year - 1, day=28)


def fetch_quarter_observation(
    coordinates: list[list[float]],
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict | None:
    """Plot-average monitoring signals for a quarter and for the same window one year earlier.

    `end_date` is inclusive. Without dates, the last 90 days are used. Returns None when
    Earth Engine is unavailable; signals with no clear observations come back as None.
    """
    if len(coordinates) < 3:
        return None

    try:
        if not init_earth_engine():
            return None
        import ee

        start, end = resolve_window(start_date, end_date)
        previous_start, previous_end = _one_year_earlier(start), _one_year_earlier(end)

        polygon = _plot_polygon(coordinates)

        def plot_mean(window_start: date, window_end: date):
            image = build_monitoring_image(window_start.isoformat(), window_end.isoformat(), polygon)
            return image.reduceRegion(ee.Reducer.mean(), polygon, MONITOR_SCALE_M, maxPixels=1_000_000_000, bestEffort=True)

        result = ee.Dictionary({
            "current": plot_mean(start, end),
            "previous": plot_mean(previous_start, previous_end),
            "scenes": sentinel2_scenes(start.isoformat(), end.isoformat(), polygon).size(),
        }).getInfo()

        current = result["current"]
        return {
            "current": current,
            "previous": result["previous"],
            "ndvi": None if current.get("NDVI") is None else round(float(current["NDVI"]), 4),
            "windowStart": start.isoformat(),
            "windowEnd": (end - timedelta(days=1)).isoformat(),
            "geeImageCount": int(result["scenes"]),
        }
    except Exception as exc:  # noqa: BLE001
        print(f"GEE quarterly observation fetch failed: {exc}")
        return None
