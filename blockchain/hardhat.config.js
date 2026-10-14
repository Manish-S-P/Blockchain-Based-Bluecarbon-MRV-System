require("@nomiclabs/hardhat-ethers");

require('dotenv').config({ path: '../backend/.env' });

module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      evmVersion: "cancun",
      // The yearly credit calculation needs more local variables than the legacy pipeline allows.
      viaIR: true,
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    localhost: {
      url: process.env.HARDHAT_RPC_URL || "http://127.0.0.1:8545",
    },
    amoy: {
      url: process.env.AMOY_RPC_URL || "",
      accounts: process.env.AMOY_PRIVATE_KEY ? [process.env.AMOY_PRIVATE_KEY] : [],
      chainId: 80002,
      timeout: 60000,
    }
  },
};
