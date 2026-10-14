# ML and Remote-Sensing Methods for Mangrove AGB / Carbon (Sentinel-1, Sentinel-2, GEDI) with Uncertainty and SHAP

Scope note: about 18 tool calls were used. Several numbers come from search-engine abstracts and snippets rather than full texts; those are marked "(abstract-level)". Items marked "[training knowledge, not re-verified]" are standard references I am confident exist but did not fetch in this session. The report writer should treat them as lower confidence.

## 1. Which studies estimate mangrove AGB from S1/S2/ALOS/GEDI, and with what accuracy?

### Takeaway
Regional mangrove AGB models built from Sentinel-2 (optionally with SAR) and field plots typically reach R² around 0.6-0.8, with RMSE around 25-50 Mg/ha at sites where mean AGB is about 100-200 Mg/ha. That is roughly 20-45% relative RMSE. Very low RMSEs (about 5-7 Mg/ha) come from low-biomass sites and are not transferable. GEDI plus Sentinel fusion is emerging for the Sundarbans and for Indian forests, but GEDI L4A has large, site-dependent biases.

### Cited Findings
**Southeast Asia**
- Can Gio, Vietnam (Pham et al. 2020, *Remote Sensing*). Sentinel-2 MSI was combined with ALOS-2 PALSAR-2 HH/HV, using 121 field plots and 5 ML models compared. The best model, XGBoost regression, gave R² = 0.805 and RMSE = 28.13 Mg/ha. Predicted AGB ranged 11-293 Mg/ha, with a mean of 106.9 Mg/ha, which implies a relative RMSE of about 26% (abstract-level) — [DOAJ record, Remote Sensing Feb 2020](https://doaj.org/article/2c53ff157a3d4506a57dd10e25ac5a9c)
- Red River Delta, Vietnam (Pham et al.). Sentinel-1 VV/VH, Sentinel-2 and ALOS-2 L-band were combined, with 105 plots surveyed in Nov-Dec 2018 and XGBoost plus a genetic algorithm for feature selection. Reported R² = 0.683 and RMSE = 25.08 Mg/ha (abstract-level, from search snippet) — [U-Tokyo PDF](https://wtlab.iis.u-tokyo.ac.jp/wataru/publication/pdf/mangrove_agb_machine_learning.pdf); [Macquarie record](https://researchers.mq.edu.au/en/publications/comparison-of-machine-learning-methods-for-estimating-mangrove-ab/)
- Matang Mangrove Reserve, Malaysia (*Forests* 2025, 16(10):1517). Sentinel-2 indices were combined with ALOS-2 L-band backscatter. The best model was Random Forest, with R² = 0.735, RMSE = 46.8 t/ha and MAE = 35.4 t/ha under leave-one-out CV. The top predictors were OSAVI and HV backscatter — [MDPI Forests](https://www.mdpi.com/1999-4907/16/10/1517)
- Philippines, Sentinel imagery. Observed-versus-predicted agreement was about 0.82-0.83, with RMSE of 27.8-28.5 Mg/ha (abstract-level) — [USQ record](https://research.usq.edu.au/item/q476z/estimation-and-mapping-of-above-ground-biomass-of-mangrove-forests-and-their-replacement-land-uses-in-the-philippines-using-sentinel-imagery)
- Philippines (Castillo et al. type study, 2018 ISPRS Annals). Sentinel-2 vegetation indices (SR, SRre, NDVI) gave r² = 0.89 and RMSE = 5.69 Mg/ha with multiple regression. The search summary flagged inconsistent tables within the source, so verify before citing — [ResearchGate](https://www.researchgate.net/publication/324711398_ESTIMATION_OF_MANGROVE_FOREST_ABOVEGROUND_BIOMASS_USING_MULTISPECTRAL_BANDS_VEGETATION_INDICES_AND_BIOPHYSICAL_VARIABLES_DERIVED_FROM_OPTICAL_SATELLITE_IMAGERIES_RAPIDEYE_PLANETSCOPE_AND_SENTINEL-2)
- Sentinel-1-only mangrove AGB modelling (2018, ISPRS Annals IV-3:13). Reported R² of about 0.79, but the RMSE units in the table are ambiguous ("Mg" rather than Mg/ha), so it is not comparable — [ADS abstract](https://ui.adsabs.harvard.edu/abs/2018ISPAn.IV3...13L/abstract)
- Zhejiang, China (low-biomass planted and natural mangroves, Sentinel-2). XGBoost was best, with R² = 0.68 and RMSE = 6.85 Mg/ha, and texture variables contributed most — [ResearchGate](https://www.researchgate.net/publication/395598412_Estimating_coastal_mangrove_aboveground_biomass_of_Zhejiang_province_based_on_sentinel-2_images_and_multiple_machine_learning_algorithms)

**India and Bangladesh (Sundarbans)**
- Bhitarkanika, Odisha. Sentinel-1 and PALSAR-2 SAR fusion in an ML framework, described as the first such fusion for the site (*Ecological Informatics* 2022). The full text was paywalled (HTTP 403), so I could not obtain metrics — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S1574954122003508)
- Bhitarkanika canopy height (Ghosh et al. 2020, *Remote Sensing*). Sentinel-1 coherence and Sentinel-2 biophysical variables were used. RF gave RMSE 1.57 m and R² 0.60, and symbolic regression gave RMSE 1.48 m and R² 0.62. Fraction of vegetation cover was the key predictor — [summary page](https://gpbib.cs.ucl.ac.uk/gp-html/ghosh_2020_RS.html)
- The related thesis on Indian tropical forests (including Bhitarkanika) reports AGB from ML with a maximum R² of 0.42 and RMSE of about 94 Mg/ha. The site attribution is unclear — [Ghosh thesis](https://gpbib.cs.ucl.ac.uk/gp-html/Ghosh_thesis.html)
- Sundarbans (2026, *Remote Sensing Applications: Society and Environment*, Islam et al.). The study produced a 10 m canopy height and AGB dataset for 2016-2024 from quality-filtered GEDI plus optical, radar and topographic predictors. Reported AGB RMSE was 11.06 Mg/ha with R² = 0.85, and agreement with GEDI references was better than for global products (snippet-level). Note that the validation is against GEDI-derived references, not field plots — [GEDI publications list](https://gedi.umd.edu/science/publications/)
- Sundarbans forest-stocking change (Ali and Rahman 2024) combined the SRTM C-band InSAR DSM with GEDI LiDAR to map long-term stocking change and found degradation — [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2666017224000658)
- Lothian Island, Indian Sundarbans. SAR-based AGB compared L-band ALOS-PALSAR-2 with C-band data (snippet-level, no metrics retrieved) — [Springer review, J. Indian Soc. Remote Sens. 2024](https://link.springer.com/article/10.1007/s12524-024-01868-4)
- Indian forests, not mangroves: GEDI L4A plus Sentinel-1 and Sentinel-2 fusion. A model fitted with field data plus GEDI gave %RMSE = 45.0, versus 84.6 for GEDI L4A alone. A related study reported R² 0.64 and RMSE 46.59 Mg/ha at 100 m using GEDI L4A AGBD — [ResearchGate](https://www.researchgate.net/publication/377940757_Forest_aboveground_biomass_estimation_by_GEDI_and_multi-source_EO_data_fusion_over_Indian_forest); [ScienceDirect 2024](https://www.sciencedirect.com/science/article/pii/S1574954124002541)

**Global and reference products**
- Simard et al. 2019, *Nature Geoscience* 12:40-45. Global mangrove canopy height and AGB (nominal year 2000, 30 m) come from SRTM heights with region-specific allometry, validated against field plots. Global mangrove carbon stock (AGB + BGB + soil) is about 5.03 Pg, and the tallest stands are 62.8 m in Gabon. The dataset is on the GEE community catalog — [NTRS PDF](https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20190029179.pdf); [ORNL DAAC](https://daac.ornl.gov/CMS/guides/CMS_Global_Map_Mangrove_Canopy.html); [GEE community catalog](https://gee-community-catalog.org/projects/gmd/)
- A newer global mangrove height map at 12 m comes from TanDEM-X (2011-2013), calibrated with GEDI. Height RMSE is 2.4 m — [Aberystwyth](https://research.aber.ac.uk/en/publications/a-new-global-mangrove-height-map-with-a-12-meter-spatial-resoluti/)
- A global mangrove AGB map using RF on multisource data (*Remote Sensing* 2020, 12(10):1690) reported R² = 0.48 and RMSE = 75.85 Mg/ha — [MDPI](https://doi.org/10.3390/rs12101690)

### Inferences
- For a fair benchmark, report relative RMSE (RMSE / mean observed AGB). Absolute RMSE scales with site biomass: the Zhejiang 6.85 Mg/ha and the Matang 46.8 Mg/ha may be similarly good relative to their means.
- C-band Sentinel-1 alone is weak for dense mangroves. L-band (ALOS-2) consistently appears in the best-performing fusion models. A free alternative in GEE is the JAXA ALOS PALSAR-2 yearly mosaic (`JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH`) [training knowledge, not re-verified].
- With about 30-100 plots, students should expect R² of about 0.5-0.7 under honest (spatial) validation.

### Gaps
- Exact metrics for the Bhitarkanika S1+PALSAR-2 paper (paywalled) and for the 2026 Sundarbans GEDI paper's validation design (full text not fetched).
- I found no CNN-based mangrove AGB study with numbers. Deep learning appears mainly in global canopy-height work (e.g., Lang et al. global 10 m canopy height from GEDI + Sentinel-2) — [arXiv 2204.08322](https://arxiv.org/abs/2204.08322v1)

## 2. Which predictors matter most, and what saturation problems are known?

### Takeaway
The predictors that recur as most important are red-edge and SWIR-based indices (OSAVI, SRre, NDVI variants), L-band HV (or C-band VH) backscatter, GLCM texture, and canopy height (from GEDI, TanDEM-X or SRTM). NDVI and other optical indices saturate in dense, high-biomass canopies. Canopy height is the strongest structural proxy.

### Cited Findings
- In Matang, the top predictors were OSAVI (from Sentinel-2) and HV polarization (L-band) — [MDPI Forests 2025](https://www.mdpi.com/1999-4907/16/10/1517)
- In Zhejiang, Sentinel-2 texture variables contributed most to the XGBoost AGB model — [ResearchGate](https://www.researchgate.net/publication/395598412_Estimating_coastal_mangrove_aboveground_biomass_of_Zhejiang_province_based_on_sentinel-2_images_and_multiple_machine_learning_algorithms)
- In the Philippines Sentinel-2 study, the best VIs were SR, red-edge SR (SRre) and NDVI — [ResearchGate](https://www.researchgate.net/publication/324711398_ESTIMATION_OF_MANGROVE_FOREST_ABOVEGROUND_BIOMASS_USING_MULTISPECTRAL_BANDS_VEGETATION_INDICES_AND_BIOPHYSICAL_VARIABLES_DERIVED_FROM_OPTICAL_SATELLITE_IMAGERIES_RAPIDEYE_PLANETSCOPE_AND_SENTINEL-2)
- In Bhitarkanika, fraction of vegetation cover from Sentinel-2 was the key canopy-height predictor — [Ghosh 2020](https://gpbib.cs.ucl.ac.uk/gp-html/ghosh_2020_RS.html)
- Optical-only canopy height estimates suffer from saturation in tall canopies. The global 10 m GEDI + Sentinel-2 model was designed to reduce this — [Lang et al., arXiv](https://arxiv.org/abs/2204.08322v1)
- In Simard et al. 2019, canopy height is the basis of mangrove AGB through height-based allometry, and climate (precipitation, temperature, cyclone frequency) explains 74% of global variation in maximum canopy height — [NTRS PDF](https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20190029179.pdf)

### Inferences
- For the project's existing GEE stack (S2 bands and indices, S1 VV/VH, NASADEM), the highest-value free additions are likely:
  - Sentinel-2 red-edge indices (NDRE, CIre, S2REP)
  - GLCM texture (`ee.Image.glcmTexture`) on NIR and VH
  - ALOS PALSAR-2 annual HV
  - A canopy-height layer (Simard 2019 height, or Lang 2022/Meta canopy height)
- NASADEM elevation in mangroves is close to sea level, and the SRTM-era DSM includes canopy height. It is therefore a partial canopy-height proxy rather than a terrain variable. That is useful, but it is dated to 2000.
- C-band VH saturates at moderate biomass, probably well below the 150-300 Mg/ha of mature Sundarbans stands. I found no mangrove-specific saturation threshold in this session.

### Gaps
- I found no peer-reviewed numeric NDVI or VH saturation threshold for mangroves in this session.

## 3. How is ground truth obtained (plots + allometry, GEDI footprints, map-to-map), and what are the pitfalls?

### Takeaway
Field plots with species-specific or pan-tropical mangrove allometry are the gold standard. GEDI L4A footprints are free and plentiful, but they carry large biases and their own model error, and they have no mangrove-specific validation that I could find. Training on an existing biomass map (e.g., Simard 2019) is "map-to-map" learning. It inherits that map's error, its date (around 2000) and its circularity: the model can only learn to reproduce the source map.

### Cited Findings
- GEDI footprints are about 25 m in diameter, spaced 60 m along-track and 600 m across-track. Wall-to-wall maps therefore require fusion with imagery — [Springer review](https://link.springer.com/article/10.1007/s12524-024-01868-4); [GEDI publications](https://gedi.umd.edu/science/publications/)
- GEDI covers only about 51.6°N-51.6°S and samples about 4% of the land surface, so all of India's mangroves are inside coverage — [arXiv canopy-height papers via search](https://arxiv.org/pdf/2107.07431)
- GEDI L4A biases vary by site:
  - At US NEON sites, L4A underestimates (bias −31.65 Mg/ha, %RMSE 19-50% at 14 of 19 sites).
  - In Lao forest types, absolute biases ranged from −54.24 to +106.23 Mg/ha, and local recalibration cut bias by 42.2 Mg/ha on average.
  - In a Sudanian savanna, L4A was about 2.1x field values (18.71 vs 8.89 Mg/ha).
  - Sources: [MDPI Forests 15(12):2095](https://www.mdpi.com/1999-4907/15/12/2095/html); [GIScience & RS Dec 2024](https://doaj.org/article/f2eed9032a5f476eb4d29dc55f8f9c0d); [MDPI RS 18(16):2751](https://mdpi.com/2072-4292/18/16/2751)
- In Indian forests, a field + GEDI model gave %RMSE 45.0, versus 84.6 for raw GEDI L4A — [ResearchGate](https://www.researchgate.net/publication/377940757_Forest_aboveground_biomass_estimation_by_GEDI_and_multi-source_EO_data_fusion_over_Indian_forest)
- The GEDI L4A product provides per-footprint AGBD with prediction standard errors. Version 2.1 is distributed by ORNL DAAC — [Earthdata L4A V2.1](https://earthdata.nasa.gov/data/catalog/ornl-cloud-gedi-l4a-agb-density-v2-1-2056-2.1)
- Simard 2019 AGB is nominal year 2000, at 30 m, derived from SRTM height via region-specific allometry — [ORNL DAAC guide](https://daac.ornl.gov/CMS/guides/CMS_Global_Map_Mangrove_Canopy.html)
- A global mangrove carbon effort uses a GEDI-calibrated 12 m TanDEM-X height map plus 4,520 mangrove field biomass plots — [ASLO abstract](https://aslo.secure-platform.com/2023/solicitations/12/sessiongallery/912/application/7048)

### Inferences
Pitfalls for the project:
- **Temporal mismatch.** Simard labels are from about 2000, while the Sentinel predictors run from 2015 onward. Mangrove loss or gain since then produces label noise. Erosion in the Sundarbans has been documented: [Ali and Rahman 2024](https://www.sciencedirect.com/science/article/pii/S2666017224000658)
- **Circularity.** A model trained on Simard AGB, validated on held-out Simard pixels, and reporting high R² only shows that it reproduces Simard. It does not show agreement with true biomass. State this explicitly and, ideally, check against independent published plot values for Indian sites.
- **Error propagation.** Label error (allometry plus source-map RMSE) is not captured by CV residuals against the labels. Total uncertainty must add the label uncertainty.
- **Geolocation mismatch.** GEDI footprints (25 m, about 10 m geolocation error) are compared against 10-20 m Sentinel pixels, so a 3x3 pixel mean is advisable. The geolocation figure is training knowledge, not verified this session.
- GEDI L4A is acceptable as labels only if quality filtering is used (`l4_quality_flag == 1`, the beam-sensitivity filter, leaf-on, and the correct mangrove/EBT PFT model) [training knowledge, not re-verified]. Note also that GEDI L4A has no mangrove-specific predictor model.

### Gaps
- I found no published validation of GEDI L4A specifically over mangrove field plots.
- I did not retrieve Simard 2019's AGB RMSE versus field plots. It is reported in the paper and DAAC guide, which I did not fetch in full.

## 4. Validation: spatial versus random CV, and area of applicability

### Takeaway
Random K-fold CV on spatially autocorrelated biomass data strongly overstates accuracy. Use spatial block CV or buffered leave-one-out (or design-based probability-sample validation), and report the area of applicability.

### Cited Findings
- Ploton et al. 2020 (*Nature Communications* 11:4540, doi:10.1038/s41467-020-18321-y) used an RF on 11.8 million trees in central Africa. Non-spatial CV suggested the model explained more than half of AGB variation, but spatial CV showed almost no predictive power. The authors argue this overoptimism helps explain disagreements between large-scale biomass maps — [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7486894/)
- Counterpoint: Wadoux et al. 2021 (*Ecological Modelling* 457) argue that spatial CV lacks a theoretical basis for map accuracy assessment. They favour design-based inference from probability sampling, while agreeing that standard CV is deficient for clustered data — [IDEAS/RePEc](https://ideas.repec.org/a/eee/ecomod/v457y2021ics0304380021002489.html)
- Meyer and Pebesma 2021 (*Methods in Ecology and Evolution* 12:1620-1633, doi:10.1111/2041-210X.13650) define the Area of Applicability (AOA) using a dissimilarity index. The DI is the importance-weighted distance in predictor space to the nearest training point, thresholded using the DI distribution from CV. It is implemented in the R package CAST — [arXiv](https://arxiv.org/abs/2005.07939); [CAST vignette](https://cran.r-project.org/web/packages/CAST/vignettes/cast04-AOA-tutorial.html)
- One limitation of AOA is that a single training point can make a region "applicable". The DI does not distinguish dense from sparse training coverage — [EGU24-10278](https://meetingorganizer.copernicus.org/EGU24/EGU24-10278.html); [GMD 2025](https://gmd.copernicus.org/articles/18/10185/2025/gmd-18-10185-2025.pdf)
- Meyer and Pebesma 2022 (*Nature Communications*) discuss the challenges of assessing global ML ecological maps — [cited via PMC search result](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7486894/)

### Inferences
- In scikit-learn, assign spatial blocks (e.g., 1-5 km grid cells, or one block per mangrove site or island) and use `GroupKFold` or `LeaveOneGroupOut`. Choose a block size of at least the variogram range of the residuals.
- A Python AOA can be written in about 20 lines:
  1. Standardize the features.
  2. Weight them by permutation or SHAP importance.
  3. Compute the nearest-neighbour distance to training points (`sklearn.neighbors.NearestNeighbors`).
  4. Divide by the mean training inter-point distance.
  5. Set the threshold at the outlier-removed maximum of the CV DI.
- The Ploton result especially matters for map-to-map learning. Pixels drawn from the same Simard map are highly autocorrelated, so random CV will look excellent.

### Gaps
- No mangrove-specific study comparing random and spatial CV was found.

## 5. Uncertainty: QRF, conformal prediction, bootstrap, Monte Carlo, plot-level aggregation

### Takeaway
For scikit-learn, practical options are quantile regression forests (the `quantile-forest` package) and conformal prediction (MAPIE, split or CQR, ideally with spatially grouped calibration). Both give per-prediction intervals. Conformal adds a finite-sample marginal coverage guarantee, but that guarantee requires exchangeability, which spatial clustering violates. Total uncertainty should also propagate label and allometric error via Monte Carlo, and plot-level aggregation must account for spatially correlated pixel errors.

### Cited Findings
- Kuronen et al. 2025 (*Remote Sensing of Environment*) applied conformal prediction to k-NN forest-attribute maps built from Sentinel-2 and ALS. The intervals achieved the nominal coverage (e.g., 90%), and some conformal k-NN variants were competitive with conformalized quantile regression. The authors recommend conformal prediction for unit-level uncertainty of forest maps — [LUKE repository](https://jukuri.luke.fi/handle/11111/23114)
- A QRF for forest AGB in Murcia, Spain (*Remote Sensing* 2019) used ALS, MODIS NDVI and topography. It gave R² 0.71 and RMSE 9.99 t/ha, with independent validation of R² 0.70 and RMSE 10.25 t/ha, and produced per-pixel uncertainty maps — [DOAJ RS Apr 2019](https://doaj.org/article/7e9561b7976d4e4091a127f4f2b941e7)
- A quantile regression neural network for *Pinus densata* AGB used Sentinel-2 and 146 plots, and was designed to reduce the over- and underestimation typical of optical AGB — [DOAJ RS Jan 2023](https://doaj.org/article/1a9bda14b6424b4b808b092767164ac5)
- An EO regression UQ benchmark (2026 preprint) found Gaussian uncertainty heads best for canopy height and AGB — [arXiv 2607.11412](https://arxiv.org/pdf/2607.11412)
- Quantile-regression canopy height models produce well-calibrated intervals. The authors note that height uncertainty can be propagated through nonlinear allometry to AGB and carbon — [arXiv 2604.06988](https://arxiv.org/pdf/2604.06988)
- Global 10 m canopy height (Lang et al.) includes probabilistic per-pixel uncertainty — [arXiv 2204.08322](https://arxiv.org/abs/2204.08322v1)
- GEDI L4A distributes per-footprint standard errors alongside AGBD — [Earthdata](https://earthdata.nasa.gov/data/catalog/ornl-cloud-gedi-l4a-agb-density-v2-1-2056-2.1)
- Foundational references [training knowledge, not re-verified]:
  - Meinshausen 2006, "Quantile Regression Forests", JMLR 7:983-999 — [JMLR](https://jmlr.org/papers/v7/meinshausen06a.html)
  - Romano, Patterson and Candès 2019, "Conformalized Quantile Regression", NeurIPS — [arXiv 1905.03222](https://arxiv.org/abs/1905.03222)
  - The `quantile-forest` package (Zillow; a scikit-learn-compatible `RandomForestQuantileRegressor` with `predict(quantiles=[...])`) — [GitHub](https://github.com/zillow/quantile-forest)
  - MAPIE (scikit-learn-contrib; split, jackknife+ and CQR regressors) — [GitHub](https://github.com/scikit-learn-contrib/MAPIE)
  - ESA CCI Biomass distributes a per-pixel AGB standard-deviation layer with each AGB map.

### Inferences
Recommended uncertainty pipeline:
1. **Model and predictor uncertainty.** Fit a QRF and take the 5th, 50th and 95th percentiles. Then conformalize with MAPIE CQR, or by hand: compute the conformity scores max(q_lo − y, y − q_hi) on a held-out, spatially separate calibration set, and widen the intervals by their (1−α)(1+1/n) quantile.
2. **Coverage check.** Report empirical coverage under spatial CV, not random CV.
3. **Label and allometric uncertainty.** Run a Monte Carlo of N ≈ 1000 draws:
   - Perturb the labels by their SE (e.g., the Simard RMSE or the GEDI L4A SE).
   - Draw the carbon fraction (IPCC 95% CI 42.9-47.1%).
   - Draw the root:shoot ratio R (95% CI 0.47-0.51 for tropical wet).
   - Refit or re-predict, then take percentiles of the resulting tCO2e/ha distribution.
4. **Plot-level aggregation.** Averaging n pixels does not shrink the error by √n when errors are spatially correlated, because neighbouring pixels share the same predictor and label biases. Two practical options:
   - Treat the interval as fully correlated, so the plot interval equals the interval on the plot-mean prediction. This is conservative.
   - Fit a variogram to the CV residuals, compute the variance of the plot mean as (1/n²)ΣΣ C(dᵢⱼ), and simulate.
   - For a student project, the conservative option (predict on the plot-mean feature vector, or average pixel quantiles) is defensible and should be stated as an assumption.
5. **Exchangeability caveat.** Conformal guarantees are marginal (on average over locations), not conditional on a given plot. Spatial autocorrelation between calibration and test data can make coverage optimistic. Use group-wise calibration split by spatial blocks.

### Gaps
- I found no paper applying split-conformal or CQR on top of a QRF specifically for mangrove or forest AGB maps.
- I found no peer-reviewed mangrove study handling pixel-to-plot error correlation explicitly.
- The ESA CCI Biomass SD-layer description was not fetched this session.

## 6. SHAP for remote-sensing biomass models

### Takeaway
SHAP (TreeExplainer) is now commonly used with RF, XGBoost and CatBoost AGB models, both for feature selection and for interpretation. Mangrove-specific SHAP studies were not found in this session. Per-plot waterfall or force plots plus a global beeswarm plot are the standard presentation.

### Cited Findings
- A *Remote Sensing* 2025 study (17(14):2493, *Pinus kesiya*, Yunnan) fused Landsat 8, Sentinel-2, GEDI, ICESat-2, ALOS-2 and SAOCOM. It used a SHAP-based dual-variable selection strategy, with GA-tuned elastic net, Lasso, SVR, RF and CatBoost — [MDPI](https://www.mdpi.com/2072-4292/17/14/2493)
- A *Forests* 2025 study (16(12):1777) used GaoFen-7 imagery with RF, GBT, XGBoost and stacking under 5-fold CV. SHAP identified key variables, with NDVI and EVI important — [MDPI](https://www.mdpi.com/1999-4907/16/12/1777/htm)
- A Sentinel-2 + SDGSAT-1 study used LASSO plus SHAP. The best model was Theil-Sen, with R² = 0.79, MAE = 22.97 t/ha and RMSE = 28.38 t/ha — [Bartın Univ. repository](https://acikerisim.bartin.edu.tr/entities/publication/e96e172f-90e4-4528-9420-149bf63a45e4/full)
- Lundberg et al. 2020, "From local explanations to global understanding with explainable AI for trees", *Nature Machine Intelligence* 2:56-67, introduced TreeExplainer (exact, polynomial-time SHAP for tree ensembles) [training knowledge, not re-verified] — [Nature MI](https://www.nature.com/articles/s42256-019-0138-9)

### Inferences
- `shap.TreeExplainer(model)` works on sklearn `RandomForestRegressor`, on `quantile-forest`'s RFQR (via its underlying trees, but it explains the mean prediction, not the quantile), and on XGBoost or LightGBM.
- Per plot, show:
  - A waterfall plot from the base value (mean training AGB) to the plot prediction, listing the top 5-8 features and their values.
  - A plain-language sentence, e.g., "High VH backscatter (+18 Mg/ha) and NDRE (+12) raised this plot's estimate; low elevation (−6) lowered it".
  - Conversion of SHAP values from Mg/ha AGB to tCO2e/ha. This is linear, by multiplying by CF × (1+R) × 44/12, because the conversion is a constant scale.
- Caveats to state:
  - SHAP explains the model, not causal ecology.
  - Correlated features (e.g., NDVI and EVI, or VV and VH) split credit arbitrarily.
  - Explanations are unreliable outside the AOA.
- Group correlated features, or report SHAP aggregated by feature family (optical, SAR, texture, topography).

### Gaps
- No mangrove-specific SHAP AGB paper was retrieved in this session.

## 7. Converting AGB to carbon and CO2e

### Takeaway
Use the IPCC 2013 Wetlands Supplement mangrove defaults: CF = 0.451 t C/t dm (not the generic 0.47), R (BGB/AGB) = 0.49 for tropical wet mangroves (0.29 tropical dry, 0.96 subtropical), and 44/12 for C to CO2.

Formula: tCO2e/ha = AGB × (1 + R) × CF × 44/12.

For AGB = 150 Mg/ha in tropical wet mangroves: 150 × 1.49 × 0.451 × 3.667 ≈ 370 tCO2e/ha.

### Cited Findings
All values below are from the IPCC 2013 Wetlands Supplement, Ch. 4 Coastal Wetlands, read directly from the PDF — [IPCC Ch.4](https://www.ipcc-nggip.iges.or.jp/public/wetlands/pdf/Wetlands_separate_files/WS_Chp4_Coastal_Wetlands.pdf).
- **Table 4.2, carbon fraction of mangrove AGB (leaves + wood):** 45.1% C (n = 47), 95% CI 42.9-47.1, range 42.2-50.2.
- **Table 4.5, R = BGB/AGB:**
  - Tropical wet: 0.49 (95% CI 0.47-0.51; range 0.04-1.1; n = 18).
  - Tropical dry: 0.29 (0.28-0.30; range 0.09-0.79; n = 9).
  - Subtropical: 0.96 (0.91-1.0; n = 18). The printed range of 0.22-0.27 is inconsistent with the mean and is likely a typo in the source.
  - Superscript footnote markers were merged into the numbers in text extraction (e.g., "0.492" is 0.49 with footnote 2, and "0.964" is 0.96 with footnote 4).
- **Table 4.3, default AGB (t dm/ha):** Tropical wet 192 (CI 187-204, n = 49); tropical dry 92 (88-97, n = 13); subtropical 75 (66-84, n = 10).
- **Table 4.4, AGB growth (t dm/ha/yr):** Tropical wet 9.9; tropical dry 3.3; subtropical 18.1. Defaults apply only until the stock in Table 4.3 is reached.
- A peer-reviewed paper reports a measured mangrove carbon fraction of 46.82%, with species-specific values of 45.9-47.1%. This is a research value, not an IPCC default — [Malaysian J. Science](https://jpmm.um.edu.my/index.php/MJS/article/download/36905/15763/113969)

### Inferences
- The choice between 0.47 and 0.48 comes from generic forest defaults (IPCC 2006: 0.47) and Verra/CDM tools. For mangroves the Wetlands Supplement value of 0.451 is more defensible, and its CI should be fed into the Monte Carlo.
- The Sundarbans and most Indian east-coast mangroves fall in "tropical wet". Gujarat and Kutch mangroves are closer to "tropical dry" (R = 0.29). Which zone applies to a given Indian mangrove is my inference, so check the climate-zone definitions in IPCC 2006 Vol. 4 Ch. 3.
- Soil carbon (often the majority of mangrove carbon) is not captured by AGB models, so the per-plot number should be labelled "biomass carbon (AGB + BGB)".

### Gaps
- No Indian species-specific mangrove root:shoot ratios were retrieved.

## 8. Can year-to-year or quarter-to-quarter AGB change be detected?

### Takeaway
Probably not for undisturbed stands. Typical model RMSEs of about 25-50 Mg/ha far exceed the expected annual AGB increment of about 10 Mg/ha/yr (IPCC tropical wet default). Only large disturbances (clearing, cyclone damage, erosion) are detectable at annual or sub-annual scale. Gradual growth needs multi-year trends.

### Cited Findings
- IPCC default mangrove AGB growth is 9.9 t dm/ha/yr for tropical wet, 3.3 for tropical dry, and 18.1 for subtropical — [IPCC Ch.4](https://www.ipcc-nggip.iges.or.jp/public/wetlands/pdf/Wetlands_separate_files/WS_Chp4_Coastal_Wetlands.pdf)
- Regional mangrove AGB RMSEs are 25.08 Mg/ha (Red River), 28.13 (Can Gio) and 46.8 (Matang) — [U-Tokyo PDF](https://wtlab.iis.u-tokyo.ac.jp/wataru/publication/pdf/mangrove_agb_machine_learning.pdf); [DOAJ](https://doaj.org/article/2c53ff157a3d4506a57dd10e25ac5a9c); [MDPI](https://www.mdpi.com/1999-4907/16/10/1517)
- A Sundarbans 2016-2024 time series of 10 m AGB has been produced from GEDI + multisensor fusion (annual products) — [GEDI publications](https://gedi.umd.edu/science/publications/)
- Long-term Sundarbans stocking change was detected by differencing SRTM (2000) and GEDI (2019+) heights, i.e., across about two decades — [ScienceDirect 2024](https://www.sciencedirect.com/science/article/pii/S2666017224000658)

### Inferences
- **Minimum detectable change.** At 95% confidence with independent errors, MDC ≈ 1.96 × √2 × σ ≈ 2.77σ.
  - With σ = 25 Mg/ha, MDC ≈ 69 Mg/ha.
  - If errors are strongly positively correlated between dates (same model, same bias), the differencing error shrinks, but the correlation is unknown and the systematic bias still affects the absolute stock.
  - Quarter-to-quarter changes are dominated by phenology, tide state (water under the canopy alters S1 backscatter and S2 reflectance) and cloud/haze. They should not be reported as carbon change.
- Recommendation: report annual (dry-season composite) stocks with intervals. Flag change as significant only when the intervals of the two years do not overlap, or when |Δ| > MDC. Present quarterly values as monitoring indicators (e.g., NDVI or VH anomalies for disturbance alerts), not as tCO2e changes.
- This MDC formula is standard statistics applied by me. I did not find a mangrove paper reporting MDC.

### Gaps
- No peer-reviewed estimate of minimum detectable AGB change for Sentinel-based mangrove models was found.

---

### Synthesis: best practice for a student GEE (Python) + scikit-learn project with free data only (inferences built on the cited findings above)

1. **Labels**
   - Prefer real field AGB from published Indian plot studies, if obtainable.
   - Otherwise, use quality-filtered GEDI L4A footprints in mangrove masks (Global Mangrove Watch), with the footprint SE retained.
   - Use Simard 2019 AGB only as a secondary or comparison label, explicitly noting its year-2000 date and its circularity.
   - Never validate only against the same map used for training.
2. **Predictors**
   - Use dry-season S2 median composites: bands, NDVI, EVI, red-edge indices and SWIR indices.
   - Use the S1 VV/VH median and the VH/VV ratio.
   - Add GLCM texture, ALOS PALSAR-2 annual HV/HH, a canopy height layer, and NASADEM.
   - Match the composite years to the label year.
3. **Models**
   - Start with RF, using `quantile-forest`'s `RandomForestQuantileRegressor`.
   - Compare against XGBoost or LightGBM using a fixed spatial CV.
   - Keep the model simple, because small n means feature selection matters more than the algorithm.
4. **Validation**
   - Use spatial block `GroupKFold`, and report R², RMSE, %RMSE and bias.
   - Also report random-CV numbers to show the inflation, in the spirit of Ploton.
   - Compute an AOA mask and flag plots outside it.
5. **Uncertainty**
   - Combine QRF 5/50/95 quantiles with spatially grouped conformal calibration (MAPIE CQR or a manual implementation), and report empirical coverage.
   - Run a Monte Carlo over the label SE, CF (0.451, CI 0.429-0.471) and R (0.49, CI 0.47-0.51).
   - Aggregate to the plot conservatively, treating errors as fully correlated.
6. **Explainability**
   - Use TreeExplainer SHAP on the median model.
   - Show per-plot waterfalls converted to tCO2e/ha and a global beeswarm, grouped by feature family.
7. **Carbon**
   - tCO2e/ha = AGB × (1+R) × CF × 44/12, labelled as biomass carbon only.
8. **Change**
   - Report annual stocks.
   - Claim change only beyond the MDC (about 2.8σ) or with non-overlapping intervals.
   - Treat quarterly signals as disturbance alerts only.
