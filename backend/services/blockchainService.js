const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const ecosystemToEnum = (vegetationType) => {
  if (vegetationType === 'mangrove') return 0;
  if (vegetationType === 'seagrass') return 1;
  return 2;
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

const fallbackRegisterPlotOnChain = ({ plotId }) => ({
  success: true,
  txHash: `local-register-${plotId}`,
});

const fallbackMintCreditOnChain = ({ plotId, walletAddress, submittedCredits }) => {
  const tokenSeed = `${plotId}:${walletAddress}:${submittedCredits}:${Date.now()}`;
  const tokenId = crypto.createHash('sha1').update(tokenSeed).digest('hex').slice(0, 12);
  return { tokenId, txHash: 'local-simulation' };
};

const registerPlotOnChain = async ({ plotId, walletAddress, area, vegetationType, network = 'local' }) => {
  const contract = getContractClient(network);
  if (!contract) {
    return fallbackRegisterPlotOnChain({ plotId });
  }

  try {
    const areaWad = ethers.parseUnits(String(area), 18);
    const ecosystemEnum = ecosystemToEnum(vegetationType);
    const tx = await contract.registerPlot(plotId, walletAddress, areaWad, ecosystemEnum);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  } catch (error) {
    if (network === 'amoy') {
      console.error('❌ Polygon Amoy Registration Error:', error);
      throw error;
    }
    console.warn('On-chain register failed, using fallback simulation:', error.message);
    return fallbackRegisterPlotOnChain({ plotId });
  }
};

const mintCreditOnChain = async ({ plotId, walletAddress, submittedCredits, reportIpfsHash, network = 'local', area, vegetationType }) => {
  const contract = getContractClient(network);
  if (!contract) {
    return fallbackMintCreditOnChain({ plotId, walletAddress, submittedCredits });
  }

  try {
    if (network === 'amoy') {
      try {
        const areaWad = ethers.parseUnits(String(area || 0), 18);
        const ecosystemEnum = ecosystemToEnum(vegetationType || 'mangrove');
        const regTx = await contract.registerPlot(plotId, walletAddress, areaWad, ecosystemEnum);
        await regTx.wait();
      } catch (regErr) {
        console.warn('⚠️ Auto-registration during mint skipped/failed:', regErr.message);
        if (regErr.message.includes('insufficient funds')) {
          throw regErr;
        }
      }
    }

    const tx = await contract.mintCredit(walletAddress, plotId, ethers.parseUnits(String(submittedCredits), 18), reportIpfsHash);
    const receipt = await tx.wait();
    const tokenId = receipt?.hash?.slice(0, 12) || crypto.randomUUID().slice(0, 12);
    return { tokenId, txHash: receipt.hash };
  } catch (error) {
    if (network === 'amoy') {
      console.error('❌ Polygon Amoy Minting Error:', error);
      throw error;
    }
    console.warn('On-chain mint failed, using fallback mint simulation:', error.message);
    return fallbackMintCreditOnChain({ plotId, walletAddress, submittedCredits });
  }
};

module.exports = {
  registerPlotOnChain,
  mintCreditOnChain,
};
