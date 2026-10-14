# Carbon calculation

How the Blue Carbon Registry estimates the carbon stored and absorbed by a mangrove plot, how
that becomes carbon credits, how accurate it is, and what it can and cannot claim.

Scope: **mangroves only.** Seagrass and saltmarsh are planned future additions.

---

## 1. Summary

| Question | Short answer |
|---|---|
| Can a satellite measure carbon directly? | No. It measures tree **height** (laser, radar) and how the canopy looks. Carbon is calculated from those with published equations. |
| What do we calculate? | Carbon in the trees (above and below ground) from satellites, plus soil carbon from India's official default rate. |
| How are credits decided? | Once a year: the carbon gain we can **prove** (larger than the measurement error), plus official soil accrual, minus a 12% safety buffer. |
| How accurate is it? | Canopy height: ±3.5 m (R² 0.60) for new places, with 90% ranges that hold 90% of the time. Tree carbon per plot has wide ranges, so in year 1 credits come almost only from soil. |
| Is it conservative? | Yes. Our biomass is at the low end of independent sources and well below the one Indian field measurement we found, so it under-credits rather than over-credits. |
| Is it standard-grade? | It follows India's official mangrove methodology (BEE BM FR05.001), except that NASA GEDI laser data stands in for field plots. Every standard requires some field measurement, so this is research-grade until field plots are added. |

---

## 2. What has to be measured

Mangrove carbon is stored in several places ("pools"):

| Pool | What it is | Satellite can see it? | Counted by us? |
|---|---|---|---|
| Above-ground biomass | Trunks, branches, leaves, prop roots | Yes (height and canopy) | **Yes**, measured |
| Below-ground biomass | Roots in the mud | No | **Yes**, from the IPCC root-to-shoot ratio |
| Soil organic carbon | Plant matter buried in the mud | No | **Yes**, only the yearly addition, at India's official rate |
| Litter (fallen leaves) | | | No (excluded by India's methodology) |
| Dead wood | | | No (optional; leaving it out can only under-credit) |

This matches India's mangrove methodology BEE BM FR05.001 (a verbatim adoption of CDM
AR-AM0014): above- and below-ground biomass are required, soil and dead wood optional,
litter excluded ([BEE BM FR05.001](https://beeindia.gov.in/sites/default/files/BM%20FR05.001.pdf)).

Most mangrove carbon is in the soil (roughly half or more, about 85% in the Indian Sundarbans;
see `reports/Blue carbon estimation model design.md`). We do **not** credit the soil carbon
that already exists. It cannot be measured from space, and the project did not create it. We
credit only the official yearly addition.

---

## 3. Recognised ways to estimate carbon

### 3.1 Tree carbon

| Method | How it works | Accepted by | Needs field work? |
|---|---|---|---|
| **Field inventory + allometric equations** | Measure trunk diameter (and height) of every tree in sample plots; equations built from felled, weighed trees give biomass | All standards (India BEE, CDM, Verra VM0033, Plan Vivo) | Yes |
| **Double sampling** (field + satellite) | A few field plots calibrate a regression on a satellite index; the satellite fills in the rest | CDM AR-TOOL14, so also India | Yes, a few plots |
| **Lidar-calibrated satellite model** (what we do) | Space-laser (GEDI) measurements play the role of field plots; a model on Sentinel images predicts every pixel | Peer-reviewed research; no standard accepts it alone yet | No |
| **IPCC default growth rate (Tier 1)** | Area × official growth rate (9.9 t biomass/ha/yr, tropical wet mangroves) | IPCC national inventories; not enough for credits on its own | No |

### 3.2 Soil carbon

| Method | Accepted by | Needs field work? |
|---|---|---|
| Soil cores (density × carbon % × depth) | All standards | Yes |
| Burial/accretion rates (e.g. lead-210 dating) | Verra VM0033 | Yes |
| **Official default rate** (what we do) | India BEE (0.5 t C/ha/yr), Verra (1.46, only if no local data), IPCC (1.62) | No |

### 3.3 Turning carbon into credits

| Approach | What is credited | Used by |
|---|---|---|
| **Stock difference** (what we do) | Carbon now − carbon before | CDM / India restoration methodologies |
| Gain–loss | Growth × area − losses | IPCC inventories |
| Avoided deforestation (REDD+) | Loss that would have happened × carbon stock | Mikoko Pamoja, Vanga (Kenya) |

All standards then subtract an uncertainty deduction, a non-permanence buffer and leakage.

**Key fact:** every recognised standard anchors carbon in some ground measurement. Satellites
are accepted for area, mapping, change detection and scaling up field plots, but not yet as
the only source of carbon numbers.

---

## 4. What this project does

### 4.1 The calculation chain

```
Sentinel-1 radar + Sentinel-2 optical + NASADEM elevation   (free, every quarter)
        │  quantile random forest, trained on GEDI laser heights
        ▼
Canopy height H (m), with a 90% range
        │  Simard et al. 2019 mangrove allometry (331 field plots)
        ▼
Above-ground biomass AGB (t/ha)
        │  IPCC root-to-shoot ratio, carbon fraction, 44/12
        ▼
Tree carbon (t CO₂/ha): above-ground + roots
        +  soil accrual: India default 0.5 t C/ha/yr × cover factor
        ▼
Annual credit calculation (section 5)
```

### 4.2 Each step and its source

| Step | Equation / value | Source |
|---|---|---|
| Training label | GEDI L2A **RH98** canopy height; shots with `quality_flag = 1`, `degrade_flag = 0`, `sensitivity ≥ 0.95` | NASA GEDI, `LARSE/GEDI/GEDI02_A_002_MONTHLY` in Earth Engine |
| Mangrove mask | Global Mangrove Watch v4 (2020) ∩ ESA WorldCover class 95 | GMW, ESA |
| Height model | Quantile random forest (Meinshausen 2006), 200 trees, features from the **same quarter** as each GEDI shot | `ml-service/training/train_height.py` |
| Height → basal-area height | Hba = 0.6337 × H | Simard et al. 2019 data product (Indian mangroves) |
| Height → biomass | **AGB = 1.589 × Hba^2.0067** (t/ha) | Simard et al. 2019, Eq. 4, fitted to 331 field plots; the published map follows this exactly over India (r = 1.0000) |
| Roots | BGB = AGB × **0.49** (tropical wet) or **0.29** (tropical dry: Gujarat/Kutch) | IPCC 2013 Wetlands Supplement, Ch. 4 |
| Carbon fraction | **0.451** | IPCC 2013 Wetlands Supplement, Ch. 4 (mangrove) |
| Carbon → CO₂ | × **44/12 = 3.667** | Molecular weights |
| Soil accrual | **0.5 t C/ha/yr** for the first 20 years, × cover factor | BEE BM FR05.001 / CDM AR-AM0014 |
| Cover factor | 0 below 15% mangrove cover, 1 at 50% or more, linear between | VM0033-style rule |

Combined, for the tropical wet zone: **tree CO₂ (t/ha) = AGB × 1.49 × 0.451 × 3.667 = AGB × 2.464**.

**Worked example:** a canopy 7 m tall gives Hba = 4.44 m, so AGB = 1.589 × 4.44^2.0067 ≈ 31.6 t/ha.
That is about 78 t CO₂/ha of tree carbon (52 above ground, 26 in roots).

### 4.3 Per plot, per quarter

1. Every 30 m pixel inside the farmer's polygon is sampled.
2. The ecosystem classifier keeps only pixels that look like mangrove. Other pixels count as 0.
3. For each mangrove pixel, the model predicts canopy height (5th, 50th and 95th percentile),
   for **this quarter** and for **the same quarter one year earlier**.
4. Heights go through the chain above. The plot value is the average over pixels.
5. Ranges are aggregated as if all pixel errors moved together (fully correlated). This gives
   the widest, most conservative plot range.
6. SHAP explains the plot's number: how much each group of satellite signals pushed it above or
   below the average training pixel, in t CO₂/ha.
7. If the plot's features are unlike anything in the training data (outside the "area of
   applicability", Meyer & Pebesma 2021), the estimate is shown but not used for credits.

Quarterly values are **status observations**, not credits. Height estimates swing with the season
(for example, a Mumbai plot reads about 7.3 m in the dry season and 4.4 m in the monsoon), which is
why gains are always measured against the **same season a year earlier**.

---

## 5. Annual credit calculation

Implemented in `backend/services/credits.js`. For each year of 4 quarterly checks:

1. **Tree gain**, for each quarter with a usable estimate:
   (tree CO₂ now) − (tree CO₂ same season last year). Same pixels, same model.
2. **Its uncertainty:** combined 90% half-width = √(h_now² + h_before²). The two years are
   treated as independent, which overstates the uncertainty.
3. **Average** the gains and the half-widths over the usable quarters (at least 2 are required).
   Half-widths are not shrunk by averaging, which is again conservative.
4. **Uncertainty discount**, using India's official rule (CDM AR-TOOL14 v4.2, Appendix 2):

   | Relative uncertainty (half-width ÷ gain) | Share of the half-width deducted |
   |---|---|
   | ≤ 10% | 0 |
   | 10–15% | 25% |
   | 15–20% | 50% |
   | 20–30% | 75% |
   | > 30% | 100% (only the lower end of the range counts) |

   proven tree gain = max(0, gain − share × half-width)
5. **Soil:** 0.5 t C/ha × cover factor × 3.667, i.e. 1.83 t CO₂/ha at full cover.
6. Per hectare = proven tree gain + soil. Multiply by plot area.
7. **Buffer:** withhold 12% for future losses such as cyclones or cutting.
8. Subtract credits already issued.
9. **Blocking rules:** any damage anomaly in the year blocks minting. Fewer than 2 usable
   quarters, or a plot outside the area of applicability, means no tree credit.
10. **Evidence:** the full calculation and every quarter's inputs are written to an audit report
    whose IPFS hash is stored on-chain with the credit NFT, so anyone can recompute it.

### Real example (from the end-to-end test, Mumbai, 1.44 ha)

| Line | Value |
|---|---|
| Tree carbon gain vs same season last year | −3.3 ± 156.5 t CO₂/ha |
| Part we can prove | 0 |
| Soil (100% mangrove cover) | +1.83 t CO₂/ha |
| × 1.44 ha | 2.64 t CO₂ |
| − 12% buffer | − 0.32 |
| **Credits** | **2.32** |

A young plantation growing about 10 t biomass/ha/yr adds about 25 t CO₂/ha/yr, which is far below a
±150 t/ha range. Tree credits therefore appear only after several years, once the accumulated
gain clearly exceeds the error. Credits never double count, because each year subtracts what
was already issued.

---

## 6. How accurate it is

### 6.1 Canopy height model

Data: **9,085** quality-filtered GEDI shots over mangroves in **14 regions** (India and Sri
Lanka), 2019–2025. Full report: `ml-service/models/canopy_height_report.txt`.

| Test | R² | RMSE | Bias | What it means |
|---|---|---|---|---|
| New places (~5 km spatial blocks never seen in training) | **0.60** | **3.47 m** | −0.70 m | Main accuracy figure |
| Whole regions never seen (leave-one-region-out) | 0.15 | 5.05 m | −1.99 m | Harder test; dominated by Andaman (below) |
| Random split | 0.62 | 3.38 m | −0.68 m | Shown only for comparison; random splits flatter models |

- **90% ranges:** contained the true GEDI height **90.3%** of the time in new places (calibrated
  with conformal prediction), but only 77.9% in never-seen regions.
- **Per region (never seen):** errors of 0.7–3.3 m in Rann of Kutch, Gulf of Kutch, Krishna,
  Pichavaram, Bhitarkanika, Godavari, Sundarbans and Mumbai.
- **Andaman** is the exception (10 m error). It is the only tall forest (about 15 m), so a model
  that has never seen tall mangroves under-predicts them. This is why the area-of-applicability
  check exists.
- **Most important inputs (SHAP):** elevation, red-edge band B5, NDRE, radar VV.
  - Elevation ranks first for a physical reason: NASADEM comes from radar that hits the
    **top of the canopy**, so over flat mangrove coasts it partly measures tree height. This is
    the same principle Simard et al. 2019 used.
  - Elevation is fixed in time, so the year-to-year **change** comes from the Sentinel signals.

### 6.2 Tree carbon

- Converting the height error into carbon gives a per-pixel RMSE of about 171 t CO₂/ha (R² 0.49).
- A plot of many pixels is more stable, but because we assume fully correlated errors, plot
  ranges stay wide. Example: Mumbai, 31 t CO₂/ha with a range of 13–162.

### 6.3 Independent comparison (data the model never used)

Medians over mangrove pixels, Jan–Mar 2021 (`ml-service/models/carbon_validation_report.txt`):

| Region | Our height | TanDEM-X height (2015) | Our AGB | Simard 2019 AGB | ESA CCI 2020 AGB | Field AGB |
|---|---|---|---|---|---|---|
| Sundarbans | 4.1 m | 5.9 m | 10.7 | 46.5 | 12.0 | |
| Bhitarkanika | 4.5 m | 7.5 m | 12.9 (top 10%: 81) | 67.0 | 18.0 | **318.8 ± 44.4** |
| Godavari | 4.4 m | 5.8 m | 12.7 | 46.5 | 28.0 | |
| Pichavaram | 3.3 m | 3.1 m | 7.2 | 7.4 | 14.0 | |
| Gulf of Kutch | 3.0 m | 3.7 m | 5.9 | 29.7 | 2.0 | |
| Rann of Kutch | 2.8 m | 2.4 m | 5.2 | 7.4 | 29.0 | |
| Krishna delta | 3.4 m | 3.2 m | 7.4 | 29.7 | 9.0 | |
| Andaman | 14.8 m | 11.1 m | 142.4 | 186.7 | 72.0 | |
| Mumbai (Thane Creek) | 7.9 m | 6.3 m | 40.7 | 16.7 | 5.0 | |

AGB is in t/ha. The field value is a mean over 42 plots in dense Bhitarkanika forest.

What this shows:
- **Heights agree with an independent radar product** within about 0.2–3 m in most regions.
- **Our biomass is at the low end** of the independent maps in most regions.
- The one field value (dense Bhitarkanika forest) is **much higher** than our regional median.
  Part of that is because field plots sit in mature core forest while our median includes young
  and fringe stands. Part is a likely **under-estimate** by GEDI heights and the global
  allometry in dense Indian mangroves.
- **Net effect:** absolute carbon stocks are probably **under-estimated**. For credits that is
  the safe direction. Absolute stock figures should be presented as conservative estimates,
  not precise measurements.

---

## 7. Feasibility and reliability

### Feasibility

| Aspect | Status |
|---|---|
| Cost | Free: Sentinel, GEDI, NASADEM, GMW and WorldCover data and Earth Engine (non-commercial). |
| Field work | None needed to run; strongly recommended to calibrate (section 8). |
| Compute | Training about 4 minutes on a laptop. Each quarterly check is about 10–30 s of Earth Engine time per plot. |
| Coverage | Any Indian mangrove with Sentinel coverage. Cloudy monsoon quarters are skipped automatically. |
| Reproducibility | Every step is a script (section 9); every credit has an audit report on IPFS with its hash on-chain. |

### Reliability

| Strength | Weakness |
|---|---|
| Every step is a published equation or a physical measurement, with sources | No Indian field calibration of GEDI heights or the allometry |
| Tested on places and regions the model never saw; ranges verified to hold 90% of the time | Tall forest (Andaman) is poorly predicted when not in training data |
| Uncertainty rule is India's official one (AR-TOOL14), and errors are combined conservatively | Plot ranges are wide, so tree credits take years to appear |
| Same-season comparison removes seasonal swings | Soil carbon (most of the stock) is a default rate, not measured |
| Damage detection is independently validated (90% of real mangrove loss detected; see `ml-service/models/anomaly_detector_report.txt`) | Root:shoot climate zone for Gujarat (tropical dry) needs checking against IPCC zone maps |

---

## 8. Limitations and how to improve

1. **Field calibration (highest value).** Even 10–20 field plots at one Indian site (trunk
   diameter, height, species) would allow the following:
   - Correct the GEDI height bias locally.
   - Fit an Indian height–biomass equation, replacing the global Simard equation.
   - Move the project from "research-grade" to the double-sampling method that CDM AR-TOOL14
     and India's BEE accept.
2. **Soil cores** would replace the default soil rate (Tier 1) with measured values (Tier 2).
3. **Baseline:** gains are currently compared with the same plot a year earlier. The planned
   synthetic-control baseline (similar unrestored plots) will subtract natural growth that would
   have happened anyway.
4. **More tall-forest training data** (e.g. more Andaman, Bangladesh Sundarbans) for regions
   like Andaman.
5. **Multi-year crediting** needs the planned contract redesign. The current contract mints
   once per plot.
6. These are **indicative MRV estimates**, not verified credits under any registry.

---

## 9. Reproduce it

From `ml-service/` (set `GEE_PROJECT` first):

```bash
.venv/bin/python -m training.build_height_dataset   # GEDI heights + same-quarter Sentinel features
.venv/bin/python -m training.train_height           # model, spatial tests, conformal ranges, SHAP
.venv/bin/python -m training.validate_carbon        # independent comparison table
```

| File | Contents |
|---|---|
| `ml-service/app/carbon.py` | Chain constants, quantile forest, area of applicability, plot estimate |
| `ml-service/models/canopy_height_report.txt` | Accuracy report |
| `ml-service/models/carbon_validation_report.txt` | Independent comparison |
| `backend/services/credits.js` | Annual credit calculation |
| `reports/Blue carbon estimation model design.md` | Research behind these choices, with sources |

---

## 10. References

- Simard, M. et al. (2019). Mangrove canopy height globally related to precipitation,
  temperature and cyclone frequency. *Nature Geoscience* 12, 40–45. Data: ORNL DAAC 1665,
  doi:10.3334/ORNLDAAC/1665.
- IPCC (2013). *Supplement to the 2006 IPCC Guidelines: Wetlands*, Chapter 4, Coastal Wetlands.
  [PDF](https://www.ipcc-nggip.iges.or.jp/public/wetlands/pdf/Wetlands_separate_files/WS_Chp4_Coastal_Wetlands.pdf)
- Bureau of Energy Efficiency (2025). BM FR05.001, mangrove methodology under India's Carbon
  Credit Trading Scheme. [PDF](https://beeindia.gov.in/sites/default/files/BM%20FR05.001.pdf)
- UNFCCC CDM AR-TOOL14 v4.2, estimation of carbon stocks and change in trees.
  [PDF](https://cdm.unfccc.int/methodologies/ARmethodologies/tools/ar-am-tool-14-v4.2.pdf)
- Verra VM0033 v2.1, Tidal Wetland and Seagrass Restoration.
  [PDF](https://verra.org/wp-content/uploads/2023/09/VM0033-Methodology-for-Tidal-Wetland-and-Seagrass-Restoration-v2.1.pdf)
- Dubayah, R. et al. GEDI L2A canopy height (`LARSE/GEDI/GEDI02_A_002_MONTHLY`, Google Earth Engine catalog).
- Meinshausen, N. (2006). Quantile regression forests. *JMLR* 7, 983–999.
- Romano, Y., Patterson, E., Candès, E. (2019). Conformalized quantile regression. *NeurIPS*.
- Meyer, H., Pebesma, E. (2021). Predicting into unknown space? Estimating the area of
  applicability of spatial prediction models. *Methods in Ecology and Evolution* 12, 1620–1633.
- Ploton, P. et al. (2020). Spatial validation reveals poor predictive performance of
  large-scale ecological mapping models. *Nature Communications* 11, 4540.
- Lundberg, S. et al. (2020). From local explanations to global understanding with explainable
  AI for trees. *Nature Machine Intelligence* 2, 56–67.
- Bhitarkanika field biomass (AGB 318.79 ± 44.42 t/ha):
  [record](https://ouci.dntb.gov.ua/en/works/4N6e2be4/)
