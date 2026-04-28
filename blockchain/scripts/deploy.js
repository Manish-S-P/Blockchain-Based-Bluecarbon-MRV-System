async function main() {
  const hre = require("hardhat");
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Contract = await hre.ethers.getContractFactory("BlueCarbonRegistry");
  const contract = await Contract.deploy(deployer.address);
  await contract.deployed();

  const address = contract.address;
  console.log("BlueCarbonRegistry deployed at:", address);

  const artifact = await hre.artifacts.readArtifact("BlueCarbonRegistry");
  console.log("ABI JSON:");
  console.log(JSON.stringify(artifact.abi));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
