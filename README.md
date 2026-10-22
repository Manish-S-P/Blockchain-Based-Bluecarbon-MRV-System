# Blue Carbon Registry (prototype)

A mangrove carbon-credit registry. Farmers register a mangrove plot. Satellites check it every
quarter. A sealed baseline (what would have happened without the project) is fixed on the
blockchain at day 0. After a year, a smart contract calculates the credits the farmer can
**prove** and mints them as an NFT. Anyone can verify the result on a public page.

| Part | What it does | Tech |
|---|---|---|
| `src/` | Farmer app + public verification pages | React 19, Vite, Tailwind, Leaflet, ethers |
| `backend/` | API, wallet login, yearly MRV cycle, credit rule mirror | Express, MongoDB, ethers v6 |
| `ml-service/` | Ecosystem classifier, anomaly detector, carbon model, baseline | FastAPI, Google Earth Engine, scikit-learn, SHAP |
| `blockchain/` | `BlueCarbonRegistry` contract: seal, quarterly records, on-chain credits | Solidity, Hardhat, OpenZeppelin |
| `docs/` | How carbon is calculated, how the baseline and verification work | — |

**Read first:** [docs/carbon-calculation.md](docs/carbon-calculation.md) and
[docs/baseline-and-verification.md](docs/baseline-and-verification.md).

Scope: **mangroves only** (seagrass and saltmarsh are planned). Identity is a mock (no ID documents).

---

## How a year works

```
Register plot ──► Seal baseline (day 0) ──► 4 quarterly satellite checks ──► Reveal + credits (month 12)
  satellite check      look-alike "twin",        carbon, damage, data          contract re-checks the seal,
  overlap check        hash on-chain              quality → on-chain            computes + mints credits
```

- **Live mode:** checks run every 3 months in real time.
- **Replay mode (demo):** the last 4 completed quarters of real satellite data are processed
  straight away, so a whole year can be shown in a few minutes.

---

## Quick start (Docker, any OS)

Works the same on Windows, macOS and Linux. You need
[Docker Desktop](https://www.docker.com/products/docker-desktop/), the
[MetaMask](https://metamask.io/download/) browser extension and Google Earth Engine access (below).

```bash
git clone <this repo> && cd blue-carbon-registry
cp .env.example .env          # Windows: copy .env.example .env
# edit .env: set GEE_PROJECT (and EARTHENGINE_CREDENTIALS_DIR if you use a personal login)
docker compose up --build     # first run takes ~5-10 minutes (downloads and installs)
```

When the `frontend` service prints `ready`, open **http://localhost:5173**. In a second terminal:

```bash
npm install           # once, on your computer (needs Node 20+), for the two helper commands below
npm run check         # are all services ready? (the dashboard footer shows the same)
npm run smoke-test    # runs a real plot through a whole year in ~1-2 minutes, then deletes it
```

| Task | Command |
|---|---|
| Stop | `docker compose down` |
| Start again (keeps your plots) | `docker compose up` |
| Wipe all demo data and start fresh | `docker compose down -v` then `docker compose up` |
| Ports already in use | set `FRONTEND_PORT`, `BACKEND_PORT`, `ML_PORT`, `CHAIN_PORT` in `.env` |

### Google Earth Engine access (one time, free for students)

The ML service reads Sentinel satellite data from Earth Engine, so each person needs their own access:

1. Sign in at https://code.earthengine.google.com/register and register a **Google Cloud project**
   for **non-commercial / academic** use. Note the project ID, and put it in `.env` as `GEE_PROJECT=<id>`.
2. Sign in, using **one** of these:
   - **Personal login (easiest):** `pip install earthengine-api`, then run `earthengine authenticate`
     and follow the browser prompt. In `.env` set
     `EARTHENGINE_CREDENTIALS_DIR=~/.config/earthengine`
     (Windows: `C:\Users\<you>\.config\earthengine`).
   - **Service account:** in the Google Cloud console, create a service account in that project. Give it the
     roles *Earth Engine Resource Viewer* and *Service Usage Consumer*, create a JSON key, and save it as
     `ml-service/keys/gee-service-account.json`.
3. Never commit keys or `.env`; both are git-ignored. Each person should use their own access rather than sharing keys.

### Troubleshooting

| Symptom (dashboard footer / `npm run check`) | Fix |
|---|---|
| Google Earth Engine: not signed in | Check `GEE_PROJECT` and the login/key above, then `docker compose restart ml` |
| Blockchain: no contract at the configured address | The chain was restarted. Run `docker compose up -d` (redeploys) |
| "The blockchain does not have this plot's current year" | Same cause, but a year was in progress: delete the plot and register it again |
| Satellite analysis: not reachable | `docker compose logs ml`; the first start loads three models (~30 s) |
| Plot rejected "only 58% confidence" | Draw the boundary inside a dense, uniform mangrove patch (not roads, water or buildings) |
| MetaMask asks to sign a message | Expected: that is the login. No network or test ETH is needed |

---

## Manual setup (without Docker)

Use this if you want to develop on the code directly.

### 1. MongoDB

```bash
docker run -d --name bcr-mongo -p 127.0.0.1:27017:27017 mongo:7
```

### 2. Blockchain (Hardhat)

```bash
cd blockchain
npm install
npm run node                       # terminal 1: local chain on http://127.0.0.1:8545
npm run deploy:local:export        # terminal 2: deploys; the backend picks the address up automatically
```

### 3. ML service

```bash
cd ml-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Earth Engine key at ml-service/keys/gee-service-account.json (not in git)
export GEE_PROJECT=<your-gee-project>
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

`GET http://127.0.0.1:8000/health` should show all three models loaded. The trained models are
in `ml-service/models/`. Retraining is described in `ml-service/README.md`.

### 4. Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in the values below (leave BLOCKCHAIN_* empty for the local chain)
npm run dev            # http://localhost:5050
```

Key settings in `backend/.env`:

| Setting | Example | Notes |
|---|---|---|
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/blue_carbon_registry` | |
| `ML_SERVICE_URL` | `http://127.0.0.1:8000` | |
| `BLOCKCHAIN_*`, `CARBON_CONTRACT_*` | (empty) | For the local chain these come automatically from `backend/.generated-blockchain.env`, written by the deploy script. Set them only for another network (e.g. Amoy) |
| `AUTH_SECRET` | `openssl rand -hex 32` | Signs wallet sessions |
| `PINATA_API_KEY` / `PINATA_API_SECRET` | | Optional; without them reports get a local placeholder hash |
| `GEE_PROJECT` | | |
| `STRICT_REAL_DATA` | `true` | Refuse to fall back to simulated satellite data |

### 5. Frontend

```bash
npm install
npm run dev            # http://localhost:5173 (proxies /api to the backend)
```

Use `VITE_BACKEND_URL` if the backend is not on port 5050. For local Hardhat, MetaMask does not
need a network or test ETH: it only signs the login message, and the backend pays gas.

---

## Demo walkthrough

For a live presentation, follow [docs/presentation-guide.md](docs/presentation-guide.md).


1. Open http://localhost:5173 and click **Connect wallet** (MetaMask signs a login message).
2. **Add a plot.** Switch the map to *Satellite*, click the corners of a mangrove patch (e.g.
   Thane Creek, Mumbai) and register. The satellite check accepts or rejects it with reasons.
3. On **My plots**, click **Demo: replay last year**. This takes a few minutes. It:
   - seals the baseline on-chain;
   - runs 4 quarterly checks on real past satellite data, each recorded on-chain.
4. Click **Reveal baseline and finish the year**. The contract re-checks the seal, calculates the
   credits and mints the NFT. The page shows plot vs baseline and the calculation line by line.
5. Open **Public page** (or **Public registry**, no login needed) and click **Verify the
   baseline**. Your browser re-hashes the audit file and compares the seal with the blockchain.

---

## Tests

```bash
cd blockchain && npm test      # contract: seal/reveal, BaselineMismatch, anomaly, multi-year, owner-only
cd backend && npm test         # credit rule mirror and monitoring windows
npm run lint                   # frontend
npm run smoke-test             # whole year end to end against a running app
```

Model evaluation reports (accuracy on regions the model never saw) are in `ml-service/models/*_report.txt`.

---

## Project status

Prototype for a final-year project. What is real and what is simplified:

| Real | Simplified / mock |
|---|---|
| Sentinel-1/2, GEDI, NASADEM data via Earth Engine | Identity (demo ID, no KYC) |
| Classifier, anomaly detector and carbon model trained and tested on real data | Single backend "oracle" writes to the chain |
| Synthetic-control baseline, commit-reveal, on-chain credit rule | Donor pool = unenrolled mangroves, not certified degraded land |
| Public, in-browser verification | Amoy testnet contract not yet redeployed |
| | No field calibration: carbon stocks are likely conservative (see docs) |
