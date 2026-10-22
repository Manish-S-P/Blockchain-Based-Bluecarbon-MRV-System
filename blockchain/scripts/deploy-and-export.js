// Deploys BlueCarbonRegistry and writes the connection settings to backend/.generated-blockchain.env,
// which the backend reads automatically (values in backend/.env take priority).
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

// Hardhat's built-in test account #0. This key is public and only valid on a local test chain.
const HARDHAT_ACCOUNT_0_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const outPath = path.resolve(__dirname, "../../backend/.generated-blockchain.env");

/** Address from a previous run, if that contract still exists on this chain. */
async function existingDeployment() {
  if (process.env.FORCE_DEPLOY || !fs.existsSync(outPath)) return null;
  const match = fs.readFileSync(outPath, "utf-8").match(/^CARBON_CONTRACT_ADDRESS=(0x[0-9a-fA-F]{40})/m);
  if (!match) return null;
  const code = await hre.ethers.provider.getCode(match[1]);
  return code && code !== "0x" ? match[1] : null;
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const { chainId } = await hre.ethers.provider.getNetwork();
  const existing = await existingDeployment();
  if (existing) {
    console.log(`BlueCarbonRegistry already deployed at ${existing}; keeping it (set FORCE_DEPLOY=1 to redeploy).`);
    return;
  }
  console.log("Deploying with:", deployer.address, "on chain", chainId);

  const Contract = await hre.ethers.getContractFactory("BlueCarbonRegistry");
  const contract = await Contract.deploy(deployer.address);
  await contract.deployed();
  console.log("BlueCarbonRegistry deployed at:", contract.address);

  const local = chainId === 31337;
  const rpcUrl = process.env.HARDHAT_RPC_URL || hre.network.config.url || "http://127.0.0.1:8545";
  const lines = [
    "# Written by blockchain/scripts/deploy-and-export.js. Values in backend/.env take priority.",
    `BLOCKCHAIN_RPC_URL=${rpcUrl}`,
    `CARBON_CONTRACT_ADDRESS=${contract.address}`,
    "CARBON_CONTRACT_ABI_PATH=blockchain/artifacts/contracts/BlueCarbonRegistry.sol/BlueCarbonRegistry.json",
    local
      ? `BLOCKCHAIN_PRIVATE_KEY=${HARDHAT_ACCOUNT_0_KEY}`
      : "# BLOCKCHAIN_PRIVATE_KEY=<owner key; set it in backend/.env, never commit it>",
  ];
  fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf-8");
  console.log(`Wrote ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
