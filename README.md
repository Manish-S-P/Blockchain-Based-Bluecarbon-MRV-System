# Blue Carbon Registry

## Run frontend

```bash
npm install
npm run dev
```

Frontend runs on Vite and proxies all `/api/*` calls to `http://localhost:5050` by default.

## Run backend

```bash
cd backend
npm install
npm run dev
```

## Local blockchain deployment (Hardhat)

Terminal 1:

```bash
cd blockchain
npm install
npm run node
```

Terminal 2:

```bash
cd blockchain
npm run deploy:local:export
```

Then copy values from `backend/.generated-blockchain.env` into `backend/.env`.

## Run ML service (FastAPI)

```bash
cd ml-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Before running ML service:

```bash
export GEE_PROJECT=river-carrier-398207
export GEE_SERVICE_ACCOUNT_JSON_PATH=ml-service/keys/gee-service-account.json
```

Create `backend/.env` from `backend/.env.example`:

```env
MONGODB_URI=<your_mongodb_connection_string>
PORT=5050
```

If `MONGODB_URI` is missing or invalid, backend API routes return a clear `503` error.

## Implemented MRV API flow

- `POST /api/projects` -> Register plot, assign immutable-style `plotId`.
- `GET /api/projects/:walletAddress` -> Farmer dashboard projects.
- `POST /api/mrv/quarterly-run/:plotId` -> Run quarterly cycle and store NDVI + ML evidence.
- `POST /api/mrv/annual-finalize/:plotId` -> Build annual MRV report, pin to IPFS, verify credits, and mint NFT token.
- `GET /api/system/status` -> Dashboard integration health for DB/ML/IPFS/blockchain/GEE config.

- **ML service integration**: if `ML_SERVICE_URL` is set, backend calls `POST {ML_SERVICE_URL}/mrv/infer`.
- **Pinata IPFS integration**: if `PINATA_API_KEY` and `PINATA_API_SECRET` are set, backend uploads annual MRV report to Pinata.
- **Blockchain integration**: if `BLOCKCHAIN_RPC_URL`, `BLOCKCHAIN_PRIVATE_KEY`, `CARBON_CONTRACT_ADDRESS`, and ABI (`CARBON_CONTRACT_ABI` or `CARBON_CONTRACT_ABI_PATH`) are set, backend calls on-chain `registerPlot(...)` and `mintCredit(...)`.

If any integration config is missing/unavailable, backend automatically falls back to safe local simulation so development is never blocked.
