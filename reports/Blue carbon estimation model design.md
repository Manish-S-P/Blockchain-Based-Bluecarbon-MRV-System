# Measure biomass, default the soil, credit annually

A defensible satellite carbon model for an Indian blue carbon registry does not try to "see" carbon. It measures what satellites can actually observe, which is extent, vegetation cover, and (for mangroves only) above-ground biomass. It then attaches field-derived default rates to the soil pool that satellites cannot observe, and credits only once a year on the cumulative difference from the synthetic-control baseline. Every recognised standard reviewed here works this way. VM0033, India's BEE BM FR05.001 (a verbatim adoption of CDM AR-AM0014), the IPCC 2013 Wetlands Supplement and Plan Vivo all anchor stocks in field plots, cores or published defaults. They use remote sensing for area, stratification, cover gating and loss detection, and none of them credits sub-annual stock change. This matters because soil holds most of the carbon. It is about 44% of mangrove ecosystem carbon in the top metre alone and 83–95% in young plantations, and nearly all seagrass and saltmarsh carbon is soil. Meanwhile, honest spatially validated Sentinel biomass models reach only R² ≈ 0.5–0.7 and 20–45% relative RMSE. That error is several times the roughly 10 t dry matter/ha/yr a mangrove grows. The recommended design therefore has five parts:

- A quantile random forest predicts mangrove above-ground biomass (AGB). It is trained on quality-filtered GEDI L4A footprints, with features matched to the season of each footprint.
- Biomass is converted with the IPCC mangrove factors.
- Soil accrual is added as area × default rate × a VM0033-style cover factor, using India's 0.5 t C/ha/yr for mangroves, IPCC lower-bound rates for saltmarsh, and a heavily caveated 0.2 t C/ha/yr for planted seagrass.
- Intervals come from spatially grouped conformal calibration plus Monte Carlo propagation of the factors.
- Quarterly outputs act as state observations and reversal triggers, and they feed an annual, cumulative, conservatively discounted credit calculation.

## Every standard anchors carbon in field data and credits on multi-year cycles

The four rulebooks differ in detail but agree on structure. **Verra VM0033 v2.1** (active since 4 September 2023) covers mangroves, tidal marshes and seagrass ([Verra VM0033 v2.1 PDF](https://verra.org/wp-content/uploads/2023/09/VM0033-Methodology-for-Tidal-Wetland-and-Seagrass-Restoration-v2.1.pdf)). It treats soil organic carbon (SOC) as the core pool. Tree above- and below-ground biomass are mandatory in the baseline but "may be included or conservatively omitted" in the project. Litter and dead wood are optional, and any pools omitted together must stay under a 5% de minimis threshold ([VM0033 p.21–22](https://verra.org/wp-content/uploads/2023/09/VM0033-Methodology-for-Tidal-Wetland-and-Seagrass-Restoration-v2.1.pdf)). Soil carbon change may be estimated from proxies, models, published data, default factors, field data or chronosequences. Two conditions apply. "Default factors... cannot be used in the presence of published data suitable for use in the project area," and any proxy or model must be "strongly correlated" with, and validated against, direct measurements from similar systems ([VM0033 p.32–33](https://verra.org/wp-content/uploads/2023/09/VM0033-Methodology-for-Tidal-Wetland-and-Seagrass-Restoration-v2.1.pdf)). That second clause is the decisive constraint for this project. A satellite-only SOC estimate with no core data does not meet v2.1.

VM0033's default soil accumulation for mangrove and tidal marsh is **1.46 t C/ha/yr (5.35 t CO2/ha/yr)**, the median of the Chmura et al. 2003 synthesis. It is scaled by vegetation cover:

- full rate at 50% cover or more;
- zero below 15%;
- linear interpolation in between.

When this default is used, a deduction for allochthonous carbon is mandatory, and the default "may only be applied to non-seagrass tidal wetland" systems ([VM0033 p.36](https://verra.org/wp-content/uploads/2023/09/VM0033-Methodology-for-Tidal-Wetland-and-Seagrass-Restoration-v2.1.pdf)).

On uncertainty, VM0033 is more lenient than the project's current formula. The precision target is a confidence interval of no more than 20% of the mean at 90% confidence, or 30% at 95%. The adjusted net emission reduction is NER × (100% − NER_ERROR + allowable_uncert) (Eq. 92). That means **only the uncertainty in excess of 20% is deducted** ([VM0033 p.61–64](https://verra.org/wp-content/uploads/2023/09/VM0033-Methodology-for-Tidal-Wetland-and-Seagrass-Restoration-v2.1.pdf)).

The buffer is applied only to the stock-change component, after the uncertainty adjustment (Eq. 94). Its size comes from the AFOLU Non-Permanence Risk Tool v4.2. That tool states that "the minimum risk rating shall be 12, regardless of the risk rating calculated," fails any project rated above 60, and since 2023 scores sea-level-rise flooding, erosion and salinisation ([AFOLU NPRT v4.2](https://verra.org/documents/afolu-non-permanence-risk-tool-v4-2); [Verra release](https://verra.org/verra-releases-updated-afolu-non-permanence-risk-tool/)). The rating maps to the buffer percentage, which implies at least a 12% buffer; that mapping is inferred from the tool's structure. One of the research notes repeated a "10% minimum" figure from secondary sources, but the 12 in the tool text is the figure to use.

Credits at each verification are issued on the cumulative difference, adjusted NER at t2 minus adjusted NER at t1 (Eq. 93). That is exactly the "− already issued" term in the project's formula.

**CDM AR-AM0014 v3.0** matters most for India. The Bureau of Energy Efficiency adopted it verbatim as **BEE BM FR05.001 v1.0** (27 March 2025) for "Afforestation and reforestation of degraded mangrove habitats" under the Carbon Credit Trading Scheme (CCTS) ([BEE BM FR05.001](https://beeindia.gov.in/sites/default/files/BM%20FR05.001.pdf)). Its rules are:

- **Pools.** Above- and below-ground biomass are mandatory. Litter is excluded because of "high turnover and displacement due to tidal currents." Dead wood and SOC are optional.
- **Soil default.** SOC may use a default of **0.5 t C/ha/yr from planting to planting + 20 years**, then zero.
- **Applicability.** More than 90% of the area must be planted with mangrove species, and soil disturbance is limited to 10% of the area.
- **Uncertainty.** The biomass tool, AR-TOOL14 v04.2, defines uncertainty as the 90% confidence half-width divided by the mean. It applies a stepped discount when that exceeds 10%: 25% of the half-width for 10–15%, 50% for 15–20%, 75% for 20–30%, and 100% above 30% ([AR-TOOL14 v04.2](https://cdm.unfccc.int/methodologies/ARmethodologies/tools/ar-am-tool-14-v4.2.pdf)).
- **Remote sensing.** AR-TOOL14 explicitly allows remote sensing "in conjunction with data from measurements conducted in sample plots" through double sampling. Its worked example uses NDVI on 2,000 plots and tree measurements on 150 to cut the variance of the mean by one third ([AR-TOOL14](https://cdm.unfccc.int/methodologies/ARmethodologies/tools/ar-am-tool-14-v4.2.pdf)).

The **IPCC 2013 Wetlands Supplement, Chapter 4** supplies the Tier 1 numbers every methodology borrows ([IPCC Ch.4](https://www.ipcc-nggip.iges.or.jp/public/wetlands/pdf/Wetlands_separate_files/WS_Chp4_Coastal_Wetlands.pdf)):

- **Soil accumulation on revegetation** (Table 4.12): **1.62 t C/ha/yr for mangrove (95% CI 1.3–2.0)**, **0.91 for tidal marsh (0.7–1.1)** and **0.43 for seagrass (0.2–0.7, from only n = 6 Mediterranean studies)**.
- **Mangrove biomass factors**: a carbon fraction of 45.1% (CI 42.9–47.1) and root:shoot ratios of 0.49 (tropical wet), 0.29 (tropical dry) and 0.96 (subtropical).
- **Default above-ground biomass**: 192 t dry matter/ha (tropical wet).
- **Gating rules**: the soil rate applies only where vegetation has re-established by planting or seeding and covers at least 10% of the area. Natural recolonisation gets a factor of zero.
- **Non-woody biomass**: Tier 1 assumes no net biomass change for seagrass and marsh vegetation.

**Plan Vivo** verifies "at least every 5 years." Its buffer is described as 20% on one page and risk-proportional on another, a conflict its own documentation does not resolve ([Plan Vivo risks page](https://www.planvivo.org/risks-of-non-delivery-and-reversals); [Plan Vivo FAQ](https://www.planvivo.org/Pages/FAQs/Category/carbon-quantification-and-integrity); [Plan Vivo buffer page](https://www.planvivo.org/buffer)).

| | VM0033 v2.1 | AR-AM0014 / BEE BM FR05.001 | IPCC 2013 Wetlands Supp. | Plan Vivo |
|---|---|---|---|---|
| Mandatory pools | Soil; baseline trees | AGB + BGB | Biomass, dead organic matter, soil by tier | Project-defined (Mikoko Pamoja: trees only) |
| Soil default | 1.46 t C/ha/yr × cover factor, minus allochthonous share; not for seagrass | 0.5 t C/ha/yr for 20 yr | 1.62 / 0.91 / 0.43 t C/ha/yr | Not prescribed |
| Uncertainty rule | Deduct the excess over 20% (90% CI) | Stepped discount above 10% (90% CI) | Report CIs | Project-defined |
| Buffer | NPRT, minimum rating 12 | Temporary or long-term credits (tCCC/lCCC); reversals replaced | n/a | 20% or risk-based |
| Monitoring and verification | Frequency justified by proponent; subsidence yearly; baseline every 10 yr | Per verification period | Extent reviewable every 5 yr | Annual reports; verification at least every 5 yr |

Two developments make the project's synthetic-control baseline timely rather than eccentric. First, Verra's ARR methodology VM0047 already uses a remote-sensing "stocking index" compared against matched control areas as a dynamic performance benchmark. It is approved under ICVCM's Core Carbon Principles (CCP) ([Verra DSP announcement](https://verra.org/verra-announces-vetted-data-service-providers-for-arr-methodology/)). Second, the VM0033 v3.0 revision, whose public consultation closed on 5 October 2026, proposes a dynamic performance benchmark for tidal wetlands ([Verra consultation](https://verra.org/consultation-revision-to-tidal-wetland-and-seagrass-restoration-methodology-vm0033/)). VM0033 itself shows CCP label eligibility as "Pending Methodology Update" ([Verra VM0033 page](https://verra.org/methodologies/vm0033-methodology-for-tidal-wetland-and-seagrass-restoration-v2-1/)). Blue carbon crediting is moving toward the matched-control design this project already uses. The v3.0 module texts were not available, so it remains unconfirmed whether they permit remote-sensing quantification of stocks.

## Soil holds most of the carbon, and satellites cannot see it

The partition problem is the single most important fact for the project report.

- **Mangroves.** Donato et al. 2011 sampled 25 Indo-Pacific mangrove forests and found a mean of 1,023 Mg C/ha, with organic-rich soils holding **49–98%** of it ([Donato 2011 PDF](https://www.forest-trends.org/wp-content/uploads/imported/Donato_2011.pdf)). Kauffman et al. 2020 sampled 190 sites on five continents. Soil to 1 m averaged **44%** of total ecosystem carbon, and limiting sampling to the top metre "results in large underestimates." Their global stock splits into 1.6 Pg C above ground and 10.2 Pg C below ground, or roughly 14% versus 86% ([USP repository](https://repositorio.usp.br/item/002991980); [CIFOR-ICRAF](https://www.cifor-icraf.org/knowledge/publication/7597)). In newly planted mangroves, soil makes up **83–95%** of ecosystem carbon during the first five years ([Science Advances](https://www.science.org/doi/10.1126/sciadv.adk5430)).
- **Seagrass.** Living biomass ranges over five orders of magnitude, from 0.001 to 23 Mg C/ha ([Campbell et al., Abu Dhabi](https://www.oceanfdn.org/sites/default/files/Campbell-Carbon%20Storage%20in%20Seagrass%20Beds%20of%20Abu%20Dhabi%20UAE.pdf)). The IPCC default soil stock is 108 t C/ha to 1 m ([IPCC Ch.4](https://www.ipcc-nggip.iges.or.jp/public/wetlands/pdf/Wetlands_separate_files/WS_Chp4_Coastal_Wetlands.pdf)).
- **Tidal marshes.** A global compilation of 17,454 data points gives a median of **231 Mg C/ha in the top metre** of soil ([Maxwell et al. 2023, Scientific Data](https://www.nature.com/articles/s41597-023-02633-x)).

Indian numbers vary by an order of magnitude, mostly because studies sample to different depths, which is a hazard the report must state openly. In the Indian Sundarbans, sediment carbon to 90 cm totals 59.14 Tg OC against 10.35 Tg in biomass. That puts about **85%** of carbon in sediment, while mean AGB is only 40.35 Mg/ha ([Springer, Tropical Ecology 2020](https://link.springer.com/article/10.1007/s42965-020-00130-5)). At Pichavaram, natural stands hold 146.1 Mg C/ha of SOC to 90 cm, and restored stands hold 57–99 ([ResearchGate](https://www.researchgate.net/publication/333603613_Soil_organic_carbon_stock_in_natural_and_restored_mangrove_forests_in_Pichavaram_south-east_coast_of_India)). In contrast, an Indian systematic review reports sediment carbon of only 48.3 ± 8.8 Mg C/ha against biomass carbon of 109 ± 48. That result is biomass-dominated and conflicts with the global syntheses, almost certainly because the soil sampling was shallow ([India Water Portal synthesis](https://www.indiawaterportal.org/environment/carbon-vaults-of-the-coast-unlocking-indias-mangrove-potential)). Soil carbon is also fragile. In the Sundarbans, a 31% post-cyclone rise in soil salinity was associated with a 46% fall in the soil blue carbon pool ([PMC10381154](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10381154/)).

What Sentinel-1, Sentinel-2 and NASADEM can deliver is therefore limited but real:

- ecosystem extent and its change (loss to aquaculture, erosion, gain from planting);
- percent vegetation cover, which drives the VM0033 and IPCC soil gates;
- canopy development and survival;
- for mangroves, an AGB estimate calibrated to reference data.

What they cannot deliver is soil carbon stock, burial rate, below-ground roots or allochthonous fraction. The registry's carbon number is therefore always a hybrid: a measured biomass term plus an assigned soil term. The output should label the two separately.

Real projects confirm the pattern. **Mikoko Pamoja** (Kenya, Plan Vivo) protects 107 ha of natural mangrove and 10 ha of plantation. It credits tree carbon only, using the Komiyama 2005 allometry, and excludes soil as too resource-intensive. Its baseline is a Landsat-derived loss rate of about 0.7%/yr over 1985–2010. It applies a 15% buffer where its risk assessment justified only 11%, and it claims about 2,500 t CO2/yr, roughly 21 t/ha/yr ([Mikoko Pamoja PDD 2020](https://sustainabletravel.org/wp-content/uploads/MikokoPamoja-PDD-2020-revision-PlanVivo.pdf)). **Vanga Blue Forest** uses VM0033, AR-Tool14 and the IPCC Wetlands Supplement. Its field-measured baseline stocks average about 469 ± 176 Mg C/ha to 1 m, and it mapped forest-area change from 3,685 ha (1991) to 3,234 ha (2016) from historical imagery ([Vanga PDD](https://sustainabletravel.org/wp-content/uploads/Vanga-Blue-Forest-PDD_27dec19_PlanVivo.pdf)). India's own precedent is the CDM-registered **India Sundarbans Mangrove Restoration** (Livelihoods Fund with NEWS). It estimated 44,955 t CO2e/yr from a 20-year crediting period starting in 2010 ([UNFCCC CDM record](https://cdm.unfccc.int/Projects/Validation/DB/1M4DGESWLXKKD8XTB2MMXGA2DJHLL4/view.html)) on 5,011 ha restored ([Livelihoods Fund](https://livelihoods.eu/projects/news-india/)). That is about 9 t CO2e/ha/yr, or roughly 2.4 Mg C/ha/yr. This closely matches the Bangladesh national mean for planted-mangrove biomass of 60.3 Mg C/ha at a mean stand age of 25.5 years ([GCB 2023](https://onlinelibrary.wiley.com/doi/full/10.1111/gcb.16674)). **Delta Blue Carbon** in Pakistan applies VM0033 to about 225,000 ha, with community field monitoring and third-party audits ([Verra case study](https://verra.org/case-studies/delta-blue-carbon/)). None of the projects found estimates soil carbon from satellites. Remote sensing supplies area and loss baselines, and field plots supply stocks.

Credit intensity is driven by project type, not by stock:

| Project | Type | Approx. credit rate |
|---|---|---|
| Tahiry Honko (Madagascar) | Avoided loss | ~1 t CO2/ha/yr |
| India Sundarbans restoration | Restoration | ~9 t CO2e/ha/yr |
| Delta Blue Carbon (Pakistan) | Restoration | ~10.5 t CO2e/ha/yr |

([IDRECCO](https://www.reddprojectsdatabase.org/472-tahiry-honko-community-mangrove-carbon-project/); [Klimate](https://www.klimate.co/project/delta-blue-carbon)). A registry issuing more than about 10 t CO2e/ha/yr for a young Indian plantation should treat that as a red flag.

The literature's critiques should also be acknowledged. Williamson & Gattuso 2022 found burial-rate estimates spanning 600-fold for saltmarsh, 76-fold for seagrass and 19-fold for mangroves, and warned of "potential over-crediting" ([UEA](https://research-portal.uea.ac.uk/en/publications/carbon-removal-using-coastal-blue-carbon-ecosystems-is-uncertain-)). Planted mangroves reach only about 71–73% of intact-stand biomass after 40 years ([Science Advances](https://www.science.org/doi/10.1126/sciadv.adk5430)).

## Free GEE datasets supply labels, checks and masks, though no free label set is plot-grade

No open, downloadable plot-level biomass dataset for Indian mangroves was found in Zenodo, Dryad, Pangaea or Mendeley. Labels must therefore come from GEDI lidar, global maps or published plot means. Each choice has a known weakness, and the design should use each for what it is good at. The IDs below were verified against the official Earth Engine catalog or the awesome-gee-community-catalog index on 2026-10-08 unless marked otherwise ([community catalog CSV](https://raw.githubusercontent.com/samapriya/awesome-gee-community-datasets/master/community_datasets.csv)).

| Role | Dataset | GEE asset ID | Key facts |
|---|---|---|---|
| **Primary AGB labels** | GEDI L4A footprint AGBD, monthly rasterised | `LARSE/GEDI/GEDI04_A_002_MONTHLY` | 25 m, 2019-03-25 to 2025-07-01; bands `agbd`, `agbd_se`, `agbd_pi_lower/upper`, `l4_quality_flag`, `degrade_flag`, `sensitivity`, `solar_elevation` ([GEE catalog](https://developers.google.com/earth-engine/datasets/catalog/LARSE_GEDI_GEDI04_A_002_MONTHLY)) |
| Height labels | GEDI L2A heights; GEDI mangrove footprint table | `LARSE/GEDI/GEDI02_A_002_MONTHLY`; `projects/space-geographer/assets/GEDI_MANGROVE_HT` | Mangrove footprints 2019-04 to 2022-05 ([catalog](https://gee-community-catalog.org/projects/mangrove_ht_tandemx/)) |
| Regional sanity check | GEDI L4B gridded AGBD | `LARSE/GEDI/GEDI04_B_002` | 1 km mean for 2019–2021, with SE ([GEE catalog](https://developers.google.com/earth-engine/datasets/catalog/LARSE_GEDI_GEDI04_B_002)) |
| Independent AGB check | ESA CCI Biomass v6.0 | `ESA/CCI/Above_Ground_Biomass/V6_0` | 100 m; 2007, 2010, 2015–2022; `agb` and `agb_sd` in Mg/ha ([GEE catalog](https://developers.google.com/earth-engine/datasets/catalog/ESA_CCI_Above_Ground_Biomass_V6_0)) |
| Mangrove AGB and height prior | Simard 2019 | `projects/sat-io/open-datasets/global_mangrove_distribution/agb`, `.../hba95`, `.../hmax95` | 30 m, **nominal year 2000** ([ORNL DAAC 1665](https://www.earthdata.nasa.gov/data/catalog/ornl-cloud-cms-global-map-mangrove-canopy-1665-1.3)) |
| Mangrove height check | TanDEM-X 12 m height | `projects/sat-io/open-datasets/GLOBAL_MANGROVE_HT_TANDEMX` | Nominal 2015, GEDI-calibrated, height RMSE 2.4 m ([catalog](https://gee-community-catalog.org/projects/mangrove_ht_tandemx/); [Aberystwyth](https://research.aber.ac.uk/en/publications/a-new-global-mangrove-height-map-with-a-12-meter-spatial-resoluti/)) |
| Other AGB and height covariates | CTrees AGB; ETH canopy height | `projects/sat-io/open-datasets/CTREES-GLOBAL-AGB-100M`; `users/nlang/ETH_GlobalCanopyHeight_2020_10m_v1` | Global, not mangrove-specific |
| Mangrove mask | Global Mangrove Watch v3 and v4 (2020) | `projects/sat-io/open-datasets/GMW/extent/GMW_V3`; `projects/sat-io/open-datasets/GMW/annual-extent/GMW_MNG_2020` | v3 extent accuracy 87.4%; CC-BY-SA ([Zenodo](https://zenodo.org/record/6894273)) |
| Tidal marsh and mangrove change | Murray Global Tidal Wetland Change | `JCU/Murray/GIC/global_tidal_wetland_change/2019` | 30 m, 1999–2019; type codes 3 = mangrove, 5 = tidal marsh ([EE STAC](https://earthengine-stac.storage.googleapis.com/catalog/JCU/JCU_Murray_GIC_global_tidal_wetland_change_2019.json)) |
| Seagrass and reef habitat | Allen Coral Atlas | `ACA/reef_habitat/v2_0` | 5 m; benthic accuracy about 66% ([GEE catalog](https://developers.google.com/earth-engine/datasets/catalog/ACA_reef_habitat_v2_0)) |
| Mangrove SOC reference | Maxwell et al. 2023, year 2020 | Upload from [Zenodo 7729491](https://zenodo.org/record/7729491) (~5.9 GB) | 30 m, 0–100 cm, with prediction intervals, 10,331 samples, CC-BY |
| Tidal marsh SOC reference | Maxwell et al. 2024 | Upload ([IIASA](https://pure.iiasa.ac.at/20151)) | 30 m; mean 83.1 Mg C/ha (0–30 cm) |
| Regional SOC analogue | Indus Delta mangrove SOC 2020 | `projects/sat-io/open-datasets/INDUS_DELTA_SOC/indusdelta_mangrove_soc2020` | Nearest analogue to the Gulf of Kutch |
| Soil (do not use as label) | SoilGrids SOC | `projects/soilgrids-isric/soc_mean` | 250 m terrestrial model |
| L-band SAR feature | ALOS PALSAR-2 yearly mosaic | `JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH` | **ID unverified**; confirm before use |

Each label source has a specific weakness. GEDI L4A is plentiful, dated, and ships a per-footprint standard error, but it uses plant-functional-type models with no mangrove-specific predictor. Its biases are site-dependent: −31.65 Mg/ha at US NEON sites, −54 to +106 Mg/ha across Lao forest types, and about 2.1× field values in a savanna ([MDPI Forests 15(12):2095](https://www.mdpi.com/1999-4907/15/12/2095/html); [GIScience & RS 2024](https://doaj.org/article/f2eed9032a5f476eb4d29dc55f8f9c0d); [MDPI RS 18(16):2751](https://mdpi.com/2072-4292/18/16/2751)). In Indian forests, raw L4A gave a 84.6% RMSE, while a model combining field and GEDI data gave 45.0% ([ResearchGate](https://www.researchgate.net/publication/377940757_Forest_aboveground_biomass_estimation_by_GEDI_and_multi-source_EO_data_fusion_over_Indian_forest)). In restored Myanmar mangroves, the best GEDI height metric reached only R² = 0.24 against 32 field plots ([DOAJ](https://doaj.org/article/d149ea1aa52146f7bf32eb40f22d2522)).

Simard 2019 has a different problem. Its year-2000 date mismatches Sentinel-era predictors, and training on it creates circularity: high held-out accuracy only proves the model can reproduce Simard. Published Indian plot means are the only true field anchor, and the project should use them as an independent check, not as training data. Examples are Bhitarkanika AGB of 318.79 ± 44.42 t/ha ([OUCI](https://ouci.dntb.gov.ua/en/works/4N6e2be4/)) and Indian Sundarbans mean AGB of 40.35 Mg/ha ([Springer](https://link.springer.com/article/10.1007/s42965-020-00130-5)).

Licences matter if the registry ever becomes commercial. GMW is CC-BY-SA (share-alike), FAO GSOCmap is non-commercial, ESA CCI has custom terms, and UNEP-WCMC seagrass needs permission for commercial use ([community catalog CSV](https://raw.githubusercontent.com/samapriya/awesome-gee-community-datasets/master/community_datasets.csv)).

## Honest machine learning reaches R² 0.5–0.7, so uncertainty and validation carry the scientific weight

Published regional mangrove AGB models combining Sentinel-2, SAR and field plots cluster at **R² ≈ 0.6–0.8 and RMSE ≈ 25–50 Mg/ha**:

| Site | Data and model | R² | RMSE | Source |
|---|---|---|---|---|
| Can Gio, Vietnam | Sentinel-2 + ALOS-2, XGBoost, 121 plots | 0.805 | 28.13 Mg/ha (~26% of mean) | [DOAJ](https://doaj.org/article/2c53ff157a3d4506a57dd10e25ac5a9c) |
| Red River Delta, Vietnam | S1 + S2 + L-band | 0.683 | 25.08 Mg/ha | [U-Tokyo PDF](https://wtlab.iis.u-tokyo.ac.jp/wataru/publication/pdf/mangrove_agb_machine_learning.pdf) |
| Matang, Malaysia | Random forest, leave-one-out CV | 0.735 | 46.8 t/ha | [MDPI Forests](https://www.mdpi.com/1999-4907/16/10/1517) |

At Matang, OSAVI and L-band HV backscatter were the top predictors. Elsewhere, red-edge simple ratios ([ResearchGate](https://www.researchgate.net/publication/324711398_ESTIMATION_OF_MANGROVE_FOREST_ABOVEGROUND_BIOMASS_USING_MULTISPECTRAL_BANDS_VEGETATION_INDICES_AND_BIOPHYSICAL_VARIABLES_DERIVED_FROM_OPTICAL_SATELLITE_IMAGERIES_RAPIDEYE_PLANETSCOPE_AND_SENTINEL-2)) and GLCM texture ([ResearchGate](https://www.researchgate.net/publication/395598412_Estimating_coastal_mangrove_aboveground_biomass_of_Zhejiang_province_based_on_sentinel-2_images_and_multiple_machine_learning_algorithms)) came out on top. In Bhitarkanika, a canopy-height model using Sentinel-1 coherence and Sentinel-2 reached R² 0.60 and RMSE 1.57 m with random forest, with vegetation-cover fraction as the key predictor ([Ghosh 2020](https://gpbib.cs.ucl.ac.uk/gp-html/ghosh_2020_RS.html)). A 2026 Sundarbans study reports AGB RMSE of 11.06 Mg/ha with R² 0.85 from GEDI-based fusion, but it validated against GEDI-derived references rather than field plots ([GEDI publications](https://gedi.umd.edu/science/publications/)).

L-band SAR recurs in the best models, while C-band Sentinel-1 and optical indices saturate in dense canopies. The project's existing NASADEM layer is really a partial canopy-height proxy from around 2000, because SRTM-era elevation over mangroves includes the canopy. **Expect R² ≈ 0.5–0.7 under spatial validation with tens to a few hundred labelled locations, and report relative RMSE**, because absolute RMSE scales with site biomass.

Validation design decides whether these numbers mean anything. Ploton et al. 2020 fitted a random forest on 11.8 million trees in central Africa. Random cross-validation suggested it explained more than half of AGB variation, but **spatial cross-validation revealed almost no predictive power** ([Nature Communications via PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7486894/)). Wadoux et al. 2021 counter that spatial CV lacks a theoretical basis and favour probability-sample validation, though they agree random CV is deficient for clustered data ([Ecological Modelling](https://ideas.repec.org/a/eee/ecomod/v457y2021ics0304380021002489.html)). Meyer & Pebesma's Area of Applicability (AOA) flags predictions whose predictor vectors lie far from the training data, using a dissimilarity index thresholded on cross-validation ([arXiv 2005.07939](https://arxiv.org/abs/2005.07939)). One caveat is that a single training point can make a whole region count as "applicable" ([EGU24-10278](https://meetingorganizer.copernicus.org/EGU24/EGU24-10278.html)). For scikit-learn the protocol is concrete:

- `GroupKFold` or `LeaveOneGroupOut`, with groups set to a site, an island, or a grid block at least as large as the residual variogram range;
- random-CV numbers reported alongside, to show the inflation;
- an AOA mask computed with `NearestNeighbors` on importance-weighted standardised features.

For per-plot intervals, quantile regression forests (Meinshausen 2006, [JMLR](https://jmlr.org/papers/v7/meinshausen06a.html)) and conformalised quantile regression (CQR; Romano et al. 2019, [arXiv 1905.03222](https://arxiv.org/abs/1905.03222)) are the practical choices. A quantile random forest has given usable per-pixel AGB uncertainty maps, with R² 0.70 on independent validation ([DOAJ RS 2019](https://doaj.org/article/7e9561b7976d4e4091a127f4f2b941e7)). Conformal intervals on Sentinel-2 forest maps achieved nominal 90% coverage ([Kuronen et al. 2025, LUKE](https://jukuri.luke.fi/handle/11111/23114)).

Conformal coverage is marginal and assumes exchangeability, which spatial clustering breaks. The calibration set must therefore be spatially separate from training, and coverage must be reported under spatial folds. Both methods exist as add-on packages: `quantile-forest` ([GitHub](https://github.com/zillow/quantile-forest)) and MAPIE ([GitHub](https://github.com/scikit-learn-contrib/MAPIE)). Strictly within scikit-learn, both are about 30 lines of code each. A quantile random forest reuses `RandomForestRegressor.apply()` to collect training targets that share each test point's leaves and takes weighted quantiles. Split CQR computes scores max(q_lo − y, y − q_hi) on the calibration blocks and widens intervals by the ⌈(1−α)(n+1)⌉/n quantile of those scores.

Model intervals do not capture label error. The GEDI SE, carbon fraction (CI 42.9–47.1%) and root:shoot ratio (CI 0.47–0.51) need a Monte Carlo of about 1,000 draws. Aggregating pixels to a plot does not shrink error by √n, because neighbouring pixels share biases. The defensible student assumption is fully correlated pixel errors, meaning the plot interval is taken as the interval of the plot-mean prediction.

SHAP fits naturally. `shap.TreeExplainer` gives exact Shapley values for tree ensembles ([Lundberg et al. 2020](https://www.nature.com/articles/s42256-019-0138-9)), and SHAP-based selection and interpretation is now routine in AGB studies ([MDPI RS 17(14):2493](https://www.mdpi.com/2072-4292/17/14/2493); [MDPI Forests 16(12):1777](https://www.mdpi.com/1999-4907/16/12/1777/htm)). Because tCO2e/ha = AGB × (1 + R) × 0.451 × 44/12 is a constant scaling for a given plot, SHAP values in Mg/ha convert linearly to tCO2e/ha. Three caveats belong in the report:

- SHAP explains the median or mean model, not the quantiles.
- Correlated features such as NDVI and EVI, or VV and VH, split credit arbitrarily, so attributions should be aggregated by feature family (optical, red-edge, SAR, texture, terrain).
- Explanations outside the AOA are not reliable.

## Quarterly carbon is a state observation, not a creditable flux

No standard reviewed requires or credits sub-annual changes in blue carbon stock:

- Plan Vivo reports annually and verifies at least every five years ([Plan Vivo](https://www.planvivo.org/crediting-systems-monitoring)).
- VM0033 leaves monitoring frequency to be "justified in the project description," measures subsidence at least yearly, and reassesses the baseline every 10 years ([VM0033](https://verra.org/wp-content/uploads/2023/09/VM0033-Methodology-for-Tidal-Wetland-and-Seagrass-Restoration-v2.1.pdf)).
- The VCS Standard v5.0 requires 40-year permanence monitoring and explicitly allows "a robust remote sensing-based approach... to detect loss events" ([VCS Standard v5.0](https://verra.org/documents/vcs-standard-v5-0)).
- The only high-frequency precedent is Verra's digital MRV pilot. It issued monthly or bi-monthly credits to a solar project in February 2026, released 80% and withheld 20%, and includes no nature-based project ([Carbon Pulse](https://carbon-pulse.com/485196/); [ESG Post](https://esgpost.com/verra-issues-first-high-frequency-carbon-credits-under-digital-mrv-pilot/)).

The physics agrees with the rulebooks. IPCC mangrove AGB growth is 9.9 t dry matter/ha/yr in tropical wet zones and 3.3 in tropical dry ones ([IPCC Ch.4](https://www.ipcc-nggip.iges.or.jp/public/wetlands/pdf/Wetlands_separate_files/WS_Chp4_Coastal_Wetlands.pdf)). With independent errors, the minimum detectable change at 95% confidence is about 1.96 × √2 × σ ≈ 2.8σ. A model with σ = 25 Mg/ha therefore cannot resolve changes smaller than about 69 Mg/ha. That is roughly seven years of tropical-wet growth, and about 28 quarters' worth. Soil accrual of 0.2–1.6 t C/ha/yr is far below any satellite signal. Errors from the same model on the same plot are partly correlated between dates, which helps differencing, but that correlation is unknown and must not be assumed.

Seasonal effects are also large. Sentinel-2 seagrass above-ground carbon in Indonesia peaks in May–June and bottoms out in September–October ([UGM](https://ir.lib.ugm.ac.id/id/eprint/26318/)). Tide state and moisture under the canopy shift Sentinel-1 backscatter and Sentinel-2 reflectance. A raw quarter-to-quarter difference would mostly measure season, tide and cloud, not carbon.

The project's existing anomaly detector already compares each quarter with the same quarter a year earlier, which cancels seasonality, and that same-season logic should carry into crediting. **Each quarter, the model reports a per-plot carbon state with an interval, plus vegetated area, percent cover and a disturbance flag.** The quarterly carbon state is the ML biomass stock plus soil accrued to date. These quarterly observations feed an **annual** credit event in four ways:

1. Annual creditable area and cover are taken conservatively. The options are the minimum of the four quarterly values, the same-season quarter at year end, or the lower 90% bound of a within-year trend.
2. Quarterly uncertainties are combined assuming full correlation (no division by √4), because the same classifier and model bias recur every quarter.
3. Any quarter showing loss below the alert threshold puts that plot's pending credits on hold, mirroring VCS loss-event reporting, and the hold resolves at the annual true-up against the buffer ([VCS buffer guidance](https://verra.org/documents/vcs-guidance-buffer-and-loss-examples)).
4. Biomass credits use the cumulative difference from the baseline since day 0, minus credits already issued, exactly as VM0033 Eq. 93 does. Early years will often yield zero biomass credit, because cumulative change has not yet cleared the uncertainty. That is the honest result, not a bug.

## Seagrass and saltmarsh get area × rate × cover, not pixel-level carbon regression

**Seagrass** is the weakest link and should be presented that way. Sentinel-2 maps seagrass extent reliably only in optically shallow water:

- in turbid water, balanced accuracy stays above 0.82 at 0–4 m and drops near the optical limit at about 5 m, and the choice of atmospheric correction alone shifts derived depths by up to 2.5 m ([Kuhwald et al. 2022](https://oceanrep.geomar.de/id/eprint/54569/7/Kuhwald_Schubert_2022_RSEC.pdf));
- clear-water mapping in GEE reached about 72% overall accuracy down to 40 m ([Traganos et al. 2018](https://mdpi-res.com/d_attachment/remotesensing/remotesensing-10-01227/article_deploy/remotesensing-10-01227.pdf)).

Indian seagrass covers about 500 km², mostly in Palk Bay and the Gulf of Mannar, and is being lost at 0.7–7% a year ([NISCPR](https://or.niscpr.res.in/index.php/IJMS/article/view/18633)). Measured Indian sediment stocks are tiny compared with global defaults: **2.018 ± 0.673 Mg C/ha at Chilika and 0.998 ± 0.418 at Pulicat in the top 30 cm** ([ICAR epubs](https://epubs.icar.org.in/index.php/FT/article/view/113490)), against the IPCC default of 108 t C/ha to 1 m. VM0033 provides no seagrass soil default. It also excludes existing meadows from crediting and counts natural expansion only under strict contiguity or seed-origin tests ([VM0033](https://verra.org/wp-content/uploads/2023/09/VM0033-Methodology-for-Tidal-Wetland-and-Seagrass-Restoration-v2.1.pdf)). IPCC Tier 1 gives natural recolonisation a factor of zero and requires at least 10% cover.

The defensible approach is a Sentinel-2 seagrass extent and cover map restricted to optically shallow pixels (≤5 m unless local water clarity justifies more), multiplied by the **IPCC lower-bound rate of 0.2 t C/ha/yr (0.73 t CO2e/ha/yr)**. It applies to planted area only, with deeper or turbid pixels marked "not monitored" and given zero credit. Given the Chilika and Pulicat data, even 0.2 may be generous, and the report should say so.

**Saltmarsh** above-ground biomass can be modelled well: Byrd et al. 2018 reached 10.3% normalised RMSE from Landsat indices with random forest ([USGS](https://pubs.usgs.gov/publication/70196478)). But VM0033 treats herbaceous biomass as steady state, worth 3 t C/ha at full cover and creditable only in year one, and IPCC Tier 1 assumes no net biomass change. The creditable flux is therefore soil. Indian saltmarsh carbon data are "minimal and mostly restricted to the east coast," for example 8.42–54.6 Mg C/ha of sediment carbon in Tuticorin mixed *Suaeda* and *Salicornia* stands ([Preprints.org, non-peer-reviewed](https://www.preprints.org/manuscript/202402.0653/v1)). No Gulf of Kutch burial rate was found. Use the **IPCC tidal-marsh lower bound of 0.7 t C/ha/yr (2.57 t CO2e/ha/yr)** rather than VM0033's 1.46. VM0033 permits conservative literature values to carry 0% uncertainty, which removes the need for an allochthonous-carbon field study the project cannot do.

Multiply by the VM0033 cover factor (0 below 15% cover, linear to 1 at 50%). Sparse semi-arid Kutch marshes will often sit in the 15–50% band, so **the cover model matters more than any biomass model** for saltmarsh ([VM0033](https://verra.org/wp-content/uploads/2023/09/VM0033-Methodology-for-Tidal-Wetland-and-Seagrass-Restoration-v2.1.pdf)). Sites with salinity above 18 ppt can set methane to zero under IPCC. Brackish sites carry 193.7 kg CH4/ha/yr that must be deducted ([IPCC Ch.4 Table 4.14](https://www.ipcc-nggip.iges.or.jp/public/wetlands/pdf/Wetlands_separate_files/WS_Chp4_Coastal_Wetlands.pdf)).

## Recommended carbon model design for this project

The design below aligns with BEE BM FR05.001 for mangroves, because that methodology is legally recognised under India's CCTS. It borrows VM0033's cover gating and cumulative issuance logic, and it uses the project's synthetic control as a dynamic baseline in the spirit of VM0047 and draft VM0033 v3.0.

| Component | Mangrove | Saltmarsh | Seagrass |
|---|---|---|---|
| **Pools credited** | AGB + BGB (ML); SOC by default; litter and dead wood excluded | SOC by default only; herbaceous biomass omitted | SOC by default only; planted area only |
| **Method** | ML stock difference vs synthetic control + area × rate for soil | Area × rate × cover factor | Area × rate × cover factor, shallow pixels only |
| **Rate or factor** | AGB → tCO2e: × (1 + R) × 0.451 × 44/12, with R = 0.49 (tropical wet, east coast) or 0.29 (tropical dry, Gujarat; zone assignment to be checked); soil 0.5 t C/ha/yr for 20 yr (BM FR05.001) × cover factor | 0.7 t C/ha/yr (IPCC lower bound) × cover factor | 0.2 t C/ha/yr (IPCC lower bound) × cover factor, ≥10% cover |
| **Training labels** | GEDI L4A `agbd` footprints, 2019–2025, filtered by `l4_quality_flag == 1`, `degrade_flag == 0`, high `sensitivity`; kept only inside an eroded GMW 2020 mask that agrees with the project RF classifier; footprint `agbd_se` retained | RF classifier cover labels (existing) | Shallow-water extent from the classifier plus Allen Coral Atlas |
| **Features** | Season-matched S2 composite (bands, NDVI, EVI, OSAVI, NDRE, CIre, SWIR indices), S1 VV, VH, VH/VV, GLCM texture on NIR and VH, NASADEM, PALSAR-2 HV/HH if the ID is verified, quarter-of-year | S2 cover indices, S1 | S2 bands with depth and turbidity mask |
| **Model** | Quantile random forest (sklearn RF + leaf-weighted quantiles, or `quantile-forest`) predicting q05, q50, q95 | Cover regression or classifier probability | Same |
| **Uncertainty** | Spatial split CQR → Monte Carlo over `agbd_se`, CF and R → fully correlated plot aggregation | Area and cover interval; rate at lower bound treated as 0% | Same |
| **Explanation** | TreeExplainer on the median model, aggregated by feature family, scaled to tCO2e/ha | Cover drivers only | Cover drivers only |

The **training-set construction** is what makes quarterly outputs valid. For each GEDI footprint, compute Sentinel features from a composite of the quarter in which the footprint was acquired, and include quarter-of-year as a feature. The model then learns seasonal appearance, and quarterly predictions stay in distribution. Do not feed GEDI-derived canopy-height maps (ETH, TanDEM-X, CTrees) in as features while also training on GEDI labels. That leaks the label into the predictors. Use those maps only as independent checks.

**Validation protocol:**

1. Run spatial `GroupKFold` by site or 5 km block. Report R², RMSE, %RMSE, bias and empirical 90% interval coverage, alongside random-CV numbers to show the inflation.
2. Compute the AOA, and suppress credits for plots outside it.
3. Run an external range check against published Indian plot means (Bhitarkanika, Sundarbans), IPCC Table 4.3, ESA CCI v6 and TanDEM-X/Simard heights.
4. Run a placebo test. Apply the synthetic control to unrestored donor plots, treating each as if it were treated. The spread of those placebo "effects" is an empirical estimate of how much spurious carbon gain the model and baseline produce on their own.

**Quarterly outputs and annual crediting.** Each quarter, every plot gets a carbon state in tCO2e/ha with q05–q95 bounds and SHAP attributions. The state is ML biomass for mangroves plus default soil accrual to date, with soil accrual for all three ecosystems computed as rate × cover factor × elapsed time. Every 12 months from day 0, the plot is credited as follows:

1. Compute the net effect from same-season values: (project state − synthetic baseline) at t, minus the same quantity at day 0.
2. Take the relative uncertainty U as the larger of the combined interval half-width and the placebo spread.
3. Apply the AR-TOOL14 stepped discount: 0% at U ≤ 10%, rising to 100% of the half-width above 30%. Report the VM0033 "deduct the excess over 20%" result as a sensitivity.
4. Multiply by the minimum-quarter area.
5. Subtract a buffer of at least 12%, applied to the stock-change component.
6. Subtract credits already issued, flooring the result at zero.
7. Release any quarterly loss-event holds at this point, or cancel them against the buffer.

Realistic satellite errors put U above 30%, so this rule effectively credits the lower 90% bound. That is the project's original "minus uncertainty" intent, now tied to a recognised rule.

**Honest limitations for the project report:**

- Soil carbon, which is most of the stock, is assigned from defaults, not measured. VM0033 would require cores.
- GEDI labels carry unvalidated, site-specific bias over Indian mangroves.
- C-band and optical saturation compress high-biomass stands.
- Annual biomass change sits below the minimum detectable change, so credits arrive only after multi-year accumulation.
- Conformal coverage is marginal, not per plot.
- Seagrass mapping fails in turbid water, and seagrass credits are essentially illustrative.
- The synthetic control is only as good as its donor pool.
- Outputs are indicative MRV estimates, not verified credits under any standard.

## Conclusion

The research changes what "the carbon model" should mean for this project. A single regression from pixels to tCO2e/ha does not match how any standard or real project works. The defensible system is three layers: measured biomass, defaulted soil, and satellite-observed area and cover gates. That makes most of the engineering effort land on cover mapping, spatial validation and uncertainty bookkeeping rather than on model choice. The work is genuinely publishable rather than cosmetic in two places, where the project can go beyond typical student work. The first is season-matched GEDI training, so quarterly predictions are legitimate. The second is the placebo-donor test, which turns the synthetic control into an empirical uncertainty estimate.

The uncomfortable implication is that an honest model will issue little or no biomass credit in its first one to three years, and almost nothing for seagrass. That outcome should be presented as evidence of integrity, not failure. It also clarifies the most valuable next step. Even a handful of field plots and soil cores from one Indian site would do more for credibility than any additional satellite feature. They would convert the soil term from Tier 1 to Tier 2 and give GEDI labels a local bias correction.
