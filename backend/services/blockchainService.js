const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const ECOSYSTEM_ENUM = { mangrove: 0, seagrass: 1, saltmarsh: 2 };

const ecosystemToEnum = (vegetationType) => {
  const value = ECOSYSTEM_ENUM[String(vegetationType || '').toLowerCase()];
  if (value === undefined) {
    throw new Error(`Unsupported ecosystem type for on-chain registration: ${vegetationType}`);
  }
  return value;
};

const getContractClient = (network = 'local') => {
  const isAmoy = network === 'amoy';
  const rpcUrl = isAmoy ? process.env.AMOY_RPC_URL : process.env.BLOCKCHAIN_RPC_URL;
  const privateKey = isAmoy ? process.env.AMOY_PRIVATE_KEY : process.env.BLOCKCHAIN_PRIVATE_KEY;
  const contractAddress = isAmoy ? process.env.AMOY_CONTRACT_ADDRESS : process.env.CARBON_CONTRACT_ADDRESS;
  const contractAbiRaw = isAmoy && process.env.AMOY_CONTRACT_ABI ? process.env.AMOY_CONTRACT_ABI : process.env.CARBON_CONTRACT_ABI;
  const contractAbiPath = isAmoy && process.env.AMOY_CONTRACT_ABI_PATH ? process.env.AMOY_CONTRACT_ABI_PATH : process.env.CARBON_CONTRACT_ABI_PATH;

  if (!rpcUrl || !privateKey || !contractAddress) {
    if (isAmoy) {
      throw new Error(`Amoy configuration missing. Please add AMOY_RPC_URL, AMOY_PRIVATE_KEY, and AMOY_CONTRACT_ADDRESS to backend/.env`);
    }
    return null;
  }

  let contractAbi = null;
  if (contractAbiRaw) {
    contractAbi = JSON.parse(contractAbiRaw);
  } else if (contractAbiPath) {
    const candidatePaths = path.isAbsolute(contractAbiPath)
      ? [contractAbiPath]
      : [
          path.resolve(process.cwd(), contractAbiPath),
          path.resolve(__dirname, '..', '..', contractAbiPath),
        ];

    const resolved = candidatePaths.find((candidate) => fs.existsSync(candidate));
    if (!resolved) {
      throw new Error(`ABI file not found. Checked: ${candidatePaths.join(', ')}`);
    }

    const raw = fs.readFileSync(resolved, 'utf-8');
    const parsed = JSON.parse(raw);
    contractAbi = Array.isArray(parsed) ? parsed : parsed.abi;
  }

  if (!contractAbi) {
    return null;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(contractAddress, contractAbi, signer);
};

// Simulation is only used when no chain is configured. Once a chain is configured, failures
// are surfaced instead of being masked by a fake transaction.
const fallbackRegisterPlotOnChain = ({ plotId }) => ({
  success: true,
  txHash: `local-register-${plotId}`,
  onChain: false,
});

const fallbackMintCreditOnChain = ({ plotId, walletAddress, submittedCredits }) => {
  const tokenSeed = `${plotId}:${walletAddress}:${submittedCredits}:${Date.now()}`;
  const tokenId = crypto.createHash('sha1').update(tokenSeed).digest('hex').slice(0, 12);
  return { tokenId, txHash: 'local-simulation', onChain: false };
};

const sendRegisterPlot = async (contract, { plotId, walletAddress, area, vegetationType }) => {
  const areaWad = ethers.parseUnits(String(area), 18);
  const tx = await contract.registerPlot(plotId, walletAddress, areaWad, ecosystemToEnum(vegetationType));
  return tx.wait();
};

const registerPlotOnChain = async ({ plotId, walletAddress, area, vegetationType, network = 'local' }) => {
  const contract = getContractClient(network);
  if (!contract) {
    return fallbackRegisterPlotOnChain({ plotId });
  }

  const receipt = await sendRegisterPlot(contract, { plotId, walletAddress, area, vegetationType });
  return { success: true, txHash: receipt.hash, onChain: true };
};

const readMintedTokenId = (contract, receipt) => {
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === 'CreditMinted') {
        return parsed.args.tokenId.toString();
      }
    } catch {
      // Log from another contract/event (e.g. ERC721 Transfer); skip it.
    }
  }
  throw new Error(`CreditMinted event not found in transaction ${receipt.hash}`);
};

const mintCreditOnChain = async ({ plotId, walletAddress, submittedCredits, reportIpfsHash, network = 'local', area, vegetationType }) => {
  const contract = getContractClient(network);
  if (!contract) {
    return fallbackMintCreditOnChain({ plotId, walletAddress, submittedCredits });
  }

  // The plot may not exist on this chain yet (e.g. registered locally, minted on Amoy,
  // or the contract was redeployed), so register it first when needed.
  const plot = await contract.plots(plotId);
  if (!plot.exists) {
    await sendRegisterPlot(contract, { plotId, walletAddress, area, vegetationType });
  }

  const tx = await contract.mintCredit(walletAddress, plotId, ethers.parseUnits(String(submittedCredits), 18), reportIpfsHash);
  const receipt = await tx.wait();
  return { tokenId: readMintedTokenId(contract, receipt), txHash: receipt.hash, onChain: true };
};

module.exports = {
  registerPlotOnChain,
  mintCreditOnChain,
};
