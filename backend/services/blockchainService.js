// Talks to BlueCarbonRegistry (blockchain/contracts/BlueCarbonRegistry.sol).
//
// When no chain is configured (BLOCKCHAIN_* unset) every call is simulated so development
// still works; simulated results are marked onChain: false. Once a chain is configured,
// failures are returned as errors instead of being hidden.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const ECOSYSTEM_ENUM = { mangrove: 0, seagrass: 1, saltmarsh: 2 };
const OUTCOMES = ['Minted', 'NoProvableGain', 'AnomalyDetected', 'InsufficientData'];

/** t CO2 (or ha) as an 18-decimal integer string, the unit the contract uses. */
const toWad = (value) => ethers.parseUnits(Number(value).toFixed(12), 18).toString();
const fromWad = (value) => Number(ethers.formatUnits(value, 18));

const loadAbi = () => {
  if (process.env.CARBON_CONTRACT_ABI) return JSON.parse(process.env.CARBON_CONTRACT_ABI);
  const abiPath = process.env.CARBON_CONTRACT_ABI_PATH;
  if (!abiPath) return null;
  const candidates = path.isAbsolute(abiPath)
    ? [abiPath]
    : [path.resolve(process.cwd(), abiPath), path.resolve(__dirname, '..', '..', abiPath)];
  const resolved = candidates.find((candidate) => fs.existsSync(candidate));
  if (!resolved) throw new Error(`ABI file not found. Checked: ${candidates.join(', ')}`);
  const parsed = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
  return Array.isArray(parsed) ? parsed : parsed.abi;
};

let cachedContract;
const getContract = () => {
  if (cachedContract !== undefined) return cachedContract;
  const { BLOCKCHAIN_RPC_URL: rpcUrl, BLOCKCHAIN_PRIVATE_KEY: privateKey, CARBON_CONTRACT_ADDRESS: address } = process.env;
  const abi = loadAbi();
  if (!rpcUrl || !privateKey || !address || !abi) {
    cachedContract = null;
    return null;
  }
  const signer = new ethers.Wallet(privateKey, new ethers.JsonRpcProvider(rpcUrl));
  cachedContract = new ethers.Contract(address, abi, signer);
  return cachedContract;
};

const chainConfigured = () => Boolean(getContract());
const fakeTx = (label) => `simulated-${label}-${crypto.randomBytes(6).toString('hex')}`;

const send = async (fn) => {
  const tx = await fn();
  return tx.wait();
};

const registerPlotOnChain = async ({ plotId, walletAddress, area, vegetationType }) => {
  const contract = getContract();
  if (!contract) return { txHash: fakeTx('register'), onChain: false };
  const ecosystem = ECOSYSTEM_ENUM[vegetationType];
  if (ecosystem === undefined) throw new Error(`Unsupported ecosystem: ${vegetationType}`);
  const receipt = await send(() => contract.registerPlot(plotId, walletAddress, toWad(area), ecosystem));
  return { txHash: receipt.hash, onChain: true };
};

/** keccak256(abi.encode(plotId, year, dayZero, changes, halfWidths, auditHash, salt)), same as the contract. */
const computeCommitment = ({ plotId, year, dayZero, changesWad, halfWidthsWad, auditHash, salt }) => ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'uint16', 'uint64', 'int256[4]', 'uint256[4]', 'bytes32', 'bytes32'],
    [plotId, year, dayZero, changesWad, halfWidthsWad, auditHash, salt],
  ),
);

/** Is the chain reachable and is the contract actually deployed at the configured address? */
const chainHealth = async () => {
  const contract = getContract();
  if (!contract) return { configured: false, ok: false, message: 'not configured (simulated)' };
  try {
    const code = await contract.runner.provider.getCode(await contract.getAddress());
    if (code === '0x') {
      return { configured: true, ok: false, message: 'no contract at the configured address (was the chain restarted without redeploying?)' };
    }
    return { configured: true, ok: true, message: 'connected' };
  } catch {
    return { configured: true, ok: false, message: 'blockchain node not reachable' };
  }
};

/** Registers the plot on-chain if it is missing there (e.g. after a local chain restart). */
const ensurePlotOnChain = async ({ plotId, walletAddress, area, vegetationType }) => {
  const contract = getContract();
  if (!contract) return { onChain: false, registered: false };
  const plot = await contract.plots(plotId);
  if (plot.exists) return { onChain: true, registered: false };
  const result = await registerPlotOnChain({ plotId, walletAddress, area, vegetationType });
  return { ...result, registered: true };
};

/** Turns contract revert reasons into advice a presenter can act on. */
const explainChainError = (error) => {
  const text = `${error?.shortMessage || ''} ${error?.reason || ''} ${error?.message || ''}`;
  if (/Baseline not committed|Plot does not exist/.test(text)) {
    return 'The blockchain does not have this plot\'s current year (the local chain was probably restarted). Delete the plot and register it again, or redeploy and reset the demo data (see README).';
  }
  if (/BaselineMismatch/.test(text)) return 'The revealed baseline does not match the seal on the blockchain, so no credits were issued.';
  if (/ECONNREFUSED|could not detect network|network/i.test(text)) return 'The blockchain node is not reachable. Is it running?';
  if (/insufficient funds/i.test(text)) return 'The backend wallet has no funds left to pay for blockchain transactions.';
  return null;
};

const commitBaselineOnChain = async ({ plotId, commitment, dayZero }) => {
  const contract = getContract();
  if (!contract) return { txHash: fakeTx('commit'), onChain: false };
  const receipt = await send(() => contract.commitBaseline(plotId, commitment, dayZero));
  return { txHash: receipt.hash, onChain: true };
};

const recordObservationOnChain = async ({ plotId, quarter, observation, dataHash }) => {
  const contract = getContract();
  if (!contract) return { txHash: fakeTx('observe'), onChain: false };
  const receipt = await send(() => contract.recordObservation(
    plotId, quarter, toWad(observation.plotChange), toWad(observation.plotHalfWidth),
    Math.round(observation.cover * 10_000), observation.usable, observation.anomaly, dataHash,
  ));
  return { txHash: receipt.hash, onChain: true };
};

/**
 * Reveal the baseline and let the contract compute and mint the year's credits.
 * `simulated` is the backend's mirror result, used only when no chain is configured.
 */
const finalizeYearOnChain = async ({ plotId, reveal, reportIpfsHash, simulated }) => {
  const contract = getContract();
  if (!contract) {
    return {
      onChain: false,
      txHash: fakeTx('finalize'),
      outcome: simulated.outcome,
      credits: simulated.credits,
      tokenId: simulated.credits > 0 ? fakeTx('token') : '',
    };
  }
  const receipt = await send(() => contract.finalizeYear(plotId, reveal, reportIpfsHash));
  for (const log of receipt.logs) {
    let parsed;
    try {
      parsed = contract.interface.parseLog(log);
    } catch {
      continue;
    }
    if (parsed?.name === 'YearFinalized') {
      const args = parsed.args;
      return {
        onChain: true,
        txHash: receipt.hash,
        outcome: OUTCOMES[Number(args.outcome)],
        credits: fromWad(args.credits),
        tokenId: args.tokenId > 0n ? args.tokenId.toString() : '',
        yearGain: fromWad(args.yearGain),
        yearHalfWidth: fromWad(args.yearHalfWidth),
        provenTreeGain: fromWad(args.provenTreeGain),
        cumulativeSoil: fromWad(args.cumulativeSoil),
      };
    }
  }
  throw new Error(`YearFinalized event not found in transaction ${receipt.hash}`);
};

/** On-chain record of a plot's year, for the public verification page. */
const readYearOnChain = async (plotId, year) => {
  const contract = getContract();
  if (!contract) return null;
  const record = await contract.yearRecords(plotId, year);
  return {
    contract: await contract.getAddress(),
    commitment: record.commitment,
    dayZero: Number(record.dayZero),
    observations: Number(record.observations),
    finalized: record.finalized,
  };
};

module.exports = {
  chainHealth,
  ensurePlotOnChain,
  explainChainError,
  toWad,
  fromWad,
  chainConfigured,
  computeCommitment,
  registerPlotOnChain,
  commitBaselineOnChain,
  recordObservationOnChain,
  finalizeYearOnChain,
  readYearOnChain,
};
