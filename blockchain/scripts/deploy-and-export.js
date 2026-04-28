const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Contract = await hre.ethers.getContractFactory("BlueCarbonRegistry");
  const contract = await Contract.deploy(deployer.address);
  await contract.deployed();

  const address = contract.address;
  console.log("BlueCarbonRegistry deployed at:", address);

  const artifact = await hre.artifacts.readArtifact("BlueCarbonRegistry");
  const outPath = path.resolve(__dirname, "../../backend/.generated-blockchain.env");
  const lines = [
    `BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545`,
    `CARBON_CONTRACT_ADDRESS=${address}`,
    `CARBON_CONTRACT_ABI_PATH=blockchain/artifacts/contracts/BlueCarbonRegistry.sol/BlueCarbonRegistry.json`,
    `# For local hardhat, use account[0] private key shown in 'npm run node'`,
    `# BLOCKCHAIN_PRIVATE_KEY=<paste_private_key_here>`,
  ];

  fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf-8");
  console.log(`Wrote backend env hints to ${outPath}`);
  console.log("ABI JSON:");
  console.log(JSON.stringify(artifact.abi));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
