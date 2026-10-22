# Presentation guide (live demo)

A tested script for showing the whole system in about 10 minutes. Every step below was run end
to end in a real browser. The timings are from that run, and the slow steps need internet for
Google Earth Engine.

---

## The day before

| ✓ | Step | Why |
|---|---|---|
| ☐ | `docker compose up` (or your manual setup) and leave it running | First start downloads and installs, which takes minutes |
| ☐ | `npm run check` → "Ready for the demo." | Confirms database, models, Earth Engine and contract |
| ☐ | `npm run smoke-test` → "SMOKE TEST PASSED" | A real year end to end in ~1-2 min |
| ☐ | In the app, register **one backup plot** and replay its year completely | If the internet is slow on the day, you can still show a finished result and the public page |
| ☐ | MetaMask installed, an account created, logged in to the app once | Login is just a signature; no network or test ETH needed |
| ☐ | Browser zoom 100-110%, other tabs closed, notifications off | |

**On the day:** start the stack 15 minutes early, then run `npm run check`. If you restart the computer,
`docker compose up` keeps your plots. Do **not** run `docker compose down -v`, because it wipes them.

---

## Live script (~10 minutes)

| # | Show | Click / do | Say | Time |
|---|---|---|---|---|
| 1 | Home page | — | "Farmers protect mangroves; we verify them with satellites and pay them in carbon credits that anyone can check." | 30 s |
| 2 | Login | **Connect wallet**, sign in MetaMask | "The wallet is the login. No password, and no personal ID documents in this prototype." | 20 s |
| 3 | Register | **Add a plot**, fill in a name, phone and village, **Next**, **Jump to: Mumbai – Thane Creek**, click 4 corners **inside** the dense green area, **Next**, **Register plot** | "A year of Sentinel-1 and Sentinel-2 images is classified pixel by pixel. The model decides what grows there *before* it looks at the farmer's claim." | ~15 s wait |
| 4 | (optional) Rejection | Draw on a road or water instead | "If it isn't mangrove, it's rejected with the reason and the class probabilities." | 15 s |
| 5 | Baseline + year | **Demo: replay last year** | "Replay uses the last 4 real quarters. First it builds a twin of the plot from unregistered mangroves nearby and **seals** its forecast on the blockchain as a hash, so nobody can change it later. Then 4 quarterly satellite checks, each recorded on-chain." | ~50-60 s wait |
| 6 | While it runs | Point at the dashboard sections | Explain the carbon chain: GEDI laser height → Simard 2019 field equation → IPCC factors → CO₂ with a 90% range. | — |
| 7 | Reveal + credits | **Reveal baseline and finish the year** | "The contract re-hashes the revealed baseline. If one digit were different it would refuse with `BaselineMismatch`. Then **the contract itself** calculates the credits." | ~5 s |
| 8 | Result | Scroll: chart, quarter table, calculation | "Plot change minus what would have happened anyway, minus uncertainty using India's official rule, plus official soil carbon, minus a 12% safety buffer. In year 1 the tree gain is smaller than the satellite error, so honestly only soil is credited. Gains add up, so trees get credited once growth is provable." | 1 min |
| 9 | Public page | **Public page**, then **Verify the baseline** | "Anyone, with no login, can re-check the seal in their own browser: 4 green ticks. They can also download the audit file." | 1 min |
| 10 | Wrap up | **Public registry** | Limitations: prototype, no field calibration, single oracle. | 30 s |

**If step 5 is slow** (Earth Engine busy or slow internet): switch to your **backup plot** from the day
before, and show steps 8-9 on it. Keep the replay running in the background.

---

## Likely questions and short answers

| Question | Answer |
|---|---|
| Can a satellite measure carbon? | Not directly. It measures canopy height (laser) and canopy signals. Carbon comes from published field equations. Every step and source is in docs/carbon-calculation.md. |
| How accurate? | Height ±3.5 m on places the model never saw (R² 0.60). Ranges verified to hold 90% of the time. Biomass is at the low end of independent sources, so it is conservative. |
| Why so few credits? | One year of growth (~25 t CO₂/ha) is smaller than the satellite error (±150-250). We only credit what we can prove; gains accumulate over years. |
| Why the blockchain? | It proves the baseline was fixed in advance, each quarter was recorded when it happened, and the credit rule was applied exactly. It does not prove the satellite model is right; that is what the validation reports are for. |
| What stops cheating with the baseline? | Commit-reveal: only its hash is public at day 0, with a secret salt. Any change gives `BaselineMismatch`. And the baseline used is the larger of the forecast and what the look-alikes actually did. |
| Why only mangroves? | Tested: seagrass and saltmarsh are not recognised reliably in new regions, and their carbon is almost all in soil. They are future work. |
| What would make it production-ready? | Field plots for calibration, several independent validators instead of one backend, real KYC, certified control sites. |

---

## If something goes wrong

| Problem | Quick fix |
|---|---|
| Footer says something is not ready | Run `npm run check`; the README troubleshooting table lists each fix |
| "No contract at the configured address" | `docker compose up -d` |
| Registration rejected | Draw a smaller boundary fully inside dense mangrove |
| MetaMask window did not pop up | Click the MetaMask icon in the browser toolbar; the request is waiting there |
| Logged in as the wrong account | **Log out**, switch account in MetaMask, **Connect wallet** |
