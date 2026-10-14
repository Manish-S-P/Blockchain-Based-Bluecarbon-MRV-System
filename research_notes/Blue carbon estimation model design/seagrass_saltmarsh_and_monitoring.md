# Seagrass and tidal saltmarsh carbon estimation, and how quarterly monitoring should feed annual crediting

Notes compiled 2026-10-08. The primary documents were read in full text: the IPCC 2013 Wetlands Supplement Ch. 4 PDF and the VM0033 v2.1 PDF (4 Sept 2023). Other items come from abstracts or search summaries and are marked as such.

## Q1. Seagrass: what remote sensing can see, satellite biomass, and typical stocks and burial rates (including India)

### Takeaway
Sentinel-2 can map seagrass extent and percent cover reliably only in optically shallow water, about 0–5 m in turbid water and up to about 15–40 m in clear water, with typical overall accuracy of 70–90%. Satellites cannot see seagrass sediment carbon, which is most of the stock. The defensible approach is satellite-confirmed area (and cover) multiplied by a sequestration rate: the IPCC Tier 1 default is 0.43 t C/ha/yr (95% CI 0.2–0.7, n=6 only), and India-specific data are sparse and low.

### Cited Findings
**Remote sensing of extent and condition**
- Traganos et al. 2018 (Remote Sensing 10:1227) used Google Earth Engine, Sentinel-2, a support vector machine classifier and a composite of 1,045 Sentinel-2 tiles at 10 m. They mapped about 2,510 km² of *Posidonia oceanica* in Greek waters within a 40,951 km² area at 0–40 m depth, with 72% overall accuracy against independent field data. — [MDPI PDF](https://mdpi-res.com/d_attachment/remotesensing/remotesensing-10-01227/article_deploy/remotesensing-10-01227.pdf); [DLR record](https://elib.dlr.de/121352)
- Traganos et al. 2022 (Frontiers in Marine Science) scaled this up to 279,186 Sentinel-2 images (2015–2019) and 62,928 human-labelled training pixels. They mapped 19,020 km² of *P. oceanica* across 22 Mediterranean countries, again at about 72% overall accuracy. — [Frontiers 10.3389/fmars.2022.871799](https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2022.871799/pdf)
- Turbid water (Western Baltic, *Zostera marina*; Kuhwald et al. 2022, Remote Sensing in Ecology and Conservation): balanced accuracy stayed above 0.82 in 0–4 m of water and fell below 0.8 near the optically-deep boundary at about 5 m. The authors say Sentinel-2 is useful for seagrass from 0 to about 5 m. A related Kiel study found that the choice of atmospheric correction (ACOLITE, Sen2Cor or iCOR) changed derived depths by up to 2.5 m on average. — [GEOMAR PDF](https://oceanrep.geomar.de/id/eprint/54569/7/Kuhwald_Schubert_2022_RSEC.pdf); [CERF summary](https://forum.cerf.science/t/kuhwald-et-al-2021-how-can-sentinel-2-contribute-to-seagrass-mapping-in-shallow-turbid-baltic-sea-waters/179)
- An East African Sentinel-2 study mapped seagrass to 15 m depth with 73–89% overall accuracy, using a mask for turbid zones (search summary; [EGU2020-8451](https://meetingorganizer.copernicus.org/EGU2020/EGU2020-8451.html)). Below the optical limit, acoustic methods (sonar) are needed. — [Survey, arXiv 1902.11114](https://arxiv.org/pdf/1902.11114)
- Allen Coral Atlas facts:
  - It is built mainly from PlanetScope imagery (about 1.17M Dove images plus 1.05M Sentinel-2 scenes, 2018–2020) at 5 m resolution. — [GEE catalog ACA v2.0](https://developers.google.com/earth-engine/datasets/catalog/ACA_reef_habitat_v2_0)
  - Average reported accuracy is about 69% for geomorphic classes and 66% for benthic classes, falling to 20–67% in a New Caledonia validation. — [Living Oceans Foundation](https://www.livingoceansfoundation.org/publication/evaluation-of-the-allen-coral-atlas-benthic-habitat-map-product-for-new-caledonia-using-representative-habitat-observations-from-a-multi‑species-fishery-assessment/)
  - It covers reef areas only, and I found no seagrass-specific accuracy figure.

**Estimating seagrass biomass or carbon from satellites (aboveground only)**
- Wicaksono and colleagues (UGM, 2025, *Remote Sensing Applications: Society and Environment*) built a model from Sentinel-2 reflectance through percent cover to aboveground carbon (AGC) for intertidal meadows:
  - The best model, a support vector machine, had RMSE of 6.28–13.97 g C m⁻² and r of 0.69–0.83.
  - Across 13 Indonesian sites over 36 months, AGC peaked in May–June and was lowest in September–October, which is a strong seasonal cycle.
  - A Pari Island AGC model performed poorly (random forest R² 0.21–0.24; stepwise R² 0.15).
  - Source: [UGM repository](https://ir.lib.ugm.ac.id/id/eprint/26318/); [Pari Island](https://ir.lib.ugm.ac.id/id/eprint/26330/) (abstract-level)
- IPCC Tier 1 assumes no net change in biomass for non-woody coastal vegetation (seagrass and many tidal marshes): "increase in biomass stocks in a single year is assumed equal to biomass losses from mortality in that same year." Biomass changes for seagrass and tidal marsh are reported only at Tier 2 or higher. — [IPCC 2013 Wetlands Supplement Ch.4](https://www.ipcc-nggip.iges.or.jp/public/wetlands/pdf/Wetlands_separate_files/WS_Chp4_Coastal_Wetlands.pdf)
- IPCC root:shoot ratios (R) for seagrass (Table 4.10): tropical 1.71 (CI 1.5–1.9, n=396), subtropical 2.4 (2.3–2.6, n=391), temperate 1.3 (1.1–1.5, n=91). — [IPCC Ch.4](https://www.ipcc-nggip.iges.or.jp/public/wetlands/pdf/Wetlands_separate_files/WS_Chp4_Coastal_Wetlands.pdf)

**Stocks and burial rates (global defaults)**
- **Verified:** the IPCC 2013 Wetlands Supplement Table 4.12 removal factor for seagrass revegetation is **−0.43 t C ha⁻¹ yr⁻¹** (95% CI of the geometric mean 0.2–0.7; range 0.09–1.12; **n=6**; sources Mateo & Romero 1997 and Serrano et al. 2012, both Mediterranean *Posidonia*). — [IPCC Ch.4 Table 4.12](https://www.ipcc-nggip.iges.or.jp/public/wetlands/pdf/Wetlands_separate_files/WS_Chp4_Coastal_Wetlands.pdf)
- IPCC Table 4.11 gives seagrass soil carbon stock (mineral soils) of **108 t C/ha** (95% CI 84–139; range 9.1–829; n=89). The Tier 1 assumption is that all seagrass soils are mineral. — [IPCC Ch.4](https://www.ipcc-nggip.iges.or.jp/public/wetlands/pdf/Wetlands_separate_files/WS_Chp4_Coastal_Wetlands.pdf)
- IPCC Tier 1 rules for revegetation:
  - Apply the removal factor only where vegetation is re-established by direct planting or seeding. Recolonisation without planting gets **EF = 0**.
  - Apply it only once the seagrass, marsh or mangrove canopy covers **at least 10%** of the area.
  - Reporting on seagrass revegetation is required "only if necessary data are available."
  - Source: [IPCC Ch.4](https://www.ipcc-nggip.iges.or.jp/public/wetlands/pdf/Wetlands_separate_files/WS_Chp4_Coastal_Wetlands.pdf)
- Fourqurean et al. 2012 (Nature Geoscience 5:505–509) compiled data from 946 meadows. The global seagrass organic carbon pool could be up to 19.9 Pg, or a more conservative 4.2–8.4 Pg. Current loss rates could release up to 299 Tg C/yr. — [FIU PDF](https://seagrass.fiu.edu/resources/publications/Reprints/Fourqurean%20et%20al%202012%20Nature%20Geoscience%20online.pdf); [FIU record](https://discovery.fiu.edu/display/pub102409)
- European measured accumulation rates are about 25 g C m⁻² yr⁻¹ (0.25 t C/ha/yr) for NE Atlantic seagrass. These are "markedly below IPCC Tier 1" for non-*Posidonia* seagrass. — [EEA ETC-BE working paper](https://www.eionet.europa.eu/etcs/etc-be/products/etc-be-products/etc-be-working-paper-carbon-accumulation-rates-and-protected-area-networks-for-europe2019s-saltmarshes-and-seagrasses-meadows) (search summary)

**India**
- Indian seagrass covers about 500 km² (Palk Bay, Gulf of Mannar, Andaman and Nicobar). Annual losses are 0.7–7%, and national storage is estimated at about 6.7 Tg C (Rangesh et al., Indian Journal of Geo-Marine Sciences 54(10), 2025). — [NISCPR](https://or.niscpr.res.in/index.php/IJMS/article/view/18633)
- A second source gives about 517 km², mostly in the Gulf of Mannar and Palk Bay. In Palk Bay, sites with more built-up area had about 43% lower sediment organic carbon and about 26% lower seagrass biomass (Frontiers in Marine Science 2025). — [Frontiers 10.3389/fmars.2025.1690700](https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2025.1690700/full)
- Kaladharan et al. 2020 (Indian Journal of Fisheries 67(4):149–153) estimated seagrass blue carbon stocks of about 0.001782 Tg C (Gulf of Mannar) and 0.043996 Tg C (Palk Bay) from sediment cores. Carbon density was higher in deeper layers than at the surface. Per-hectare values were not in the abstract. — [ICAR epubs](https://epubs.icar.org.in/index.php/IJF/article/view/98101); [CMFRI eprint](https://eprints.cmfri.org.in/14775/)
- Kaladharan et al. 2021 (Fishery Technology) measured seagrass sediment organic carbon in the **top 30 cm**: **Chilika 2.018 ± 0.673 Mg C/ha** and **Pulicat 0.998 ± 0.418 Mg C/ha** (2018–2019). — [ICAR epubs](https://epubs.icar.org.in/index.php/FT/article/view/113490); [CMFRI](https://eprints.cmfri.org.in/15215/)
- A SERB-funded project (2023–2026, Presidency University) is dating ²¹⁰Pb and ¹⁴C to measure sequestration rates in Chilika seagrass, Chandipur salt marsh and Sundarbans mangroves. It had not published results at the time of the source page. — [India Science & Technology](https://www.indiascienceandtechnology.gov.in/research/carbon-storage-seagrass-and-mangrove-habitats-india-and-its-implications-global-estimates-blue)

### Inferences
- Indian seagrass sediment stocks, roughly 1–2 Mg C/ha in the top 30 cm for Chilika and Pulicat, are far below the IPCC default of 108 t C/ha for 1 m. An Indian project applying the global 0.43 t C/ha/yr would probably overstate removals. The conservative choice is the lower 95% bound of 0.2 t C/ha/yr, or the European measured value of about 0.25.
- Satellite AGC models track seasonal biomass swings, with a May–June peak and a September–October trough in Indonesia. Quarterly seagrass "carbon" from Sentinel-2 would mostly reflect seasonal noise, not sequestration. It should be used only for extent and condition (the cover ≥10% gate), not as a carbon stock.
- In Gulf of Mannar and Palk Bay waters, the Sentinel-2 extent mask should be limited to optically shallow pixels, about 0–5 m unless local clarity data justify deeper. Use GEE composites (median, low-tide and low-turbidity scene selection), and treat deeper areas as "not monitored," so they get zero credit.

### Gaps
- I did not retrieve per-hectare stocks or burial rates (²¹⁰Pb) for Gulf of Mannar, Palk Bay, Andaman or Lakshadweep seagrass. Ganguly et al. 2017 and Ragavan et al. papers were not found in this pass.
- I could not open the Fourqurean 2012 full text (403), so its per-hectare mean (often quoted as about 194 Mg C/ha) is **unverified**.
- I found no seagrass-specific Allen Coral Atlas accuracy figure.

## Q2. Tidal saltmarsh: Sentinel and Landsat biomass models, soil carbon accumulation rates, and Indian saltmarsh carbon data

### Takeaway
Aboveground marsh biomass can be estimated from Landsat or Sentinel data with about 10% normalised RMSE when field calibration is available (Byrd et al. 2018). Soil carbon, which dominates the stock, must come from default rates or cores: IPCC Tier 1 is 0.91 t C/ha/yr (CI 0.7–1.1) and VM0033 is 1.46 t C/ha/yr. Indian saltmarsh carbon data are thin and come almost entirely from the east coast.

### Cited Findings
- **Byrd et al. 2018** (ISPRS J. Photogramm. Remote Sens. 139:255–271, doi:10.1016/j.isprsjprs.2018.03.019):
  - It calibrated a national tidal marsh aboveground biomass model across six US regions and tested Sentinel-1 C-band SAR, Landsat and NAIP with random forest.
  - The final model used six Landsat vegetation indices (SAVI most important) and achieved RMSE of 310 g/m², normalised RMSE 10.3%, n=409.
  - Scaling field biomass by NAIP green-vegetation fraction improved results.
  - Plant carbon averaged 44.1% of biomass.
  - Source: [USGS pub](https://pubs.usgs.gov/publication/70196478); [USGS summary](https://www.usgs.gov/publications/a-remote-sensing-based-model-tidal-marsh-aboveground-carbon-stocks-conterminous-united)
- Campbell & Fatoyinbo 2024 (J. Appl. Remote Sens. 18(3):032404) used Sentinel-1/2 for 10 m salt marsh aboveground biomass across the contiguous US with XGBoost, random forest and SVM. They estimated about 3.6 Tg aboveground carbon in CONUS salt marshes. RMSE was not retrieved. — [SPIE](https://journals.spiedigitallibrary.org/journals/journal-of-applied-remote-sensing/volume-18/issue-03/032404/Mapping-aboveground-biomass-and-carbon-in-salt-marshes-across-the/10.1117/1.JRS.18.032404.full); [ORNL DAAC](https://daac.ornl.gov/CMS/guides/Salt_Marsh_Biomass_CONUS.html)
- Woltz et al. 2023 extended this work to belowground biomass and NPP maps for US tidal wetlands. — [USGS](https://www.usgs.gov/publications/above-and-belowground-biomass-carbon-stock-and-net-primary-productivity-maps-tidal)
- **Verified:** the IPCC Table 4.12 removal factor for tidal marsh is **−0.91 t C ha⁻¹ yr⁻¹** (95% CI 0.7–1.1; range 0.05–4.65; n=66; mostly US sources). The same table gives mangrove as −1.62 (1.3–2.0; n=69). — [IPCC Ch.4](https://www.ipcc-nggip.iges.or.jp/public/wetlands/pdf/Wetlands_separate_files/WS_Chp4_Coastal_Wetlands.pdf)
- IPCC Table 4.11 tidal marsh soil carbon stocks: organic soils 340 t C/ha (315–366, n=35); mineral soils about 226 t C/ha (202–252; range 15.6–623; n=82). — [IPCC Ch.4](https://www.ipcc-nggip.iges.or.jp/public/wetlands/pdf/Wetlands_separate_files/WS_Chp4_Coastal_Wetlands.pdf)
- IPCC root:shoot ratios for tidal marsh (Table 4.9): Mediterranean 3.63, subtropical 3.65, temperate 2.11, temperate freshwater tidal 1.15. — [IPCC Ch.4](https://www.ipcc-nggip.iges.or.jp/public/wetlands/pdf/Wetlands_separate_files/WS_Chp4_Coastal_Wetlands.pdf)
- IPCC Tier 1 methane: rewetting with salinity above 18 ppt has CH₄ EF = 0. Fresh or brackish water below 18 ppt has 193.7 kg CH₄ ha⁻¹ yr⁻¹ (CI 99.8–358). — [IPCC Ch.4 Table 4.14](https://www.ipcc-nggip.iges.or.jp/public/wetlands/pdf/Wetlands_separate_files/WS_Chp4_Coastal_Wetlands.pdf)
- Measured European saltmarsh accumulation is about 88 g C m⁻² yr⁻¹ (0.88 t C/ha/yr), with Baltic marshes well below Tier 1. A Pacific Canada study measured 146 ± 102 g C m⁻² yr⁻¹. California rates were 39.2–130 g C m⁻² yr⁻¹. — [EEA ETC-BE](https://www.eionet.europa.eu/etcs/etc-be/products/etc-be-products/etc-be-working-paper-carbon-accumulation-rates-and-protected-area-networks-for-europe2019s-saltmarshes-and-seagrasses-meadows); [ScienceBase](https://sciencebase.gov/catalog/folder/6a1f1d19b66b0128094dffda) (search summaries)
- **India:**
  - Saltmarsh carbon studies are "minimal and mostly restricted to the east coast."
  - One east-coast study of mixed *Suaeda maritima*, *Sesuvium portulacastrum*, *Arthrocnemum indicum* and *Salicornia brachiata* (Tuticorin) found sediment stocks of **8.42–54.6 Mg C/ha** in the upper intertidal zone.
  - *Porteresia coarctata* (Bhitarkanika, Sundarbans): **7–44.79 Mg C/ha in the top 10 cm** (2 studies). This comes from a non-peer-reviewed 2024 preprint review.
  - Source: [Preprints.org 202402.0653](https://www.preprints.org/manuscript/202402.0653/v1)
- Gulf of Kutch *Salicornia* beds are wider than Tamil Nadu beds because of the 0.83–7.2 m tidal amplitude, and their sediments hold 4.9–16.9% organic matter (dry weight) (Wetlands journal). I found no Kutch soil carbon stock or burial-rate study. — [Springer s13157-018-1094-6](https://link.springer.com/doi/10.1007/s13157-018-1094-6)
- In coastal Gujarat, *Suaeda* rhizosphere soil had significantly higher organic carbon than *Salicornia* or *Aeluropus*. — [FAO AGRIS](https://agris.fao.org/search/fr/records/65de3f420f3e94b9e5cc71c4)

### Inferences
- Satellites help with saltmarsh aboveground biomass, but VM0033 treats herbaceous biomass as close to steady state: a 3 t C/ha default is creditable only in year 1 (Q3). The creditable flux is soil carbon. Sentinel-1/2 should therefore confirm extent and percent cover, which sets the 15%/50% cover gate under VM0033 and the 10% gate under IPCC. It should not be the source of carbon numbers.
- For Indian *Suaeda* and *Salicornia* marshes, which are short, sparse and semi-arid in Kutch, NDVI-based cover will often fall in the 15–50% band. That band triggers the VM0033 linear discount, so modelling cover carefully matters more than modelling biomass.

### Gaps
- I found no Indian ²¹⁰Pb-dated saltmarsh burial rate, so a Tier 1 or VM0033 default would have to be used.
- I did not verify Ouyang & Lee 2014 (global mean marsh accumulation about 244.7 g C m⁻² yr⁻¹ is the commonly quoted figure) in this pass. Treat it as **unverified**.
- RMSE values for Sentinel-2 *Spartina* or *Suaeda* biomass models were not retrieved.

## Q3. Area × emission/removal factor (gain-loss vs stock-difference) under IPCC and VM0033, and conservative use of satellite area with literature rates

### Takeaway
Both IPCC and VM0033 explicitly allow "area × default rate" for soil carbon accumulation, but with conditions:
- vegetation-cover gates;
- planting rather than natural recolonisation;
- a deduction for allochthonous carbon;
- a rule that published local data must be used before defaults.

VM0033 v2.1 provides **no default rate for seagrass**. Seagrass soil carbon must come from published values, field data or modelling.

### Cited Findings
- IPCC on methods:
  - The gain-loss method (Eq. 2.7) can be used for Tier 1.
  - The stock-difference method (Eq. 2.8, changes in stock at two points in time) is for Tier 2 or 3.
  - For rewetting, revegetation and creation, Eq. 4.7 applies the factor to the area of soil affected (A_RE × EF_RE).
  - Tier 3 can use time-dependent models, because "soil carbon accumulation rates will likely change, as vegetation grows and biomass matures."
  - Source: [IPCC Ch.4](https://www.ipcc-nggip.iges.or.jp/public/wetlands/pdf/Wetlands_separate_files/WS_Chp4_Coastal_Wetlands.pdf)
- **VM0033 v2.1 (Verra, 4 Sept 2023)**, soil organic carbon (SOC) methods: soil carbon may be estimated with "proxies, modeling, default factors, local published values." Also, "default factors and emissions factors cannot be used in the presence of published data suitable for use in the project area." — [VM0033 v2.1 PDF](https://verra.org/wp-content/uploads/2023/09/VM0033-Methodology-for-Tidal-Wetland-and-Seagrass-Restoration-v2.1.pdf)
- **VM0033 default SOC accumulation (Eq. 33): −1.46 t C ha⁻¹ yr⁻¹ × 44/12**, for **tidal marsh and mangrove only**. It is the median of the Chmura et al. 2003 synthesis. Conditions:
  - Full value where crown or vegetation cover is at least 50%.
  - Zero where cover is below 15%.
  - Linear interpolation between 15% and 50%.
  - An allochthonous-carbon deduction is mandatory whenever the default is used.
  - The default "may only be applied to non-seagrass tidal wetland systems."
  - Baseline cover must come from a time series of vegetation composition, and project cover mapping must follow established literature methods.
  - Source: [VM0033 v2.1](https://verra.org/wp-content/uploads/2023/09/VM0033-Methodology-for-Tidal-Wetland-and-Seagrass-Restoration-v2.1.pdf)
- VM0033: "the most recently published IPCC emission factors may be used ... except for tidal marsh and mangrove systems." Read literally, this leaves IPCC Tier 1 (0.43) as a fallback only for seagrass. — [VM0033 v2.1](https://verra.org/wp-content/uploads/2023/09/VM0033-Methodology-for-Tidal-Wetland-and-Seagrass-Restoration-v2.1.pdf)
- VM0033 allochthonous deduction:
  - The percentage of allochthonous carbon (%C_alloch) can come from published values (e.g. Needelman et al. 2018 for mineral-soil marshes and mangroves), field cores, sediment tiles or modelling.
  - Formula: %C_alloch = 100 × (%C_soil − %C_autoch) / %C_soil.
  - For seagrass, the deduction is zero only when the "layer with SOC indistinguishable from baseline" method is used with field data.
  - Source: [VM0033 v2.1](https://verra.org/wp-content/uploads/2023/09/VM0033-Methodology-for-Tidal-Wetland-and-Seagrass-Restoration-v2.1.pdf)
- VM0033 herbaceous biomass default: **3 t C/ha** at 100% herbaceous cover, scaled 1:1 with cover. It is claimable **only in the first year** of the crediting period because herbaceous biomass "quickly reaches a steady state." It is derived as 1.3 kg d.m. m⁻² × 0.45 × 0.5. — [VM0033 v2.1](https://verra.org/wp-content/uploads/2023/09/VM0033-Methodology-for-Tidal-Wetland-and-Seagrass-Restoration-v2.1.pdf)
- VM0033 seagrass accounting rules:
  - Existing meadows (unless smaller than 5% of the project area) must be excluded even if restoration enhances them.
  - Naturally expanded meadow counts only if it is contiguous with restored plots, or if seed origin is shown (e.g. genetic testing) and observed no sooner than 4 years after the start date.
  - Meadow extent may be shown by "aerial observations ... or direct field observations."
  - Seagrass may be stratified by depth or light regime.
  - Source: [VM0033 v2.1](https://verra.org/wp-content/uploads/2023/09/VM0033-Methodology-for-Tidal-Wetland-and-Seagrass-Restoration-v2.1.pdf)
- VM0033 methane defaults: 0.011 t CH₄ ha⁻¹ yr⁻¹ at salinity above 18 ppt and 0.0056 at 20 ppt or more. The two must not be paired across baseline and project to manufacture reductions. Baseline CH₄ and N₂O may conservatively be set to 0. — [VM0033 v2.1](https://verra.org/wp-content/uploads/2023/09/VM0033-Methodology-for-Tidal-Wetland-and-Seagrass-Restoration-v2.1.pdf)
- VM0033 v3.0: a search result reports a public consultation on a major revision (cited dates 3 Sept – 5 Oct 2026) with updated default factors and a new tidal wetland soils module. Not verified against the primary page. — [Verra consultation](https://verra.org/consultation-revision-to-tidal-wetland-and-seagrass-restoration-methodology-vm0033/)

### Inferences
Suggested conservative registry design that follows IPCC and VM0033 logic:

1. Creditable area per stratum = Sentinel-mapped vegetated area in the restored plot, minus the area of the unrestored donor or baseline plot trend.
2. Removal = area × rate × cover factor, where:
   - The cover factor follows VM0033: 0 below 15%, linear from 15% to 50%, 1 at 50% or more. This is stricter than the IPCC 10% gate.
   - Saltmarsh rate = IPCC 0.91 t C/ha/yr. This is lower, and so more conservative, than VM0033's 1.46. Then apply an allochthonous deduction.
   - Seagrass rate = the IPCC lower CI bound of 0.2 t C/ha/yr, or 0.43 with a large uncertainty (n=6). Count planted areas only; natural recolonisation is 0 per IPCC Tier 1.
3. Indian measured stocks (Chilika 2 Mg C/ha in 30 cm) suggest even 0.43 may be generous for Indian lagoon seagrass.

### Gaps
- I did not check whether VM0033 v3.0 (if finalised) changes the 1.46 default or adds a seagrass default.

## Q4. Monitoring frequency, minimum detectable change, sub-annual and dMRV practice, and how quarterly observations should feed annual credits

### Takeaway
No major standard requires or credits sub-annual changes in blue carbon stock:
- Plan Vivo uses annual reports with verification at least every 5 years.
- VM0033 lets the project proponent justify the monitoring frequency, applies parameters "at each monitoring period," and reassesses the baseline every 10 years.

Soil carbon change at 0.2–1.5 t C/ha/yr cannot be detected in a quarter. Quarterly satellite checks are best used as condition and disturbance observations that gate or adjust the annual area × rate calculation, not as quarterly stock estimates.

### Cited Findings
- Plan Vivo: projects estimate climate benefits in **annual reports**, which are verified by an independent auditor "every five years, or more frequently." Ex-ante certificates are also verified every 5 years. — [Plan Vivo crediting & monitoring](https://www.planvivo.org/crediting-systems-monitoring); [ICAO Plan Vivo slides](https://www.icao.int:443/Meetings/carbonmarkets/Documents/02_Session5_Stephenson_Plan_Vivo.pdf)
- VM0033 v2.1 timing:
  - "The choice of monitoring frequency must be justified in the project description."
  - Most monitored parameters are recorded "at each monitoring period."
  - The baseline scenario and the peat depletion time / soil organic carbon depletion time are reassessed every 10 years.
  - Source: [VM0033 v2.1](https://verra.org/wp-content/uploads/2023/09/VM0033-Methodology-for-Tidal-Wetland-and-Seagrass-Restoration-v2.1.pdf)
- Under VCS, buffer credits are put on hold after a loss event report and cancelled or released at the next verification. Non-permanence risk is re-assessed at each verification. — [VCS buffer & loss examples](https://verra.org/documents/vcs-guidance-buffer-and-loss-examples)
- Verra launched a digital MRV (DMRV) pilot for high-frequency issuance (monthly or bi-monthly cycles). The first credits went to a solar project, Comoros VCS 3788 (CDM AMS-I.D), in February 2026. Proponents may request 80% of approved credits, and Verra withholds 20% as a safeguard. No nature-based or blue carbon project was found in the pilot. — [Carbon Pulse](https://carbon-pulse.com/485196/); [ESG Post](https://esgpost.com/verra-issues-first-high-frequency-carbon-credits-under-digital-mrv-pilot/)
- Minimum detectable change:
  - For soil carbon, MDC depends on the number of samples, the sampling design and within-site variance. Re-sampling intervals are often 10 years or more. I found no tidal-marsh-specific MDC study.
  - SET–marker horizons can measure accretion and elevation change "in 3 to 5 years."
  - Sources: [Mobley 2019 SSSAJ](https://www.esf.edu/srm/yanai/documents/Mobley_2019-SSSAJ.pdf); [WRMP SET-MH](https://www.wrmp.org/metric/surface-elevation-tables-marker-horizons/)
- Seagrass aboveground carbon has a strong intra-annual cycle (Indonesia: May–June peak, September–October trough). — [UGM](https://ir.lib.ugm.ac.id/id/eprint/26318/)

### Inferences
Recommended design for the registry:

- **Quarterly values are observations of state.** Each quarter should yield vegetated area, percent cover and a disturbance flag per plot, each with a standard error. They should not be counted as carbon fluxes.
- **Annual credit calculation:**
  - Use the area × rate × cover factor for the year, with the annual creditable area taken from the observations.
  - Conservative option: the **minimum** of the four quarterly areas, or the area at the end-of-year same-season quarter (comparing the same season avoids phenology bias).
  - Statistical option: the **lower 90% bound of a regression** of area or cover over the year, or the mean of the quarterly observations.
- **Combining quarterly uncertainty:**
  - If quarterly errors are independent, the standard error of the mean is √(Σσᵢ²)/4.
  - Quarterly errors are often correlated (same classifier and same bias), so a conservative choice is to propagate the largest single-quarter error, or to treat classification bias as fully correlated, which means not dividing by √n.
- **Comparison with the donor or baseline plot:** use the same-season quarter each year to cancel seasonality. Year-over-year change in a control plot gives the dynamic baseline.
- **Uses of the quarterly checks:**
  - **Reversal triggers**: an observed area loss in any quarter puts credits on hold, then cancels them or draws on the buffer at the annual true-up. This mirrors VCS loss-event reporting.
  - **Cover-gate checks** against the 15% and 50% thresholds.
- Annual crediting with quarterly gating is more frequent than Plan Vivo or VCS practice (verification every 1–5 years). It is defensible if reported as "annual issuance, with independent verification of the method and field cores at least every 5 years." Verra's DMRV pilot's 80/20 holdback is a precedent for issuing at high frequency while withholding part of the credits.

### Gaps
- I found no VMD0055 text. Verra's dMRV and remote sensing module requirements for nature-based projects were not located.
- I found no quantitative minimum detectable change for coastal soil carbon at a given number of cores.
- Gold Standard, ICVCM and World Bank dMRV guidance were not retrieved in this pass.

## Q5. Conservative uncertainty deduction and buffer/non-permanence sizing for coastal projects

### Takeaway
VM0033 sets the allowable uncertainty at 20% (90% CI) or 30% (95% CI) of net emission reductions, and deducts only the excess above that allowance. A simple, stricter alternative for a student registry is to credit the lower bound of the 90% CI. Buffer size comes from the VCS AFOLU Non-Permanence Risk Tool, which since v4.2 (2023) includes a sea-level-rise assessment that VM0033 projects must use from 1 January 2024.

### Cited Findings
- VM0033 v2.1 uncertainty:
  - Precision target: "a 90% or 95% confidence interval equal to or less than 20% or 30%, respectively."
  - Combined across strata, the area-weighted uncertainty is NER_ERROR = √((U_BSL·GHG_BSL)² + (U_WPS·GHG_WPS)²)/(GHG_BSL + GHG_WPS) (Eq. 91).
  - Adjusted NER = NER × (100% − NER_ERROR + allowable_uncert) (Eq. 92). This means **no deduction if the precision target is met, otherwise a deduction equal to the excess**.
  - Conservative literature values may be used with uncertainty treated as 0%.
  - Source: [VM0033 v2.1](https://verra.org/wp-content/uploads/2023/09/VM0033-Methodology-for-Tidal-Wetland-and-Seagrass-Restoration-v2.1.pdf)
- VM0033 requires the VCS AFOLU Non-Permanence Risk Tool for erosion and submergence risk from sea-level rise. Buffer credits are based on the net change in carbon stocks. — [VM0033 v2.1](https://verra.org/wp-content/uploads/2023/09/VM0033-Methodology-for-Tidal-Wetland-and-Seagrass-Restoration-v2.1.pdf)
- NPRT v4.2 (October 2023):
  - It adds projected climate impacts and sea-level rise, scored on ecosystem degradation, coastal flooding (0–3, where 3 means more than half the area flooded), coastal erosion and salinization, over a 100-year horizon.
  - VM0033 clarifies that the latest NPRT applies from 1 January 2024.
  - Source: [Verra NPRT v4.2](https://verra.org/documents/afolu-non-permanence-risk-tool-v4-2); [SLR guidance](https://verra.org/documents/guidance-on-sea-level-rise-risk-assessment-using-the-non-permanence-risk-assessment-calculator-v4-2); [Verra release](https://verra.org/verra-releases-updated-afolu-non-permanence-risk-tool/)

### Inferences
- The registry's "uncertainty deduction" can follow VM0033 Eq. 92 directly. With IPCC rates, the rate uncertainty alone is large:
  - Seagrass: CI 0.2–0.7 around 0.43, roughly ±58%.
  - Saltmarsh: CI 0.7–1.1 around 0.91, roughly ±22%.
- Combined with satellite area error (about 10–30% from 70–90% classification accuracy), seagrass will almost always exceed the 20% allowance and take a large deduction. Using the lower CI bound of the rate (0.2 or 0.7) with uncertainty set to 0, which VM0033 permits for "conservative estimates," is an equivalent, simpler option.
- Buffer: I found no fixed percentage for coastal projects. The NPRT score sets it, and the VCS minimum buffer is commonly 10%. The 10% figure was **not verified in this pass**, so the report writer should flag it.

### Gaps
- I did not retrieve exact NPRT minimum buffer percentages or typical scores for blue carbon projects.
- I did not retrieve Gold Standard or ICVCM Core Carbon Principles guidance on uncertainty.
