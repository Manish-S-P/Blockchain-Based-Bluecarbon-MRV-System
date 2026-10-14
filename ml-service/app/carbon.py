"""Mangrove carbon model: satellite features -> canopy height -> biomass -> carbon.

The chain, with the source of every step (see docs/carbon-calculation.md):

1. Canopy height (m). A quantile random forest predicts GEDI L2A RH98 laser heights from
   same-season Sentinel-1/2 features (training/train_height.py). Intervals are calibrated
   with conformal prediction on spatially held-out data.
2. Height -> above-ground biomass (t/ha). Simard et al. 2019 (Nature Geoscience) fitted
   AGB = a * Hba^b to 331 field plots (their Eq. 4). Their published map for Indian
   mangroves follows AGB = 1.589 * Hba^2.0067 exactly, with Hba (basal-area-weighted
   height) = 0.6337 * top-of-canopy height. Both were recovered from the published
   layers with r = 1.0000.
3. Below-ground biomass = AGB * root:shoot ratio. IPCC 2013 Wetlands Supplement, Ch. 4:
   0.49 (tropical wet), 0.29 (tropical dry).
4. Carbon = biomass * 0.451 (IPCC 2013 mangrove carbon fraction); CO2 = carbon * 44/12.
5. Soil carbon accrual: 0.5 t C/ha/yr for the first 20 years (India BEE BM FR05.001,
   adopting CDM AR-AM0014), scaled by a cover factor.
"""

import json
from dataclasses import dataclass, field
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scipy import sparse
from sklearn.ensemble import RandomForestRegressor
from sklearn.neighbors import NearestNeighbors

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_PATH = MODEL_DIR / "canopy_height_model.joblib"
METADATA_PATH = MODEL_DIR / "canopy_height_model.json"

# --- Published constants -----------------------------------------------------------------
HBA_PER_TOP_HEIGHT = 0.6337        # Simard et al. 2019 product, Indian mangroves
ALLOMETRY_A = 1.589                # AGB = A * Hba^B   (Simard et al. 2019, Eq. 4)
ALLOMETRY_B = 2.0067
CARBON_FRACTION = 0.451            # IPCC 2013 Wetlands Supplement, mangrove
ROOT_SHOOT = {"tropical_wet": 0.49, "tropical_dry": 0.29}   # IPCC 2013 Wetlands Supplement
CO2_PER_CARBON = 44 / 12
SOIL_RATE_T_C_HA_YR = 0.5          # India BEE BM FR05.001 / CDM AR-AM0014
SOIL_RATE_YEARS = 20
# VM0033-style cover factor: no soil accrual below 15% mangrove cover, full rate from 50%.
COVER_MIN, COVER_FULL = 0.15, 0.50

INTERVAL = (0.05, 0.50, 0.95)      # 90% prediction interval and median


def climate_zone(longitude: float, latitude: float) -> str:
    """IPCC climate zone for Indian mangroves: Gujarat/Kutch coast is tropical dry, the rest wet."""
    return "tropical_dry" if longitude < 74 and latitude > 20.5 else "tropical_wet"


def height_to_agb(height_m):
    """Above-ground biomass (t dry matter/ha) from top-of-canopy height (m)."""
    hba = HBA_PER_TOP_HEIGHT * np.clip(np.asarray(height_m, dtype=float), 0, None)
    return ALLOMETRY_A * np.power(hba, ALLOMETRY_B)


def agb_to_co2(agb, zone: str) -> dict:
    """Tree carbon in t CO2/ha, split into above- and below-ground."""
    agb = np.asarray(agb, dtype=float)
    above = agb * CARBON_FRACTION * CO2_PER_CARBON
    below = agb * ROOT_SHOOT[zone] * CARBON_FRACTION * CO2_PER_CARBON
    return {"above": above, "below": below, "total": above + below}


def cover_factor(mangrove_cover: float) -> float:
    if mangrove_cover <= COVER_MIN:
        return 0.0
    if mangrove_cover >= COVER_FULL:
        return 1.0
    return (mangrove_cover - COVER_MIN) / (COVER_FULL - COVER_MIN)


def soil_co2_per_ha(years: float, mangrove_cover: float) -> float:
    """Soil carbon added over `years`, in t CO2/ha, at the official default rate."""
    effective_years = min(max(years, 0.0), SOIL_RATE_YEARS)
    return SOIL_RATE_T_C_HA_YR * effective_years * cover_factor(mangrove_cover) * CO2_PER_CARBON


# --- Quantile random forest ----------------------------------------------------------------

class QuantileForest:
    """Random forest that predicts quantiles (Meinshausen 2006, quantile regression forests).

    A normal sklearn forest is trained; for a new sample, the training targets that share a
    leaf with it in each tree are weighted (1 / leaf size, averaged over trees) and the
    weighted quantiles of those targets form the prediction. Keeping the plain sklearn forest
    means SHAP's TreeExplainer can explain it directly.
    """

    def __init__(self, **params) -> None:
        self.forest = RandomForestRegressor(**params)
        self.y_train: np.ndarray | None = None
        self._train_leaf_maps: list[sparse.csr_matrix] = []

    def fit(self, X, y) -> "QuantileForest":
        self.forest.fit(X, y)
        self.y_train = np.asarray(y, dtype=float)
        self._index_training_leaves(X)
        return self

    def _index_training_leaves(self, X) -> None:
        leaves = self.forest.apply(X)  # (n_train, n_trees)
        n = leaves.shape[0]
        self._train_leaf_maps = []
        for t in range(leaves.shape[1]):
            leaf_ids = leaves[:, t]
            counts = np.bincount(leaf_ids)
            weights = 1.0 / counts[leaf_ids]
            # (n_leaves, n_train): row = leaf, value = 1/leaf size for its training samples
            self._train_leaf_maps.append(
                sparse.csr_matrix((weights, (leaf_ids, np.arange(n))), shape=(counts.size, n))
            )

    def __getstate__(self):
        state = self.__dict__.copy()
        state["_train_leaf_maps"] = []  # rebuilt from X_train on load
        return state

    def predict_quantiles(self, X, quantiles=INTERVAL, chunk: int = 2000) -> np.ndarray:
        X = np.asarray(X, dtype=np.float32)
        order = np.argsort(self.y_train)
        y_sorted = self.y_train[order]
        n_trees = len(self._train_leaf_maps)
        out = np.empty((X.shape[0], len(quantiles)))
        for start in range(0, X.shape[0], chunk):
            block = X[start:start + chunk]
            leaves = self.forest.apply(block)
            weights = None
            for t, leaf_map in enumerate(self._train_leaf_maps):
                w = leaf_map[leaves[:, t]]
                weights = w if weights is None else weights + w
            weights = (weights / n_trees).tocsr()[:, order].tocsr()
            weights.sort_indices()
            for i in range(weights.shape[0]):
                row = weights.getrow(i)
                cum = np.cumsum(row.data)
                values = y_sorted[row.indices]
                out[start + i] = [values[min(np.searchsorted(cum, q * cum[-1]), len(values) - 1)] for q in quantiles]
        return out


# --- Area of applicability (Meyer & Pebesma 2021) ------------------------------------------

@dataclass
class ApplicabilityArea:
    """Flags inputs too unlike the training data for the model to be trusted."""
    mean: np.ndarray
    std: np.ndarray
    weights: np.ndarray
    train_points: np.ndarray
    mean_distance: float
    threshold: float
    _nn: NearestNeighbors | None = field(default=None, repr=False)

    def _scale(self, X) -> np.ndarray:
        return (np.asarray(X, dtype=float) - self.mean) / self.std * self.weights

    def dissimilarity(self, X) -> np.ndarray:
        if self._nn is None:
            self._nn = NearestNeighbors(n_neighbors=1).fit(self.train_points)
        distances, _ = self._nn.kneighbors(self._scale(X))
        return distances[:, 0] / self.mean_distance

    def inside(self, X) -> np.ndarray:
        return self.dissimilarity(X) <= self.threshold

    def __getstate__(self):
        state = self.__dict__.copy()
        state["_nn"] = None
        return state


# --- Model bundle used by the API ----------------------------------------------------------

@dataclass
class CarbonEstimate:
    status: str                 # "ok" | "insufficient_data" | "unavailable"
    height_m: dict = field(default_factory=dict)          # low / mid / high, plot mean
    agb_t_ha: dict = field(default_factory=dict)
    co2_t_ha: dict = field(default_factory=dict)          # tree carbon, low / mid / high
    co2_above_t_ha: float = 0.0
    co2_below_t_ha: float = 0.0
    mangrove_cover: float = 0.0
    pixels: int = 0
    applicable_share: float = 0.0
    climate_zone: str = ""
    explanation: list = field(default_factory=list)      # top SHAP drivers, t CO2/ha


FEATURE_GROUPS = {
    "Canopy greenness (red-edge)": ["B5", "B6", "B7", "B8A", "NDRE"],
    "Vegetation vigour (NDVI/EVI)": ["NDVI", "EVI", "B8", "B4"],
    "Leaf and wood moisture": ["NDMI", "B11", "B12"],
    "Radar backscatter (tree structure)": ["VV", "VH", "VH_VV"],
    "Water and tidal wetness": ["NDWI", "MNDWI", "B2", "B3"],
    "Ground elevation": ["elevation"],
    "Season": ["quarter"],
}


class CarbonModel:
    def __init__(self) -> None:
        self.bundle = None
        self._explainer = None
        if MODEL_PATH.exists() and METADATA_PATH.exists():
            self.bundle = joblib.load(MODEL_PATH)
            self.bundle["model"]._index_training_leaves(self.bundle["X_train"])
            self.metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))

    @property
    def available(self) -> bool:
        return self.bundle is not None

    @property
    def features(self) -> list[str]:
        return self.bundle["features"]

    def _explain(self, X: pd.DataFrame, co2_per_m: float) -> list[dict]:
        """Mean SHAP contribution per feature group, converted to t CO2/ha."""
        try:
            import shap
        except ImportError:
            return []
        if self._explainer is None:
            self._explainer = shap.TreeExplainer(self.bundle["model"].forest)
        values = np.asarray(self._explainer.shap_values(X, check_additivity=False)).mean(axis=0)
        by_feature = dict(zip(self.features, values))
        groups = [
            {"factor": name, "effect_t_co2_ha": round(sum(by_feature.get(f, 0.0) for f in members) * co2_per_m, 1)}
            for name, members in FEATURE_GROUPS.items()
        ]
        return sorted(groups, key=lambda g: abs(g["effect_t_co2_ha"]), reverse=True)[:4]

    def estimate(self, pixel_rows: list[dict], is_mangrove: list[bool], longitude: float, latitude: float,
                 explain: bool = True) -> CarbonEstimate:
        """Plot-level tree carbon from per-pixel features. Non-mangrove pixels count as zero."""
        if not self.available:
            return CarbonEstimate("unavailable")
        usable = [(row, m) for row, m in zip(pixel_rows, is_mangrove)
                  if all(row.get(f) is not None for f in self.features)]
        if not usable:
            return CarbonEstimate("insufficient_data", pixels=len(pixel_rows))

        X = pd.DataFrame([row for row, _ in usable], columns=self.features).astype(float)
        mangrove = np.array([m for _, m in usable])
        q = self.bundle["model"].predict_quantiles(X.to_numpy(np.float32))
        margin = self.bundle["conformal_margin_m"]
        heights = np.column_stack([np.clip(q[:, 0] - margin, 0, None), q[:, 1], q[:, 2] + margin])
        heights[~mangrove] = 0.0

        zone = climate_zone(longitude, latitude)
        agb = height_to_agb(heights)                       # per pixel, low/mid/high
        co2 = agb_to_co2(agb, zone)
        mean = lambda a: [float(v) for v in a.mean(axis=0)]  # fully correlated aggregation
        h_low, h_mid, h_high = mean(heights)
        agb_low, agb_mid, agb_high = mean(agb)
        c_low, c_mid, c_high = mean(co2["total"])

        inside = self.bundle["aoa"].inside(X.to_numpy())
        explanation = []
        if explain and mangrove.any():
            # d(CO2)/d(height) at the plot's median height, to express SHAP in t CO2/ha.
            h = max(h_mid, 0.5)
            slope = float((agb_to_co2(height_to_agb(h + 0.5), zone)["total"]
                           - agb_to_co2(height_to_agb(h - 0.5), zone)["total"]))
            explanation = self._explain(X[mangrove], slope)

        return CarbonEstimate(
            status="ok",
            height_m={"low": round(h_low, 2), "mid": round(h_mid, 2), "high": round(h_high, 2)},
            agb_t_ha={"low": round(agb_low, 1), "mid": round(agb_mid, 1), "high": round(agb_high, 1)},
            co2_t_ha={"low": round(c_low, 1), "mid": round(c_mid, 1), "high": round(c_high, 1)},
            co2_above_t_ha=round(float(co2["above"][:, 1].mean()), 1),
            co2_below_t_ha=round(float(co2["below"][:, 1].mean()), 1),
            mangrove_cover=round(float(mangrove.mean()), 3),
            pixels=len(usable),
            applicable_share=round(float(inside[mangrove].mean()) if mangrove.any() else 0.0, 3),
            climate_zone=zone,
            explanation=explanation,
        )


def estimate_points(model: "CarbonModel", rows: list[dict], coords: list[tuple[float, float]]) -> list[dict | None]:
    """Tree carbon (t CO2/ha, low/mid/high) for single mangrove pixels, e.g. baseline donors.

    `rows` hold height features (incl. "quarter"); `coords` are (longitude, latitude).
    Returns None for points with missing features (clouds).
    """
    complete = [all(row.get(f) is not None for f in model.features) for row in rows]
    results: list[dict | None] = [None] * len(rows)
    if not model.available or not any(complete):
        return results
    X = np.array([[row[f] for f in model.features] for row, ok in zip(rows, complete) if ok], dtype=np.float32)
    q = model.bundle["model"].predict_quantiles(X)
    margin = model.bundle["conformal_margin_m"]
    heights = np.column_stack([np.clip(q[:, 0] - margin, 0, None), q[:, 1], q[:, 2] + margin])
    inside = model.bundle["aoa"].inside(X)
    positions = [i for i, ok in enumerate(complete) if ok]
    for k, i in enumerate(positions):
        lon, lat = coords[i]
        co2 = agb_to_co2(height_to_agb(heights[k]), climate_zone(lon, lat))["total"]
        results[i] = {"low": float(co2[0]), "mid": float(co2[1]), "high": float(co2[2]), "applicable": bool(inside[k])}
    return results
