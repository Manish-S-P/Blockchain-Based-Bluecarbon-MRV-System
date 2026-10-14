# How Real Blue Carbon Projects Estimate Carbon, and the Soil vs Biomass Split

Research date: 2026-10-08. All numbers are as reported by the cited source. Several primary PDFs (Mikoko Pamoja PDD, Vanga PDD, Delta Blue Carbon PDD, Fourqurean 2012) could not be fetched in full (timeouts / 403); where a figure comes from a search-result excerpt of a primary document, that is stated. Mg C/ha = t C/ha; multiply by 3.67 to get t CO2e/ha.

## 1. Soil vs biomass partition of carbon (mangrove, seagrass, tidal marsh) and what satellites can and cannot see

### Takeaway
In all three blue carbon ecosystems, most carbon sits in soil, not in what a satellite sees. Mangrove soils hold about 49–98% of ecosystem carbon (Donato 2011). Kauffman 2020 puts soil to 1 m at about 44% of the total, and soils below 1 m hold much more. Seagrass and saltmarsh carbon is overwhelmingly in soil, with seagrass living biomass usually only a few Mg C/ha. Sentinel-1/2 can map extent, change and, for mangroves, above-ground biomass proxies. It cannot directly observe soil carbon, which has to come from field cores or literature/IPCC defaults.

### Cited Findings
**Mangroves – global**
- Donato et al. 2011 (Nature Geoscience 4:293–297, doi:10.1038/ngeo1123) sampled 25 Indo-Pacific mangrove forests. The mean was 1,023 Mg C/ha. Organic-rich soils 0.5 m to >3 m deep held 49–98% of stored carbon. Emissions from mangrove loss are estimated at 0.02–0.12 Pg C/yr, about 10% of global deforestation emissions, although mangroves are about 0.7% of tropical forest area — [Donato 2011 PDF (Forest Trends)](https://www.forest-trends.org/wp-content/uploads/imported/Donato_2011.pdf); [USDA Treesearch record](https://www.fs.usda.gov/treesearch/pubs/38862)
- Kauffman et al. 2020 (Ecological Monographs 90(2): e01405, doi:10.1002/ecm.1405) sampled 190 sites on five continents with consistent methods. Soil carbon to 1 m averaged 44% of total ecosystem carbon stock (TECS). Limiting soil sampling to the top 1 m "results in large underestimates of TECS". The global estimate is 11.7 Pg C: 1.6 Pg C above-ground and 10.2 Pg C below-ground (roots + soil). The IPCC Tier 1 default TECS of 511 Mg C/ha is "only 60%" of the study's global mean — [USP repository record](https://repositorio.usp.br/item/002991980); [CIFOR-ICRAF](https://www.cifor-icraf.org/knowledge/publication/7597)
  - Derived from the above: 511 / 0.60 gives a global mean TECS of roughly 850 Mg C/ha. I did not retrieve the exact mean ± SE from the text.
  - Global partition from the Kauffman totals: 1.6/11.7 ≈ 14% above-ground and ≈ 86% below-ground (roots + soil, all depths).
- Kauffman & Bhomia's regional West-Central Africa study found soils averaged 86% of total stock. This is a regional figure, not the global 2020 figure — [search summary of Kauffman literature; see CIFOR-ICRAF](https://www.cifor-icraf.org/knowledge/publication/7597)
- A planted-mangrove synthesis (Science Advances, doi:10.1126/sciadv.adk5430) found that soil made up 83–95% of total ecosystem C in the first 5 years after planting — [Science Advances](https://www.science.org/doi/10.1126/sciadv.adk5430)
- A 2023 review gives 59.8 ± 30.8 kg C/m² (range 25.5–95.6), i.e. ~598 Mg C/ha, as the mangrove organic C pool. It cites a broad reference list — [ScienceDirect review 2024](https://www.sciencedirect.com/science/article/pii/S1385110124000376)

**Mangroves – India / South Asia** (depths and methods differ, so values are not directly comparable)
- Indian Sundarbans (Springer, Tropical Ecology 2020): sediment OC content was 0.92–3.29% (mean 1.99%). This gives 59.14 Tg OC to 90 cm across the intertidal area. Mean AGB was 40.35 Mg/ha and BGB 19.57 Mg/ha, with carbon fraction 40.5%. Total biomass carbon was 10.35 Tg. On these numbers about 85% of Sundarbans carbon is in sediment (59.14 vs 10.35 Tg) — [Springer](https://link.springer.com/article/10.1007/s42965-020-00130-5)
- Indian Sundarbans average SOC stock: 38–87 Mg C/ha (Ray et al. 2016, as cited in a review). The same study reports a whole-forest sequestration rate of 17.21 Mg C/ha/yr — [Sundarbans carbon stock (ResearchGate)](https://www.researchgate.net/publication/280315547_Carbon_stock_in_the_Sundarbans_mangrove_forest_spatial_variations_in_vegetation_types_and_salinity_zones); [India Water Portal synthesis](https://www.indiawaterportal.org/environment/carbon-vaults-of-the-coast-unlocking-indias-mangrove-potential)
- Indian Sundarbans after cyclones: a 31% rise in soil salinity was associated with a 46% reduction in the soil organic blue carbon pool — [PMC10381154](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10381154/)
- Bhitarkanika (Odisha): SOC value 177 ± 14 (Bhomia et al. 2016, cited in an Indian review; units presumed Mg C/ha, source excerpt truncated). AGB above 200 Mg/ha in undisturbed stands — [Springer, Ocean Dynamics 2026 India synthesis](https://link.springer.com/article/10.1007/s10236-026-01836-1)
- Pichavaram (Tamil Nadu), SOC to 90 cm: natural stand 146.1 Mg C/ha. Restored stands of various ages: 99.29, 93.18, 57.41, 95.54 and 84.84 Mg C/ha. Burial rates of 2.33–4.44 g C/m²/yr were reported; that is very low and may be a unit issue in the source, so verify. Natural stands had higher SOC and burial than restored ones — [ResearchGate](https://www.researchgate.net/publication/333603613_Soil_organic_carbon_stock_in_natural_and_restored_mangrove_forests_in_Pichavaram_south-east_coast_of_India)
- India systematic review: average sediment carbon 48.3 ± 8.8 Mg C/ha, biomass carbon 109 ± 48 Mg C/ha, total 157.3 ± 56.8 Mg C/ha. This review gives a biomass-dominated result that conflicts with global syntheses, probably because of shallow soil sampling — [India Water Portal / review](https://www.indiawaterportal.org/environment/carbon-vaults-of-the-coast-unlocking-indias-mangrove-potential)
- Another Indian dataset gives mean SOC of 345.31 ± 97.22 Mg C/ha for estuarine and 307.02 ± 103.93 Mg C/ha for marine mangroves (depth not stated in the excerpt) — [Springer 2026 India synthesis](https://link.springer.com/article/10.1007/s10236-026-01836-1)
- Gulf of Kutch: no reliable per-hectare figure was found (see Gaps).

**Seagrass**
- Fourqurean et al. 2012 (Nature Geoscience, doi:10.1038/ngeo1477) compiled 946 meadows. The global seagrass C pool is 4.2–8.4 Pg C (conservative), or up to 19.9 Pg C using full-inventory sites. Current loss rates could release up to 299 Tg C/yr if biomass and top-metre soil C are remineralised — [FIU record](https://digitalcommons.fiu.edu/fce_lter_journal_articles/131); [FCE LTER key findings](https://fcelter.fiu.edu/research/key-findings-blue-carbon-stored-in-seagrass/)
- Seagrass biomass C ranges over 5 orders of magnitude (0.001–23.382 Mg Corg/ha), as reported by an Abu Dhabi study citing Fourqurean — [Campbell et al., Abu Dhabi](https://www.oceanfdn.org/sites/default/files/Campbell-Carbon%20Storage%20in%20Seagrass%20Beds%20of%20Abu%20Dhabi%20UAE.pdf)
- Site examples of seagrass biomass: Florida Bay 1.14 Mg C/ha and Shark Bay 4.75 Mg C/ha. These come from a conference slide deck, so treat them as indicative — [Fourqurean presentation](https://conference.ifas.ufl.edu/INTECOL/presentations/109/1140%20J%20Fourqurean.pdf)
- Gazi Bay, Kenya seagrass carbon study (the Mikoko Pamoja site; seagrass is now being added to project scope) — [PLOS ONE 2017](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0177001)

**Tidal saltmarsh**
- Maxwell et al. 2023 (Scientific Data, doi:10.1038/s41597-023-02633-x): 17,454 data points from 2,329 locations in 29 countries. Median ± MAD SOC was 79.2 ± 38.1 Mg C/ha in the top 30 cm and 231 ± 134 Mg C/ha in the top 1 m. Global tidal-marsh soil C is 1.22 ± 0.20 Pg C in the top metre, over a marsh area of 52,880 km² (95% CI 32,000–59,800). These are medians, not means — [Nature Scientific Data](https://www.nature.com/articles/s41597-023-02633-x)
- No global marsh biomass-fraction figure was found (see Gaps).

### Inferences
- A Sentinel-1/2 + GEE registry can defensibly measure: (1) ecosystem extent and change (loss/gain, conversion to aquaculture); (2) for mangroves, above-ground biomass via SAR backscatter / NDVI / canopy-height regressions calibrated to field plots; (3) restoration progress such as canopy closure and survival. It cannot measure: soil organic carbon (44% to >85% of the mangrove total, and nearly all of seagrass and marsh carbon), below-ground roots, or burial rates. These have to be assigned from field cores, published regional values (e.g. Sundarbans 38–87 Mg C/ha SOC; Pichavaram 57–146 Mg C/ha), or IPCC Wetlands Supplement Tier 1 defaults.
- Seagrass is essentially invisible to Sentinel-1 and only partly visible to Sentinel-2. Turbidity and water depth limit detection, and Indian coastal waters (Gulf of Mannar, Palk Bay, Gulf of Kutch) are often turbid. Seagrass in the registry should therefore be extent-only, with soil C from literature.
- Indian mangrove numbers vary by about 10x across studies (38 to >500 Mg C/ha SOC), mostly because of sampling depth. The registry should state its soil depth convention (1 m is the VM0033/IPCC norm) and use conservative, lower-bound values.
- An honest design pattern is: Tier 2/3 above-ground biomass from satellite plus field calibration, with soil carbon as a Tier 1/2 stock-change factor that is clearly labelled as not remotely sensed.

### Gaps
- Exact Kauffman 2020 global mean TECS ± SE and the per-pool breakdown (AGB/BGB/soil 0–1 m/soil >1 m) were not retrieved from the full text. The ~850 Mg C/ha figure is derived from the "511 = 60% of mean" statement.
- The Fourqurean 2012 per-hectare soil mean (top 1 m) and mean living-biomass C could not be verified, because the PDF fetch was blocked (403).
- No Gulf of Kutch mangrove per-hectare stock was found. Bhitarkanika units and context were not confirmed from the original paper.
- Tidal marsh above/below-ground biomass share was not found.

## 2. Annual sequestration / burial rates and biomass accumulation of restored or planted mangroves

### Takeaway
Long-term soil burial is roughly 1–2.3 Mg C/ha/yr on average for blue carbon ecosystems, but with extreme variability (19x for mangroves, 76x for seagrass, 600x for saltmarsh). Young planted mangroves accumulate biomass much faster, about 5–13 Mg C/ha/yr in Bangladesh *Sonneratia apetala* plantations. Planted stands reach about 71–73% of intact-forest biomass by 40 years, with ~90% of that reached in the first 20 years.

### Cited Findings
- McLeod et al. 2011 averages, as cited secondarily: saltmarsh 218, mangrove 226 and seagrass 138 g C/m²/yr (2.18, 2.26 and 1.38 Mg C/ha/yr). Terrestrial forests are ≤5 g C/m²/yr. The full range is 18–1,713 g C/m²/yr — [Coastal Wiki](https://www.coastalwiki.org/wiki/Blue_carbon_sequestration); [ScienceDirect review](https://www.sciencedirect.com/science/article/pii/S1385110124000376)
  - Conflict: a Red Sea study describes 138 ± 38 as the global seagrass estimate and calls the 218 ± 24 burial estimate older and higher than newer values. Attribution among sources is inconsistent.
- A later review gives mangrove burial of 163 ± 26 g C/m²/yr (range 2–1,749) — [ScienceDirect review 2024](https://www.sciencedirect.com/science/article/pii/S1385110124000376)
- Global saltmarsh sequestration totals: 4.8–87.2 Tg C/yr (McLeod) vs 11–13 Tg C/yr in a newer estimate — [CEC North America Blue Carbon](https://www.cec.org/files/documents/publications/11664-north-america-s-blue-carbon-assessing-seagrass-salt-marsh-and-mangrove-en.pdf)
- Wadden Sea intertidal seagrass burial was only 10.1 ± 1.5 g C/m²/yr (0.1 Mg C/ha/yr), well below global averages — [Biogeosciences 2026](https://bg.copernicus.org/articles/23/5715/2026/)
- Williamson & Gattuso 2022 report a 600-fold spread between the highest and lowest burial estimates for saltmarsh, 76-fold for seagrass and 19-fold for mangroves — [UEA news](https://www.uea.ac.uk/about/news/article/carbon-removal-using-blue-carbon-habitats-uncertain-and-unreliable)
- Pichavaram, India: burial of 2.33–4.44 g C/m²/yr was reported (verify units). It was lower in restored than in natural stands — [ResearchGate](https://www.researchgate.net/publication/333603613_Soil_organic_carbon_stock_in_natural_and_restored_mangrove_forests_in_Pichavaram_south-east_coast_of_India)
- Indian Sundarbans whole-forest sequestration: 17.21 Mg C/ha/yr. This is high compared with global burial rates and likely mixes in biomass production — [Sundarbans study](https://www.researchgate.net/publication/280315547_Carbon_stock_in_the_Sundarbans_mangrove_forest_spatial_variations_in_vegetation_types_and_salinity_zones)

**Planted mangrove accumulation by age**
- Bangladesh *S. apetala*, 5 stand ages from 12 to 44 yr on 6 islands: vegetation C peaked at 247 t C/ha and ecosystem C at 461 t C/ha at 44 yr. The fastest vegetation C gain was 13.17 t C/ha/yr at 18 yr. SOC was unimodal with age — [Environmental Research 2026 / PubMed 42248386](https://pubmed.ncbi.nlm.nih.gov/42248386/)
- Bangladesh high-salinity zone *S. apetala*: biomass C rose with age from 51.5 ± 3.2 to 259.9 ± 103.5 Mg C/ha. Soil C averaged 33.1 ± 3.1 Mg C/ha with no significant change with age. Ecosystem C peaked at 292.0 Mg C/ha at 35 yr — [ADS abstract](https://ui.adsabs.harvard.edu/abs/2024ForEM.56322000R/abstract)
- Char Kukri Mukri and Char Montaj (Bangladesh), stands aged 8–32 yr: ecosystem C accumulation of 12.21 and 12.62 t C/ha/yr — [ScienceDirect 2022](https://www.sciencedirect.com/science/article/pii/S2772411522000179)
- Bangladesh national plantation synthesis (Global Change Biology 2023), stands 5–42 yr (mean 25.5): biomass C 60.3 ± 5.6 Mg C/ha, from plot-inventory regressions — [GCB, doi:10.1111/gcb.16674](https://onlinelibrary.wiley.com/doi/full/10.1111/gcb.16674)
  - Derived: 60.3 / 25.5 ≈ 2.4 Mg C/ha/yr mean biomass accumulation, much lower than the best-site 12–13 t C/ha/yr figures.
- Global four-decade planted-mangrove dataset: AGB reached 71% and BGB 73% of intact-stand values after 40 yr. About 90% of that accumulation happened in the first 20 yr. Soil was 83–95% of ecosystem C in the first 5 yr — [Science Advances](https://www.science.org/doi/10.1126/sciadv.adk5430)

### Inferences
- Credible design ranges: about 1.5–2.5 Mg C/ha/yr for soil burial (mangrove), and about 2–13 Mg C/ha/yr for planted mangrove biomass depending on age, species and site. For India, a conservative planted-mangrove rate near the Bangladesh national mean (~2.4 Mg C/ha/yr biomass) is more defensible than best-site maxima.
- Restored stands store less soil carbon than natural ones (Pichavaram; Bangladesh soil C flat with age), so soil credits for restoration should be small in early years.

### Gaps
- No Indian Sundarbans planted-mangrove chronosequence was found. No published Kenyan / Southeast Asian age-specific rates were retrieved in this session.

## 3. Case studies: how real projects quantify stocks and credits

### Takeaway
Small community projects (Mikoko Pamoja, Vanga, Tahiry Honko; Plan Vivo) use field-plot allometry for biomass, sometimes soil cores, and Landsat for historical deforestation baselines. They credit modest volumes, about 10–25 t CO2/ha/yr on the protected area, with 15% buffers. Large VCS projects (Delta Blue Carbon, Vida Manglar) apply VM0033 or REDD-type methods over tens of thousands of hectares. Across all of them, remote sensing is used for area and activity data, not for soil carbon.

### Cited Findings
**Mikoko Pamoja (Gazi Bay, Kenya; Plan Vivo; now also listed as VCS 3660)**
- The PDD covers protection of 107 ha of natural mangrove plus 10 ha of plantation, and planting 2,000 trees/yr for 20 years. The crediting period is June 2012 – June 2032. Carbon benefits are "conservatively estimated at 2500 tonnes CO2 yr-1" from avoided deforestation, prevented degradation and new planting — [Mikoko Pamoja PDD (C-Level)](https://www.clevel.co.uk/wp-content/uploads/2022/05/Mikoko_Pamoja_PDD.pdf); [2020 revision PDD](https://sustainabletravel.org/wp-content/uploads/MikokoPamoja-PDD-2020-revision-PlanVivo.pdf)
  - Derived: 2,500 / 117 ha ≈ 21 t CO2/ha/yr.
- Project scientists (Kairo) cite 3,000 t CO2/yr for 20 years — [Standard Media](https://www.standardmedia.co.ke/farmkenya/article/2001446715/locals-change-fortunes-with-mangroves); [UN](https://www.un.org/it/Nairobi-unic/story3)
- Baseline: Landsat analysis shows mangroves in Gazi and on the south coast declined about 0.7%/yr over 1985–2010 — [PDD](https://sustainabletravel.org/wp-content/uploads/MikokoPamoja-PDD-2020-revision-PlanVivo.pdf)
- Biomass method: general allometric equations (Komiyama et al. 2005), drawing on Kairo et al. 2009 replanted-stand allometry and Tamooh et al. 2008 root work. Gazi Rhizophora stands have 32.5 Mg/ha of dead below-ground roots — [PDD](https://sustainabletravel.org/wp-content/uploads/MikokoPamoja-PDD-2020-revision-PlanVivo.pdf); [Frontiers 2022](https://www.frontiersin.org/journals/forests-and-global-change/articles/10.3389/ffgc.2022.767337/full)
- Buffer: the risk assessment justified 11%, but 15% was applied as a conservative measure — [PDD](https://sustainabletravel.org/wp-content/uploads/MikokoPamoja-PDD-2020-revision-PlanVivo.pdf)
- Caveat: *Avicennia alba*, the species used for replanting, has a much lower carbon density (0.28 tC/m³) than other species. Generic allometry/wood density can therefore overstate planting gains — [Gillerot et al. 2018, Ecosphere](https://esajournals.onlinelibrary.wiley.com/doi/10.1002/ecs2.2306)
- Media figures of "1,500 t C/ha" (UN) and "15,000 t C/ha" (Standard Media) are inconsistent with the science and should not be used.

**Vanga Blue Forest (Kenya; Plan Vivo; PDD dated 27 Dec 2019)**
- Applies VCS VM0033, CDM AR-Tool14 (trees/shrubs) and the IPCC 2013 Wetlands Supplement. Baseline stocks range from 174 to 904 Mg C/ha, mean about 469 ± 176 Mg C/ha, covering above- and below-ground components to 1 m — [Vanga PDD](https://sustainabletravel.org/wp-content/uploads/Vanga-Blue-Forest-PDD_27dec19_PlanVivo.pdf)
- Baseline deforestation: forest area fell from 3,685 ha (1991) to 3,234 ha (2016), about 18.04 ha/yr, mapped from historical imagery — [Vanga PDD](https://sustainabletravel.org/wp-content/uploads/Vanga-Blue-Forest-PDD_27dec19_PlanVivo.pdf)
- Scale: 460 ha protected and ~9,000 people. The design stage targeted >200 ha and ~4,000 t CO2e/yr avoided. 2020 was the first operating year (ex-post credits), with first sales in 2021 — [ACES](https://aces-org.co.uk/our-projects/vanga-blue-forest/); [Oceanographic](https://oceanographicmagazine.com/news/mangrove-conservation-kenya/)
  - Derived: ~4,000 t CO2e / ~200–460 ha ≈ 9–20 t CO2e/ha/yr.

**Tahiry Honko (Bay of Assassins, SW Madagascar; Plan Vivo, PV Climate v4)**
- Over 1,200 ha of mangroves. Avoided emissions of more than 1,300 t CO2/yr (Plan Vivo / Blue Ventures), or "almost 1,400" (Commonwealth) — [Plan Vivo](https://www.planvivo.org/tahiry-honko); [Blue Ventures](https://blueventures.org/communities-in-madagascar-launch-the-worlds-largest-mangrove-carbon-conservation-project-2/); [Commonwealth case study](https://thecommonwealth.org/case-study/case-study-tahiry-honko-community-led-mangrove-carbon-project-velondriake-locally)
- Crediting period 2018–2037, 28,860 total credits — [IDRECCO database](https://www.reddprojectsdatabase.org/472-tahiry-honko-community-mangrove-carbon-project/)
  - Derived: ~1,350 / 1,200 ha ≈ 1.1 t CO2/ha/yr. This is an order of magnitude lower per hectare than Mikoko Pamoja, because avoided-loss credits scale with the baseline loss rate, not the stock.
- A marketing blog's "~55,000 tCO2e/yr" conflicts with the project's own figures and is unreliable — [Regreener](https://www.regreener.earth/blog/the-5-best-plan-vivo-carbon-credit-projects-of-2026)

**Vida Manglar (Cispatá Bay, Colombia; VCS 2290; Conservation International, INVEMAR, CVS, Apple)**
- First blue carbon project registered under VCS. Area: 7,500 ha (CI) vs 11,000 ha (WBCSD NCS in Action); it is being expanded to the whole Gulf of Morrosquillo — [Conservation International](https://www.conservation.org/projects/vida-manglar-carbon-project); [WBCSD NCS in Action](https://archive.wbcsd.org/download/file/16129)
- 67,000 credits issued to date (WBCSD document). Expected reductions of 1,221,717 t CO2e over 30 years (Go2Markets; start-date conflicts between sources) — [WBCSD](https://archive.wbcsd.org/download/file/16129); [Go2Markets](https://www.carbon-projects.go2-markets.com/projects/blue-carbon-vida-manglar)
  - Derived: 1,221,717 / 30 / 7,500–11,000 ha ≈ 3.7–5.4 t CO2e/ha/yr.
- The methodology was not confirmed from the sources found. It is a REDD-type avoided-deforestation project; the methodology code should be verified on the Verra registry. The registry status as of 16 Sep 2026 was listed as "Late to Verify" by a third party — [Evertreen](https://www.evertreen.com/projects/vida-manglar-mangrove-colombia-carbon-project)

**Delta Blue Carbon 1 (Indus Delta, Sindh, Pakistan; VCS 2250; Indus Delta Capital with the Sindh Forest Department)**
- VM0033 (tidal wetland and seagrass restoration). 60-year project, renewable up to 100 years. Project zone 350,000 ha in Thatta and Sujawal districts. Removals come from ARR of 226,000 ha (BMO) / 224,997 ha (Respira) / 247,112 ha (Pachama) of degraded tidal wetland — [BMO disclosure](https://www.bmo.com/dam_asset/asset/1a6ba7d1-aa7a-407b-89e7-55338d655a69/VCS2250-Delta-Blue-Carbon-1.pdf); [Respira](https://www.respira-international.com/portfolio/delta-blue-carbon/); [Pachama](https://app.pachama.com/projects/delta-mangroves); [Verra case study](https://verra.org/case-studies/delta-blue-carbon/)
- Expected removals of about 142 million t CO2e over 60 years — [Klimate](https://www.klimate.co/project/delta-blue-carbon)
  - Derived: 142 Mt / 60 yr / ~225,000 ha ≈ 10.5 t CO2e/ha/yr average.
- Validator/verifier conflict: ICONTEC (BMO) vs AENOR (Respira, Generation IM report). Community members do monitoring, with periodic third-party audits — [Verra case study](https://verra.org/case-studies/delta-blue-carbon/); [Generation IM report](https://generationim.com/media/ywpljsvb/generation-1305-report-1.pdf)

**India – Sundarbans (Livelihoods Fund + NEWS, Nature Environment & Wildlife Society)**
- Registered as a CDM afforestation/reforestation project, "India Sundarbans Mangrove Restoration". Participant: Livelihoods Fund. Estimated 44,955 t CO2e/yr, 20-year first crediting period from 28 Sep 2010, DOE Ernst & Young — [UNFCCC CDM record](https://cdm.unfccc.int/Projects/Validation/DB/1M4DGESWLXKKD8XTB2MMXGA2DJHLL4/view.html)
- 5,011 ha restored; the Fund reports the stands were intact after Cyclone Amphan (2020). Saplings washed away by tides had to be replaced — [Livelihoods Fund](https://livelihoods.eu/projects/news-india/); [Cool Effect](https://www.cooleffect.org/?p=265729)
  - Derived: 44,955 / 5,011 ha ≈ 9 t CO2e/ha/yr (≈ 2.4 Mg C/ha/yr). This closely matches the Bangladesh national mean planted-biomass accumulation.
- No Verra registration was confirmed for the India project. The Livelihoods Senegal project did move from CDM to Verra (~500,000 credits) — [REDD-Monitor](https://reddmonitor.substack.com/p/crooked-carbon-business-livelihoods)

### Inferences
- Credit intensity depends on project type. Avoided-loss projects such as Tahiry Honko (~1 t CO2/ha/yr) are driven by the satellite-derived baseline loss rate times the stock lost (emission factor). Restoration/ARR projects such as Sundarbans (~9) and Delta Blue Carbon (~10.5) are driven by growth curves. Mikoko Pamoja (~21) combines both on a small area.
- A registry that issues the same per-hectare value to every polygon would be inconsistent with practice. Credits should be: (area change from satellite) × (stock or growth factor by ecosystem and age) − buffer (10–20%) − uncertainty deduction.

### Gaps
- The full PDD contents for Delta Blue Carbon (pool selection, whether soil is included or conservatively excluded, uncertainty deductions, buffer %) could not be retrieved; the fetch timed out. Verra registry documents for VCS 2250 should be consulted.
- Issuance per year and buffer % for Vanga, Tahiry Honko and Vida Manglar were not found. Vida Manglar's methodology code was not confirmed.
- No Verra-registered Indian mangrove project was confirmed. Gujarat/Gulf of Kutch projects were not found in this session.

## 4. How projects use remote sensing

### Takeaway
In the cases found, remote sensing is used for extent, change and baseline deforestation (activity data), mainly Landsat time series. Biomass and soil stocks come from field plots with allometry and soil cores. No project found uses satellite data alone to estimate soil carbon.

### Cited Findings
- Mikoko Pamoja: the baseline loss rate (0.7%/yr, 1985–2010) came from Landsat. Stocks came from field allometry (Komiyama 2005; Kairo 2009) — [PDD](https://sustainabletravel.org/wp-content/uploads/MikokoPamoja-PDD-2020-revision-PlanVivo.pdf)
- Vanga: historical forest-area change 1991–2016 (3,685 → 3,234 ha). Stocks come from field-based AG + BG to 1 m under VM0033 / AR-Tool14 — [Vanga PDD](https://sustainabletravel.org/wp-content/uploads/Vanga-Blue-Forest-PDD_27dec19_PlanVivo.pdf)
- Kenyan below-ground carbon has been mapped by statistically extrapolating field cores (Gress et al. 2017), not by direct sensing — [GCB doi:10.1111/gcb.13438](https://onlinelibrary.wiley.com/doi/10.1111/gcb.13438)
- Delta Blue Carbon: monitoring is described as community field measurement plus third-party audits. No source found describes remote sensing for its stock estimation — [Verra case study](https://verra.org/case-studies/delta-blue-carbon/)

### Inferences
- A Sentinel/GEE registry fits best as an MRV layer: verifying extent, survival, canopy development and detecting reversals (cutting, aquaculture conversion, cyclone damage). Stock factors should come from field or literature data and be documented as such.

### Gaps
- No primary monitoring-report text was obtained describing satellite-based AGB estimation inside a credited blue carbon project.

## 5. Known controversies and critiques a project report should acknowledge

### Takeaway
The main critiques are: very large uncertainty in soil burial rates, which can lead to over-crediting; permanence risk from sea-level rise, storms and salinity changes (e.g. the 46% Sundarbans soil C loss); leakage; hard-to-prove additionality; low survival of planted stands; and the argument that blue carbon is too small to offset fossil emissions.

### Cited Findings
- Williamson & Gattuso 2022 (Frontiers in Climate): "Carbon removal using coastal blue carbon ecosystems is uncertain and unreliable, with questionable climatic cost-effectiveness". Unresolved flux/storage measurement issues mean "potential over-crediting". Burial estimates vary 600x (saltmarsh), 76x (seagrass) and 19x (mangrove). Burial dating by sediment depth profiles is distorted by bioturbation. Restoration scope is limited by coastal development. They nevertheless support restoration for adaptation and biodiversity — [UEA research portal](https://research-portal.uea.ac.uk/en/publications/carbon-removal-using-coastal-blue-carbon-ecosystems-is-uncertain-); [phys.org](https://phys.org/news/2022-07-carbon-blue-habitats-uncertain-unreliable.html)
- Communications Earth & Environment 2023, "Why blue carbon cannot truly offset fossil fuel emissions": the effect is too small, existing sediment stock is a liability, and timescales are mismatched — [Nature CEE](https://www.nature.com/articles/s43247-023-01068-x)
- Climate Analytics: blue carbon offsets carry high uncertainty, reversal risk and hard-to-prove additionality. Protecting one area can displace clearing elsewhere (leakage) — [Climate Analytics](https://climateanalytics.org/publications/the-dangers-of-blue-carbon-offsets-from-hot-air-to-hot-water)
- Livelihoods Fund (Senegal) critique: low community wages, while corporate members use the credits to offset emissions — [REDD-Monitor](https://reddmonitor.substack.com/p/crooked-carbon-business-livelihoods)
- Sundarbans cyclone/salinity impact on soil C (−46%) shows reversal risk — [PMC10381154](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10381154/)
- Planted mangroves reach only ~71–73% of natural biomass after 40 yr. Restored Pichavaram stands hold less SOC than natural ones — [Science Advances](https://www.science.org/doi/10.1126/sciadv.adk5430); [Pichavaram study](https://www.researchgate.net/publication/333603613_Soil_organic_carbon_stock_in_natural_and_restored_mangrove_forests_in_Pichavaram_south-east_coast_of_India)
- Species-specific carbon fraction/wood density matters: *A. alba* is used at Gazi but is low-density — [Gillerot 2018](https://esajournals.onlinelibrary.wiley.com/doi/10.1002/ecs2.2306)

### Inferences
- The student report should acknowledge several points. Satellite estimates cover only part of the carbon pool, and soil values are borrowed. Use conservative, lower-bound factors and state the depth convention. Apply an explicit buffer (Plan Vivo practice is ~15%) and an uncertainty deduction. Treat all registry outputs as indicative, not verified credits.
- Major projects show large source-to-source inconsistencies in area (Delta: 225k–247k ha; Vida Manglar: 7,500–11,000 ha), credit volumes (Mikoko: 2,500 vs 3,000 t/yr) and auditors. This supports registry transparency features such as versioned polygons and parameter provenance.

### Gaps
- No independent investigative critique specific to Delta Blue Carbon was found in this session.
- No quantitative audit of Indian Sundarbans plantation survival rates was found.
