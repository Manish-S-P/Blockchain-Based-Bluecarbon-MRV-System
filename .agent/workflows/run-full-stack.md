---
description: How to run the full Blue Carbon Registry stack locally
---

# Running the Full Stack

You need **4 terminals** in VS Code. Open each via `Terminal > New Terminal` (or `Ctrl+Shift+``).

## Terminal 1 — Blockchain (Hardhat Node)

```bash
cd blockchain
npx hardhat node
```
> Starts a local Ethereum node on `http://127.0.0.1:8545` with 20 test accounts.

## Terminal 2 — Deploy Smart Contract

```bash
cd blockchain
npm run deploy:local
```
> Deploys `BlueCarbonRegistry` to the local Hardhat node. Run once after starting the node.

## Terminal 3 — ML Service (FastAPI)

```bash
cd ml-service
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
> Starts the ML/GEE inference service on `http://127.0.0.1:8000`.

## Terminal 4 — Backend (Express + MongoDB)

```bash
cd backend
node server.js
```
> Starts the API server on `http://127.0.0.1:5050`. Connects to MongoDB Atlas.

## Terminal 5 — Frontend (Vite + React)

```bash
npm run dev
```
> Starts the frontend dev server on `http://localhost:5173`. This proxies `/api` to the backend.

## Quick Reference

| Service              | Port   | Directory     |
|----------------------|--------|---------------|
| Frontend (Vite)      | `5173` | root (`./`)   |
| Backend (Express)    | `5050` | `backend/`    |
| Blockchain (Hardhat) | `8545` | `blockchain/` |
| ML Service (FastAPI) | `8000` | `ml-service/` |

## Startup Order

1. **Hardhat node** (Terminal 1) — must be running before deploy
2. **Deploy contract** (Terminal 2) — one-time after node starts
3. **ML service** (Terminal 3) — needed for real GEE/ML data
4. **Backend** (Terminal 4) — needs MongoDB URI in `backend/.env`
5. **Frontend** (Terminal 5) — open http://localhost:5173
