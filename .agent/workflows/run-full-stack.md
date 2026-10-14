---
description: How to run the full Blue Carbon Registry stack locally
---

# Running the Full Stack

See the "Run it locally" section of README.md for full details. In short, start these in order:

| Step | Command | Port |
|---|---|---|
| 1. MongoDB | `docker run -d --name bcr-mongo -p 127.0.0.1:27017:27017 mongo:7` (or `docker start bcr-mongo`) | 27017 |
| 2. Blockchain | `cd blockchain && npm run node` | 8545 |
| 3. Deploy contract | `cd blockchain && npm run deploy:local:export`, then copy values into `backend/.env` | — |
| 4. ML service | `cd ml-service && source .venv/bin/activate && uvicorn app.main:app --host 127.0.0.1 --port 8000` (needs `GEE_PROJECT`) | 8000 |
| 5. Backend | `cd backend && node server.js` | 5050 |
| 6. Frontend | `npm run dev` | 5173 |

Redeploy the contract (step 3) every time the Hardhat node restarts, because the local chain starts empty.
