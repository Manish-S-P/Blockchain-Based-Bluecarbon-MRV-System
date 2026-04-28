# Blockchain Module (Hardhat)

## Setup

```bash
cd blockchain
npm install
```

## Run local chain

```bash
npm run node
```

## Deploy contract

In a second terminal:

```bash
cd blockchain
npm run deploy:local:export
```

This also creates `backend/.generated-blockchain.env` with:
- contract address
- ABI artifact path for backend (`CARBON_CONTRACT_ABI_PATH`)
- RPC hint

Then set these in `backend/.env`:

```env
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_PRIVATE_KEY=<first hardhat account private key>
CARBON_CONTRACT_ADDRESS=<deployed contract address>
CARBON_CONTRACT_ABI_PATH=blockchain/artifacts/contracts/BlueCarbonRegistry.sol/BlueCarbonRegistry.json
```
