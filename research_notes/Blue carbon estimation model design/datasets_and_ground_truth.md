# Free Reference and Ground-Truth Datasets for a Satellite Blue-Carbon Model in India (mangrove, seagrass, tidal saltmarsh), focused on Google Earth Engine

How the IDs were checked: every `projects/sat-io/...` ID below that is marked **[verified]** was matched against the master index of the awesome-gee-community-catalog (`community_datasets.csv` in github.com/samapriya/awesome-gee-community-datasets, downloaded 2026-10-08). Official catalog IDs marked **[verified]** were checked against the Earth Engine catalog page or its STAC JSON. IDs marked **[UNVERIFIED]** come from memory or secondary text and must be checked before use.

---

## 1. Mangrove above-ground biomass (AGB) and canopy height: Simard 2019, TanDEM-X 2015, CTrees and related products

### Takeaway
The Simard et al. 2019 AGB, Hba and Hmax maps are in GEE through the community catalog (`projects/sat-io/open-datasets/global_mangrove_distribution/...`). They represent **nominal year 2000**, so they are stale for 2020s monitoring. The newer Simard 12 m TanDEM-X height map (nominal **2015**, GEDI-calibrated) is also in GEE (`projects/sat-io/open-datasets/GLOBAL_MANGROVE_HT_TANDEMX`). A companion table of GEDI L2A mangrove footprint heights (2019–2022) is the closest thing to a ready-made mangrove height label set.

### Cited Findings
- ORNL DAAC dataset "Global Mangrove Distribution, Aboveground Biomass, and Canopy Height", version 1.3, DOI 10.3334/ORNLDAAC/1665, 30 m, **nominal year 2000** (temporal extent listed 2000-01-01 to 2014-08-03), bounding box 31.0°N to 39.0°S, global. It used region-specific allometry that relates plot AGB to basal-area-weighted height (Hba) and maximum canopy height (Hmax). The data are "openly shared without restriction" under EOSDIS data-use guidance. The page gives no RMSE. — [NASA Earthdata / ORNL DAAC 1665](https://www.earthdata.nasa.gov/data/catalog/ornl-cloud-cms-global-map-mangrove-canopy-1665-1.3)
- GEE community IDs for this product **[verified]**, all with licence listed as CC0 1.0:
  - `projects/sat-io/open-datasets/global_mangrove_distribution/agb` (ImageCollection, AGB)
  - `projects/sat-io/open-datasets/global_mangrove_distribution/hba95` (basal-area-weighted height)
  - `projects/sat-io/open-datasets/global_mangrove_distribution/hmax95` (maximum canopy height)
  - `projects/sat-io/open-datasets/global_mangrove_distribution/americas_tree_measurements` (in-situ tree table, Americas only, so not useful for India)
  - Source: [awesome-gee-community-datasets CSV](https://raw.githubusercontent.com/samapriya/awesome-gee-community-datasets/master/community_datasets.csv); docs page [gee-community-catalog.org/projects/gmd](https://gee-community-catalog.org/projects/gmd/)
- The catalog notes that the height layers were capped at the 95th percentile ("hba95/hmax95") and that countries without Hba/Hmax data were omitted. The paper is Simard et al. 2019, *Nature Geoscience*, "Mangrove canopy height globally related to precipitation, temperature and cyclone frequency". Precipitation, temperature and cyclone frequency explain 74% of global trends in maximum canopy height. — [GEE community catalog GMD (search summary)](https://gee-community-catalog.org/projects/gmd/)
- **Updated height product:** "CMS: Global Mangrove Canopy Height Maps Derived from TanDEM-X, 2015", Simard et al. 2024, ORNL DAAC, DOI 10.3334/ORNLDAAC/2251. It is ~12 m (0.000111°), **nominal year 2015**, covers 34°N to 39°S in 1,443 1°×1° GeoTIFF tiles, and was calibrated and validated with GEDI lidar. The catalog page reports no RMSE. Licence: NASA open data, "openly shared, without restriction". — [GEE community catalog: mangrove_ht_tandemx](https://gee-community-catalog.org/projects/mangrove_ht_tandemx/)
  - GEE ID `projects/sat-io/open-datasets/GLOBAL_MANGROVE_HT_TANDEMX` (ImageCollection) **[verified]**
  - GEE ID `projects/space-geographer/assets/GEDI_MANGROVE_HT` (table of GEDI L2A mangrove heights, 2019-04-18 to 2022-05-22) **[verified]** — [same page](https://gee-community-catalog.org/projects/mangrove_ht_tandemx/); [CSV](https://raw.githubusercontent.com/samapriya/awesome-gee-community-datasets/master/community_datasets.csv)
- Other global canopy-height and AGB layers in GEE that can serve as covariates or cross-checks (not mangrove-specific) **[verified IDs]**:
  - `projects/sat-io/open-datasets/CTREES-GLOBAL-AGB-100M` ("CTrees Global Aboveground Biomass 100m (2000-2025)", CC-BY-4.0)
  - `users/nlang/ETH_GlobalCanopyHeight_2020_10m_v1` and `users/nlang/ETH_GlobalCanopyHeightSD_2020_10m_v1` (ETH 10 m canopy height, 2020)
  - `projects/sat-io/open-datasets/GLAD/GEDI_V27` (GLAD Global Forest Canopy Height from GEDI & Landsat)
  - `projects/sat-io/open-datasets/facebook/meta-canopy-height` (Meta 1 m canopy height)
  - `projects/sat-io/open-datasets/tallo_database` (Tallo global tree allometry and crown database, CC-BY-4.0)
  - Source for all: [community catalog CSV](https://raw.githubusercontent.com/samapriya/awesome-gee-community-datasets/master/community_datasets.csv)

### Inferences
- For labels in the 2020s, use Simard 2019 AGB only as a prior or weak label. Areas of mangrove loss or gain since 2000 (check with GMW change layers) should be masked out before training.
- The TanDEM-X 2015 heights plus the 2019–2022 GEDI mangrove footprint table are the best height labels. Height can then be converted to AGB with the Simard Hba/Hmax–AGB allometry or Indian plot allometry.
- No dedicated "GMW AGB" layer or Lagomasino product appeared in the community catalog index. Lagomasino et al. 2019 (mangrove loss emissions) is not in GEE as far as this search shows.

### Gaps
- RMSE and bias figures for Simard 2019 (often quoted as Hba RMSE ~3.6 m, AGB RMSE ~...) and for the TanDEM-X 2015 product were not on the pages fetched. Check the papers.
- Units and band names inside the sat-io AGB/height images (expected Mg/ha and m) were not confirmed. The gmd and mangrove catalog pages timed out on fetch.
- I did not verify whether the GMW portal hosts a newer mangrove AGB product (for example, GMW "biomass" layers that reuse Simard).

---

## 2. GEDI: L2A canopy height, L4A footprint AGBD, L4B 1 km gridded AGBD

### Takeaway
All GEDI v2 products are in the official GEE catalog under `LARSE/GEDI/...`. Monthly rasterised L4A runs to mid-2025. L4B is a single 1 km mean for 2019-04 to 2021-08. Indian mangroves (about 8–23°N) are well inside GEDI's ±51.6° coverage. Mangrove-specific validation is thin, and short or sparse canopies are a known weak spot.

### Cited Findings
- `LARSE/GEDI/GEDI04_B_002` **[verified]**: GEDI L4B Gridded AGBD, version 2, 1000 m, 2019-04-18 to 2021-08-04 (mission weeks 19–138). Bands: MU (mean AGBD, Mg/ha), SE (Mg/ha), PE (%), V1, V2, NC (number of ground tracks), NS (number of high-quality waveforms), QF (0 = outside domain, 1 = land, 2 = meets L1 requirement), PS (prediction stratum by plant functional type and continent), MI (mode of inference). It is public domain under the NASA Earth Science Data policy. — [GEE catalog GEDI04_B_002](https://developers.google.com/earth-engine/datasets/catalog/LARSE_GEDI_GEDI04_B_002)
- Related official IDs listed on that page **[verified]**: `LARSE/GEDI/GEDI02_A_002` (L2A vector), `LARSE/GEDI/GEDI02_A_002_MONTHLY`, `LARSE/GEDI/GEDI02_A_002_INDEX`, `LARSE/GEDI/GEDI02_B_002`, `LARSE/GEDI/GEDI02_B_002_MONTHLY`, `LARSE/GEDI/GEDI02_B_002_INDEX`, `LARSE/GEDI/GEDI04_A_002` (L4A vector), `LARSE/GEDI/GEDI04_A_002_MONTHLY`, `LARSE/GEDI/GEDI04_A_002_INDEX`, `LARSE/GEDI/GEDI04_D_002` (imputed waveforms). — [GEE catalog](https://developers.google.com/earth-engine/datasets/catalog/LARSE_GEDI_GEDI04_B_002)
- `LARSE/GEDI/GEDI04_A_002_MONTHLY` **[verified]**: 2019-03-25 to 2025-07-01, 25 m, 51.6°N–51.6°S. Bands: `agbd`, `agbd_se`, `agbd_pi_lower`, `agbd_pi_upper` (all Mg/ha), `agbd_t`, `agbd_t_se`, `l4_quality_flag`, `l2_quality_flag`, `degrade_flag`, `sensitivity`, `solar_elevation`, `beam`. The catalog's example masks to `l4_quality_flag == 1` and `degrade_flag == 0`. `algorithm_run_flag` is also described as selecting waveforms with sufficient fidelity. — [GEE catalog GEDI04_A_002_MONTHLY](https://developers.google.com/earth-engine/datasets/catalog/LARSE_GEDI_GEDI04_A_002_MONTHLY)
- In a Myanmar restored-mangrove study, the best GEDI metric (RH60) against 32 field plots reached only R² = 0.24 (RMSE 0.37 m). The authors say GEDI-fused global canopy height maps are limited "at local scales and for non-standard forest structures like mangroves". — [Search summary: Science of Remote Sensing 2025 (DOAJ)](https://doaj.org/article/d149ea1aa52146f7bf32eb40f22d2522)
- In savannas, because of GEDI's 15.6 ns pulse width, RH98 "cannot reliably estimate canopy heights of shrubs below 2.34 m". RH98 had a −0.79 m (−10%) bias for 3–7 m canopies. — [Search summary: Edinburgh RSE manuscript](https://www.pure.ed.ac.uk/ws/files/314621473/RSE_D_22_00262_R1.pdf)
- Simard's 2015 TanDEM-X mangrove map used GEDI for both training and validation, so GEDI is accepted as a mangrove height reference at global scale. — [ORNL DAAC 2251](https://daac.ornl.gov/cgi-bin/dsviewer.pl?ds_id=2251)

### Inferences
- Recommended filter for mangroves: `l4_quality_flag == 1`, `degrade_flag == 0`, plus `sensitivity > 0.95–0.98` and preferring power beams and night shots (`solar_elevation < 0`). These thresholds are common practice, not taken from a mangrove-specific source.
- L4A AGBD uses PFT/continent-stratified models, not mangrove-specific allometry. It is likely biased for South Asian mangroves. Using L2A RH95/RH98 heights as labels and applying your own height→AGB allometry is safer.
- L4B at 1 km is too coarse for narrow Indian mangrove belts (for example Gulf of Kutch, Pichavaram). Use it only as a regional sanity check.
- Footprints on tidal water or mudflat, and footprints in cells with low mangrove fraction, should be removed using a GMW 2020 mask, preferably eroded by one pixel.

### Gaps
- No peer-reviewed GEDI-vs-field validation for Indian mangroves was found.
- I did not confirm the exact `GEDI02_A_002_MONTHLY` temporal end date or band list (rh0–rh100, quality_flag, sensitivity are expected).

---

## 3. ESA CCI Biomass and other global AGB maps; Global Mangrove Watch extent and change

### Takeaway
ESA CCI Biomass **v6.0** (2007, 2010, 2015–2022, 100 m, Mg/ha with per-pixel SD) is in the official GEE catalog as `ESA/CCI/Above_Ground_Biomass/V6_0`. GMW v3 (1996–2020, 25 m) and a GMW v4 2020 extent (v4.0.19) are in the community catalog. Murray's global tidal wetland change map (1999–2019, 30 m) is in the official catalog and separates mangrove, tidal marsh and tidal flat.

### Cited Findings
- `ESA/CCI/Above_Ground_Biomass/V6_0` **[verified]**: ImageCollection with bands `agb` (Mg/ha, woody parts of living trees excluding stumps and roots) and `agb_sd` (Mg/ha SD), 100 m, years 2007, 2010, 2015–2022. Citation: Santoro & Cartus (2025), DOI 10.5285/95913ffb6467447ca72c4e9d8cf30501. The page gives no RMSE. It says the allometries were revised with GEDI and ICESat-2. — [GEE catalog ESA CCI AGB v6](https://developers.google.com/earth-engine/datasets/catalog/ESA_CCI_Above_Ground_Biomass_V6_0)
- Community copies **[verified]**: `projects/sat-io/open-datasets/ESA/ESA_CCI_AGB` and `projects/sat-io/open-datasets/ESA/ESA_CCI_AGB_DIFF` (change). Licence is custom: the ESA CCI Biomass terms at artefacts.ceda.ac.uk/licences/specific_licences/esacci_biomass_terms_and_conditions.pdf. v6.0 (April 2025) added 2007 and 2022 and aggregated 1/10/25/50 km products. — [community catalog cci_agb](https://gee-community-catalog.org/projects/cci_agb/); [CSV](https://raw.githubusercontent.com/samapriya/awesome-gee-community-datasets/master/community_datasets.csv)
- Global Mangrove Watch community IDs **[verified]**, licence CC-BY-SA-4.0:
  - `projects/sat-io/open-datasets/GMW/extent/GMW_V3` (raster extent ImageCollection, v3)
  - `projects/sat-io/open-datasets/GMW/change/change_f1996` (change raster), plus vectors `.../GMW/change/gmw_v3_f1996_t20XX_vec`
  - `projects/sat-io/open-datasets/GMW/core/gmw_v3_mng_core`, `.../GMW/union/gmw_v3_mng_union`, `.../GMW/gmw_v3_tiles`
  - `projects/sat-io/open-datasets/GMW/annual-extent/GMW_MNG_2020` ("Global Mangrove Watch 2020 Raster Extent v4.0.19") and `.../GMW_MNG_VEC_2020`
  - Source: [CSV](https://raw.githubusercontent.com/samapriya/awesome-gee-community-datasets/master/community_datasets.csv)
- GMW v3.0: Bunting et al. 2022 (*Remote Sensing*). Years 1996, 2007–2010, 2015–2020 at 25 m from JAXA L-band SAR mosaics. Extent accuracy is 87.4%, while gain and loss classes are less accurate. Global extent fell from ~152,600 km² (1996) to ~147,400 km² (2020), about −3.4%. — [Zenodo GMW v3](https://zenodo.org/record/6894273); [JAXA GMW](https://www.eorc.jaxa.jp/ALOS/en/dataset/gmw_e.htm); [community catalog mangrove page (search summary)](https://gee-community-catalog.org/projects/mangrove/)
- `JCU/Murray/GIC/global_tidal_wetland_change/2019` **[verified]**: "Murray Global Tidal Wetland Change v1.0 (1999-2019)", 30 m, CC-BY-4.0. Bands: `loss`, `lossYear`, `lossType`, `gain`, `gainYear`, `gainType` (type codes 2 = tidal flat, 3 = mangrove, 5 = tidal marsh), `twprobabilityStart`, `twprobabilityEnd`. — [EE STAC JSON](https://earthengine-stac.storage.googleapis.com/catalog/JCU/JCU_Murray_GIC_global_tidal_wetland_change_2019.json)

### Inferences
- ESA CCI is a forest product calibrated mostly on terrestrial forest. In mangroves it is a covariate or cross-check, not ground truth. Its 2015–2022 annual series is the only free multi-year AGB map that overlaps the project period.
- Use GMW v4 2020 (or GMW v3 2020) as the mangrove mask that matches the Sentinel-era imagery. GMW v3 2020 vs 2015 change can screen out unstable pixels.
- The project already uses GWL_FCS30. GMW and Murray add independent mangrove and tidal-marsh class evidence.

### Gaps
- The full GMW v4 annual series (if released beyond 2020) was not found in the community index; only the 2020 v4.0.19 layer is listed.
- No published quantitative accuracy of ESA CCI AGB over Indian mangroves was found.

---

## 4. Soil carbon: mangrove, tidal marsh, seagrass; SoilGrids limitations

### Takeaway
Two global 30 m mangrove SOC maps exist: **Sanderman et al. 2018** (nominal 2000, Harvard Dataverse) and **Maxwell et al. 2023** (year 2020, Zenodo, CC-BY). Neither is in the GEE community catalog index; both must be downloaded and uploaded as assets. A 30 m global **tidal marsh SOC** map exists (Maxwell et al. 2024, *Nature Communications*). No gridded seagrass SOC map was found. For seagrass, use field compilations such as the Coastal Carbon Library.

### Cited Findings
- **Sanderman et al. 2018**, *Environmental Research Letters* 13:055002, DOI 10.1088/1748-9326/aabe1c, "A global map of mangrove forest soil carbon at 30 m spatial resolution". The machine-learning model used SoilGrids250m as a prior and explains 63% of SOC density variability (RMSE 10.9 kg m⁻³). The map gives ~6.4 Pg C in the top 1 m over the 2000 mangrove extent, with 2000–2015 losses of 30–122 Tg C. Data: Harvard Dataverse DOI 10.7910/DVN/OCYUIT. The licence is listed as CC0 in UNEP GeoNetwork (confirm on Dataverse). — [ISRIC news](https://www.isric.org/news/a-global-map-of-mangrove-forest-soil-carbon-at-30-m-spatial-resolution/); [UNEP GeoNetwork record](https://datacore-gn.unepgrid.ch/geonetwork/srv/api/records/4b2f0fab-fc1a-4231-998c-79b5b804915b); [DOAJ](https://doaj.org/article/87b81bbbcfa842a68f4f006bc6cc87c6)
- **Maxwell et al. 2023**, *Data in Brief* 50:109621, DOI 10.1016/j.dib.2023.109621, "Global mangrove soil organic carbon stocks dataset at 30 m resolution for the year 2020 based on spatiotemporal predictive machine learning". Training used 10,331 validated soil samples. It predicts SOC %, bulk density and aggregated SOC stock (t/ha) for 0–100 cm, with prediction intervals. Download: Zenodo DOI 10.5281/zenodo.7729491 (v1.2, ~5.9 GB, file `mangroves_tiles_SOC_predictions_2020.zip`), CC-BY, also as Cloud-Optimized GeoTIFFs. — [Zenodo 7729491](https://zenodo.org/record/7729491); [DOAJ Data in Brief](https://doaj.org/article/290ad2f1652d4514b36ab5ee3f64d50b)
  - The task brief cites "Maxwell et al. 2023 (Nature)". The search found only the *Data in Brief* dataset paper and could not confirm a *Nature* mangrove SOC paper by that name.
- **Maxwell et al. 2024**, *Nature Communications*, "Soil carbon in the world's tidal marshes", DOI 10.1038/s41467-024-54572-9, 30 m. It used 3,710 training locations and the Worthington tidal marsh extent. Results: 1.44 Pg C to 1 m globally (one third in the USA). Mean stocks are 83.1 Mg C/ha for 0–30 cm (average predicted error 44.8) and 185.3 Mg C/ha for 30–100 cm (error 105.7). CC-BY-4.0. — [IIASA PURE](https://pure.iiasa.ac.at/20151); [DOAJ](https://doaj.org/article/03c338fcbbd64553870cef759d5c3d00)
- **Coastal Carbon Library and Atlas** (Smithsonian CCN, *Global Change Biology* 2024): 6,723 soil profiles across marshes, mangroves, tidal freshwater forests and seagrasses. The Atlas is an R-shiny app to query and download. The authors flag under-representation outside the USA and for mangroves and seagrasses. — [SERC/Smithsonian](https://serc.si.edu/node/41635); [USGS pubs](https://pubs.usgs.gov/publication/70251050)
- An example regional mangrove SOC map is in GEE: `projects/sat-io/open-datasets/INDUS_DELTA_SOC/indusdelta_mangrove_soc2020` and `..._soc_uncertainity2020` (Indus Delta, Pakistan, 2020, CC-BY-4.0) **[verified]**. It is the nearest geographic analogue to the Gulf of Kutch. — [CSV](https://raw.githubusercontent.com/samapriya/awesome-gee-community-datasets/master/community_datasets.csv)
- SoilGrids in GEE: `projects/soilgrids-isric/soc_mean` **[verified]**. FAO GSOCmap 1.5: `projects/earthengine-legacy/assets/projects/sat-io/open-datasets/FAO/GSOCMAP1-5-0` **[verified]**, CC-BY-NC-SA-4.0 (the non-commercial clause matters for a registry). — [CSV](https://raw.githubusercontent.com/samapriya/awesome-gee-community-datasets/master/community_datasets.csv)

### Inferences
- SoilGrids is a 250 m terrestrial model with few coastal wetland profiles. Sanderman used it only as a prior and still needed mangrove-specific data. Expect SoilGrids to underestimate mangrove and marsh SOC, and avoid using it as a label.
- For a 2020s project, Maxwell 2023 (year 2020, with prediction intervals) is the preferred mangrove SOC reference. Sanderman 2018 is useful for comparison.
- Seagrass carbon is best handled as per-hectare stock factors from field compilations times mapped extent, not by pixel regression.

### Gaps
- Fourqurean et al. 2012 (*Nature Geoscience*) seagrass carbon dataset and Kennedy et al. 2010: no download link or licence verified in this session.
- How many Coastal Carbon Library profiles fall in India was not determined.
- Whether anyone has uploaded Sanderman 2018, Maxwell 2023 or Maxwell 2024 to a public GEE asset: none appear in the community catalog index (searched "mangrove", "marsh", "soil carbon").

---

## 5. Tidal marsh and seagrass extent maps relevant to India

### Takeaway
The best tidal marsh extent map is Worthington et al. 2024 (10 m, year 2020). It is not in the community GEE catalog index and must be downloaded. Murray 2019 (in GEE) gives tidal-marsh class change. Seagrass extent for India relies on UNEP-WCMC v7.1 points and polygons, plus Allen Coral Atlas benthic classes where reefs are mapped (Gulf of Mannar, Palk Bay, Lakshadweep, Andaman, Gulf of Kutch).

### Cited Findings
- Worthington et al. 2024, *Global Ecology and Biogeography* 33(8): e13852, DOI 10.1111/geb.13852, CC-BY. It is a 10 m random-forest tidal marsh map for **2020**, 60°N–60°S, overall accuracy 0.85. Global extent is 52,880 km² (95% CI 32,030–59,780) across 120 countries, 45% in the temperate N. Atlantic. — [IIASA PURE](https://pure.iiasa.ac.at/19732/); [TNC Conservation Gateway](https://www.conservationgateway.org/collections/ocean/distribution-global-tidal-marshes-earth-observation/)
- UNEP-WCMC & Short (2021) Global Distribution of Seagrasses v7.1, DOI 10.34892/x6r3-d211. It has point and polygon layers and is available via the UNEP-WCMC Ocean Data Viewer (data.unep-wcmc.org/datasets/7). Commercial use requires contacting UNEP-WCMC. — [BIOPAMA AKP listing](https://africa-knowledge-platform.ec.europa.eu/node/45684); [Copernicus Marine](https://data.marine.copernicus.eu/product/EXT_UNEP_WCMC_SEAGRASSES)
- Murray tidal wetland change in GEE (tidal marsh class code 5): see section 3. — [EE STAC](https://earthengine-stac.storage.googleapis.com/catalog/JCU/JCU_Murray_GIC_global_tidal_wetland_change_2019.json)

### Inferences
- Indian saltmarsh is small and patchy (Gulf of Kutch, Sundarbans fringes). Worthington's global map will probably have low recall there. Treat it as a candidate mask that needs local checking.
- The UNEP-WCMC polygons are compiled from mixed-date surveys and are not a 2020 map. Use them for presence or sampling, not for area accounting.

### Gaps
- No GEE asset ID found for Worthington 2024 or for UNEP-WCMC seagrass. The Allen Coral Atlas official ID (believed to be `ACA/reef_habitat/v2_0`) is **[UNVERIFIED]** in this session; the project already uses it.
- No India-specific seagrass map in GEE was found.

---

## 6. Indian field datasets and official estimates

### Takeaway
No open, downloadable plot-level biomass dataset for Indian mangroves was found in Zenodo, Dryad, Pangaea or Mendeley searches. Plot data sits in papers and supplements, so labels will need to come from published plot means or from contacting authors. ISFR 2023 gives official mangrove area (4,991.68 km²) but its carbon figures are forest-wide.

### Cited Findings
- Bhitarkanika: mean stand biomass 436.89 ± 59.75 t/ha (AGB 318.79 ± 44.42, BGB 118.10 ± 15.39). A separate study used 42 plots with species-specific and common allometric equations. — [OUCI record: Bhitarkanika stand biomass](https://ouci.dntb.gov.ua/en/works/4N6e2be4/)
- Sundarbans (India): an ecosystem-carbon study reports stocks from 159.49 ± 6.86 Mg/ha (Gewa-Goran type) to 360.01 ± 22.71 Mg/ha. Other studies cite total biomass ~25.17 Tg (67.34% AGB). Sundarbans studies often use Komiyama 2005 or Chave 2005 common equations because of species richness. — [ResearchGate: Sundarbans carbon stock](https://www.researchgate.net/publication/280315547_Carbon_stock_in_the_Sundarbans_mangrove_forest_spatial_variations_in_vegetation_types_and_salinity_zones); [Academia: Sundarbans carbon](https://www.academia.edu/49237078/Carbon_stock_and_storage_pattern_in_the_Sundarbans_mangrove_forest_NE_coast_of_India)
- Bichitrapur (Odisha): 20 plots of 20 × 25 m, with mean total biomass 165.31 ± 20.89 t/ha in young stands. — (search summary only; primary not fetched)
- A review, "Carbon stocks and sequestration potential of Indian mangroves", notes that Bhitarkanika, Pichavaram and the Sundarbans are well studied while other regions are under-studied. — [ResearchGate](https://www.researchgate.net/publication/322732347_Carbon_stocks_and_sequestration_potential_of_Indian_mangroves)
- Caution: one popular article gives Bhitarkanika biomass of ~1,100–1,150 Mg/ha with no primary citation. That is inconsistent with the plot studies; do not use it. — [India Water Portal](https://www.indiawaterportal.org/environment/carbon-vaults-of-the-coast-unlocking-indias-mangrove-potential)
- ISFR 2023 (FSI): mangrove cover 4,991.68 km² (0.15% of geographic area), −7.43 km² vs 2021. Gujarat lost 36.39 km²; Andhra Pradesh gained 13.01 and Maharashtra 12.39. Mangroves occur in 9 states and 3 UTs. Total forest carbon is 7,285.5 Mt (SOC 55.06%, AGB 32.69%), but no mangrove-specific carbon figure appeared in the summaries. These are secondary summaries; verify against the FSI report. — [ClearIAS](https://www.clearias.com/india-state-of-forest-report-2023/); [PMF IAS](https://www.pmfias.com/india-state-of-forest-report-2023/)
- Multi-sensor mangrove AGB estimation in India appears in *J. Indian Soc. Remote Sensing* (2024). Not examined. — [Springer](https://link.springer.com/article/10.1007/s12524-024-01811-7)

### Inferences
- A practical label strategy: (a) GEDI L2A heights (2019+) in GMW-2020 mangroves, (b) converted to AGB using Indian or regional allometry, (c) checked against published Indian site means (Bhitarkanika ~319 Mg/ha AGB, Sundarbans types 160–360 Mg C/ha ecosystem) as range checks.

### Gaps
- Pichavaram, Godavari-Krishna, Gulf of Kutch and Andaman plot data were not found in open repositories in this search.
- No India entries were confirmed in Pangaea, Dryad, Zenodo or Mendeley Data.
- The ISFR mangrove-specific carbon stock (if reported) was not found.

---

## 7. Mangrove allometric equations, root:shoot ratios, wood density

### Takeaway
Komiyama et al. 2005 (*J. Tropical Ecology*) common equations use wood density (ρ) and DBH (D) and are the standard fallback for mixed Indian stands. Species-specific Indian equations exist in the literature but were not verified here.

### Cited Findings
- Komiyama, Poungparn & Kato 2005, *Journal of Tropical Ecology*: built from 104 trees of 10 species in Southeast Asia. The common above-ground equation is **AGB (kg) = 0.251 ρ D^2.46** (ρ in g/cm³, D in cm). — [Durham repository: ERL 2021 comparison of mangrove allometric models](https://durham-repository.worktribe.com/preview/1221482/34655.pdf); [ResearchGate: Komiyama common equations](https://www.researchgate.net/publication/259363540_Common_allometric_equations_for_estimating_the_tree_weight_of_mangroves)
- Komiyama, Ong & Poungparn 2008 review, "Allometry, biomass, and productivity of mangrove forests", *Aquatic Botany*. — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0304377007001829)
- An ERL 2021 letter compares mangrove allometric models with and without species and structural information. — [IOP ERL](https://iopscience.iop.org/article/10.1088/1748-9326/ac31ee)
- Tallo global tree allometry database is in GEE: `projects/sat-io/open-datasets/tallo_database` (CC-BY-4.0) **[verified]**. — [CSV](https://raw.githubusercontent.com/samapriya/awesome-gee-community-datasets/master/community_datasets.csv)

### Inferences
- Use Komiyama 2005 common AGB, plus the companion common root equation (often cited as 0.199 ρ^0.899 D^2.22 — **UNVERIFIED in this session**), with species wood densities from the Global Wood Density Database (Zanne et al. 2009, Dryad — **UNVERIFIED link**).

### Gaps
- Species-specific equations for *Avicennia marina*, *Rhizophora mucronata*, *Excoecaria agallocha* and *Heritiera fomes* were not verified.
- No source verified for mangrove root:shoot ratios. IPCC 2013 Wetlands Supplement default ratios are an option but were not checked.

---

## 8. Licences and terms for academic use (summary)

### Takeaway
Most layers are open (public domain, CC0 or CC-BY). Watch out for **CC-BY-SA** (GMW: derivatives must be share-alike), **CC-BY-NC-SA** (FAO GSOCmap: non-commercial), the **custom ESA CCI terms**, and UNEP-WCMC seagrass (commercial use needs permission). The non-commercial and permission-based ones matter if the registry is ever commercial.

### Cited Findings
- GEDI L4B: public domain, no restriction. — [GEE catalog](https://developers.google.com/earth-engine/datasets/catalog/LARSE_GEDI_GEDI04_B_002)
- ORNL DAAC Simard 2019 and TanDEM-X 2015: openly shared without restriction; Simard 2019 sat-io copy listed as CC0. — [Earthdata](https://www.earthdata.nasa.gov/data/catalog/ornl-cloud-cms-global-map-mangrove-canopy-1665-1.3); [CSV](https://raw.githubusercontent.com/samapriya/awesome-gee-community-datasets/master/community_datasets.csv)
- GMW v3/v4: CC-BY-SA-4.0. ESA CCI AGB: custom CEDA terms. CTrees AGB: CC-BY-4.0. FAO GSOCmap: CC-BY-NC-SA-4.0. Indus SOC: CC-BY-4.0. — [CSV](https://raw.githubusercontent.com/samapriya/awesome-gee-community-datasets/master/community_datasets.csv)
- Murray tidal wetland change: CC-BY-4.0. — [EE STAC](https://earthengine-stac.storage.googleapis.com/catalog/JCU/JCU_Murray_GIC_global_tidal_wetland_change_2019.json)
- Maxwell 2023 mangrove SOC: CC-BY. Maxwell 2024 tidal marsh SOC paper: CC-BY-4.0. Worthington 2024: CC-BY. — [Zenodo](https://zenodo.org/record/7729491); [IIASA](https://pure.iiasa.ac.at/20151); [IIASA](https://pure.iiasa.ac.at/19732/)
- Earth Engine itself is free for research, education and non-profit use. — [GEE catalog ESA CCI page](https://developers.google.com/earth-engine/datasets/catalog/ESA_CCI_Above_Ground_Biomass_V6_0)

### Inferences
- An academic project can use all of the above with attribution. A future commercial carbon registry would need to re-check GSOCmap (NC), UNEP-WCMC seagrass and the ESA CCI terms.

### Gaps
- Licences for the Worthington 2024 data files themselves (as opposed to the paper) and the Harvard Dataverse licence for Sanderman 2018 were not confirmed directly.
