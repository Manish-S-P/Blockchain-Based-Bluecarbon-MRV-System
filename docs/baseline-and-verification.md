# Baseline, sealing and verification

How the registry decides what would have happened **without** the project, how it stops that
answer from being changed later, how credits are calculated on the blockchain, and how anyone
can check the result. This is a **prototype**: each design choice is the simplest one we could
defend, and its limits are listed at the end.

Companion document: [carbon-calculation.md](carbon-calculation.md) explains how carbon is
measured.

---

## 1. The yearly cycle

| When | Step | Where it happens | What becomes public |
|---|---|---|---|
| Registration | Satellite ecosystem check, overlap check, plot registered | ML service, backend, `registerPlot` | Plot area and farmer wallet (on-chain) |
| **Day 0** | Build the baseline and **seal** it | ML service, backend, `commitBaseline` | Only the seal (a hash) |
| Every 3 months | Satellite check: carbon, damage, data quality | ML service, backend, `recordObservation` | Each quarter's measured change + evidence fingerprint |
| **Month 12** | **Reveal** the baseline, contract re-checks the seal, calculates and mints credits | `finalizeYear` | Everything: baseline, salt, calculation, report on IPFS |
| Any time | Anyone checks it on the public page | Browser | — |

Two ways to run a year:

| Mode | Day 0 | Use |
|---|---|---|
| **Live** | The day the baseline is sealed. Each quarterly check can only run after its 3 months have passed. | Real use |
| **Replay** | The start of the last 4 completed calendar quarters. All 4 checks run immediately on real past satellite data. | Demos, and testing how good the baseline forecast was |

---

## 2. The baseline: a "synthetic twin" of the plot

**Question:** if the farmer had done nothing, how would the plot's tree carbon have changed this year?
Only carbon above that answer is creditable ("additionality").

**Method:** synthetic control (Abadie et al.), as used in policy evaluation:

1. **Candidates.** 80 random mangrove pixels 1–30 km from the plot (Global Mangrove Watch +
   ESA WorldCover mangrove mask). Pixels inside other registered plots are excluded, so the twin
   is made of land that is *not* in the project.
2. **Their history.** The same carbon model measures every candidate, and the plot, over the 4
   quarters before day 0. For each quarter it gets the carbon **level** and its **change vs the
   same season a year earlier**.
3. **Weights.** The 25 candidates closest to the plot are given weights (each ≥ 0, summing to
   1). The weights are chosen so the weighted mix matches the plot's levels **and** changes as
   closely as possible. Matching changes as well as levels stops the weights simply fitting noise
   with only 4 quarters (an earlier version that matched levels only gave a suspicious perfect fit).
   Typically 5–25 donors get non-zero weight.
4. **Forecast.** For each season of the coming year, the baseline change is what the weighted
   donors did in that season over the past year ("they keep doing what they did"). The range is
   the weighted donor ranges, treated as fully correlated (the cautious choice).
5. **Safety check at month 12.** The same donors are measured again for the actual year. For each
   quarter the baseline used is the **larger** of the sealed forecast and what the donors
   actually did. Growth that would have happened anyway is never credited.

Code: `ml-service/app/baseline.py`, `backend/services/baselineService.js`.

---

## 3. Sealing the baseline (commit-reveal)

**Problem:** if the baseline could be chosen after seeing the plot's results, it could be
picked to make credits look bigger.

**Solution:** at day 0 the backend writes the full baseline into an **audit file** (donors,
weights, fit, forecast) and computes:

```
auditHash  = SHA-256(audit file)
commitment = keccak256(abi.encode(plotId, year, dayZero,
                                  forecast changes[4], forecast ranges[4],
                                  auditHash, salt))
```

- Only the `commitment` goes on-chain (`commitBaseline`). On its own it reveals nothing.
- `salt` is 32 secret random bytes. Without it, nobody can guess the forecast by trying values.
  The API never returns the salt or the forecast before month 12.
- At month 12 the backend reveals everything. The contract recomputes the commitment, and if a
  single digit differs it refuses with **`BaselineMismatch`** (tested in
  `blockchain/test/BlueCarbonRegistry.test.js`).

---

## 4. Quarterly observations on-chain

After each satellite check the backend calls `recordObservation` with:

| Field | Meaning |
|---|---|
| `plotChange` | Plot tree carbon now − same season a year earlier (t CO₂/ha) |
| `plotHalfWidth` | 90% range of that change |
| `coverBps` | Share of the plot that is mangrove (basis points) |
| `usable` | Clear satellite data and the model is applicable to this plot |
| `anomaly` | Damage detected this quarter |
| `dataHash` | SHA-256 of the quarter's full evidence (carbon estimates, anomaly score, NDVI) |

Each quarter is fixed on-chain when it happens, so it cannot be edited at the end of the year.

---

## 5. Credits, calculated by the smart contract

`finalizeYear` in `blockchain/contracts/BlueCarbonRegistry.sol`. The backend mirror
`backend/services/credits.js` runs the same rule to explain it on screen, and the tests check
that both give identical results.

1. **Blocking rules:** any quarter with damage gives no credits for the year. Fewer than 2
   usable quarters also gives none.
2. **Extra carbon per quarter** = plot change − max(sealed forecast, donors' actual change).
3. **Year gain** = average of the usable quarters. Its range = average of √(plot range² + baseline range²).
4. **Cumulative gain** = the sum of yearly gains since the plot's first year. The range of a
   total is that of one start-to-end comparison, so it does **not** grow with the years. A real
   gain therefore becomes provable after a few years even when each single year is too uncertain.
5. **Uncertainty discount** (CDM AR-TOOL14, used by India's BEE methodology): deduct 0%, 25%,
   50%, 75% or 100% of the range when it is ≤10%, ≤15%, ≤20%, ≤30% or >30% of the gain.
6. **Soil:** + 1.83 t CO₂/ha per year × cover factor (India BEE default 0.5 t C/ha/yr, first 20 years).
7. **Credits** = (proven tree gain + soil so far) × area × (1 − 12% buffer) − credits already issued.
8. If the result is above 0, an NFT is minted to the farmer's wallet. Its token URI is the IPFS
   audit report, and its amount is stored on-chain (`tokenCreditsWad`).

---

## 6. Public verification

Anyone can open `/verify` (all plots) or `/verify/<plotId>` without logging in. The page shows:

- the plot boundary on satellite imagery;
- the satellite check at registration;
- each quarter's carbon, health status, evidence fingerprint and transaction;
- the sealed commitment while the year is running;
- after month 12: the donors and their weights, plot vs baseline per quarter, forecast vs what
  the donors actually did, and the full credit calculation.

The **"Verify the baseline"** button runs these checks in the visitor's browser:

1. SHA-256 of the audit file = `auditHash` inside the seal.
2. The forecast numbers in the audit file = the sealed numbers.
3. keccak256 of (plot, year, day 0, forecast, auditHash, revealed salt) = the seal.
4. That seal = the commitment stored on the blockchain at day 0 (read from the contract).

The **"Download audit file"** button lets anyone keep the file and re-run the hash with any
SHA-256 tool. The owner's name, phone and identity are never shown publicly.

---

## 7. Other registration rules

| Rule | How |
|---|---|
| **No overlapping plots** | Each boundary is stored as a GeoJSON polygon with a MongoDB `2dsphere` index; a new plot that intersects an existing one is refused (HTTP 409). Self-crossing boundaries are refused too. |
| **Identity (mock)** | No ID documents are collected. A demo identity `DEMO-xxxxxxxxxx` is derived from wallet + name + phone. A real deployment would plug in proper KYC here. |
| **Mangrove only** | Seagrass and saltmarsh are shown as "coming soon". |

---

## 8. Results from the end-to-end test (replay year Oct 2025 – Sep 2026)

| | Mumbai (Thane Creek) | Andaman |
|---|---|---|
| Donors used (of 80 candidates) | 6 | 25 |
| Twin fit to the plot's past | ±6.4 t CO₂/ha | ±57 t CO₂/ha (tall forest, few similar donors) |
| Usable quarters | 4 | 3 (monsoon quarter too cloudy) |
| Year gain over baseline | −12.6 ± 236 t CO₂/ha | +18.5 ± 716 t CO₂/ha |
| Proven tree gain | 0 | 0 |
| Credits (soil only, 1.44 ha) | 2.32 | 2.32 |
| Contract = backend mirror? | Yes | Yes |
| Public re-check (audit hash, seal, on-chain) | All pass | All pass |

The safety rule was used in practice. In Mumbai's first quarter the sealed forecast was −9.0 t/ha,
but the donors actually grew +16.2. The baseline used was +16.2, so no growth that would have
happened anyway was credited.

---

## 9. What this does and does not prove (trust model)

| Proven by the blockchain | Not proven by the blockchain |
|---|---|
| The baseline was fixed at day 0 and not changed afterwards | That the satellite carbon model is accurate (see carbon-calculation.md) |
| Each quarter's observation was recorded when it happened | That the backend fed honest inputs (it is a trusted "oracle") |
| The published credit rule was applied exactly | That donor land really is comparable "business as usual" land |
| Credits cannot be minted twice for the same gain | |

## 10. Limitations (prototype)

- **Single oracle.** The backend is the only writer. A production system would use several
  independent validators or signed satellite data.
- **Small donor pool and short pre-period.** Four quarters of history and 80 candidates are
  enough to demonstrate the method, not to guarantee a robust counterfactual. The fit error is
  reported so weak twins are visible.
- **Donors are "unenrolled mangroves", not certified degraded land.** Real projects choose control
  sites with matched land-use history.
- **Replay covers one year.** Later years run live as time passes.
- **Wide uncertainty.** With today's satellite accuracy, tree credits need several years of real
  growth. In year 1, credits are almost entirely the official soil rate.
- **Amoy testnet:** the contract on Amoy is still the old version. Redeploy it and point the
  `BLOCKCHAIN_*` settings at Amoy to run the full cycle there.
