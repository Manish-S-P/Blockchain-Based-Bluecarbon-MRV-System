const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const balance = await deployer.getBalance();
  console.log("Account:", deployer.address);
  console.log("Balance:", hre.ethers.utils.formatEther(balance), "POL");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
