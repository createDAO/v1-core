import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";
import "dotenv/config";

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "";
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || "";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";
const BASE_RPC_URL = process.env.BASE_RPC_URL || "";
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

// Define networks configuration
const networks: any = {
  hardhat: {
    chainId: 31337,
    gasPrice: 0,
    initialBaseFeePerGas: 0,
    mining: {
      auto: true,
      interval: 0,
    },
  },
};

// Add live networks only if private key is available
if (PRIVATE_KEY.length === 64 || PRIVATE_KEY.length === 66) {
  if (POLYGON_RPC_URL) {
    networks.polygon = {
      url: POLYGON_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 137,
    };
  }

  if (BASE_RPC_URL) {
    networks.base = {
      url: BASE_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 8453,
    };
  }

  if (SEPOLIA_RPC_URL) {
    networks.sepolia = {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
    };
  }
}

// Define etherscan configuration
const etherscan: any = {
  apiKey: {},
};

// Add API keys only if they are available
if (POLYGONSCAN_API_KEY) {
  etherscan.apiKey.polygon = POLYGONSCAN_API_KEY;
}
if (BASESCAN_API_KEY) {
  etherscan.apiKey.base = BASESCAN_API_KEY;
}
if (ETHERSCAN_API_KEY) {
  etherscan.apiKey.sepolia = ETHERSCAN_API_KEY;
}

const config: HardhatUserConfig = {
  mocha: {
    reporter: 'mocha-json-output-reporter',
    reporterOptions: {
      output: 'reports/data/test-results.json'
    }
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    gasPrice: 30,
    reportFormat: "legacy",
    outputFile: "reports/data/gas-results.md",
    forceTerminalOutput: false,
    noColors: false,
    excludeContracts: ["contracts/contracts-for-tests/"],
    reportPureAndViewMethods: true,
    trackGasDeltas: true,
    showMethodSig: true,
    showUncalledMethods: true,
  },
  solidity: {
    version: "0.8.28",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 1,
        details: {
          yulDetails: {
            optimizerSteps: "u",
          },
        },
      },
    },
  },
  networks,
  etherscan
};

export default config;
