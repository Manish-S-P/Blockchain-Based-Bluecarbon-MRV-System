const hre = require("hardhat");

async function main() {
  const contractAddress = process.env.AMOY_CONTRACT_ADDRESS || process.env.CARBON_CONTRACT_ADDRESS; // replace if needed
  if (!contractAddress) {
    console.error("Please add AMOY_CONTRACT_ADDRESS to your .env or replace it in the script.");
    return;
  }

  // Load the ABI from Hardhat artifacts
  const Contract = await hre.ethers.getContractFactory("BlueCarbonRegistry");
  const contract = Contract.attach(contractAddress);

  const [deployer] = await hre.ethers.getSigners();
  const addressToCheck = deployer.address;

  console.log(`Checking balance for address: ${addressToCheck}`);
  console.log(`Using contract at: ${contractAddress}`);

  try {
    const balance = await contract.balanceOf(addressToCheck);
    console.log(`\n🎉 Success! You have exactly ${balance.toString()} Blue Carbon Credit (BCC) NFTs minted on this network!`);
  } catch (err) {
    console.error("Error querying the contract. Are you sure you are on the right network and the contract address is correct?", err.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
