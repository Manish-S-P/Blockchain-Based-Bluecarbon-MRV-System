import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path


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


def fetch_ndvi_from_gee(
    coordinates: list[list[float]],
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict | None:
    if len(coordinates) < 3:
        return None

    account = _load_service_account()
    if account is None:
        return None

    try:
        import ee  # Lazy import so local setup can still run without GEE auth.

        service_account_email, private_key = account
        credentials = ee.ServiceAccountCredentials(service_account_email, key_data=private_key)
        ee.Initialize(credentials, project=os.getenv("GEE_PROJECT"))

        gee_coords = [[point[1], point[0]] for point in coordinates]
        if gee_coords[0] != gee_coords[-1]:
            gee_coords.append(gee_coords[0])
        polygon = ee.Geometry.Polygon([gee_coords])
        if start_date and end_date:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        else:
            end_dt = datetime.now(timezone.utc)
            start_dt = end_dt - timedelta(days=90)

        collection = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(polygon)
            .filterDate(start_dt.strftime("%Y-%m-%d"), end_dt.strftime("%Y-%m-%d"))
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30))
        )
        image_count = int(collection.size().getInfo())
        if image_count == 0:
            return None

        image = collection.median()
        ndvi_img = image.normalizedDifference(["B8", "B4"]).rename("NDVI")
        stats = ndvi_img.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=polygon,
            scale=10,
            maxPixels=1_000_000_000,
            bestEffort=True,
        )
        ndvi_value = stats.get("NDVI").getInfo()
        if ndvi_value is None:
            return None
        return {
            "ndvi": round(float(ndvi_value), 4),
            "windowStart": start_dt.strftime("%Y-%m-%d"),
            "windowEnd": end_dt.strftime("%Y-%m-%d"),
            "geeImageCount": image_count,
        }
    except Exception as exc:  # noqa: BLE001
        print(f"GEE NDVI fetch failed: {exc}")
        return None
