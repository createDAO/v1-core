import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";
import "dotenv/config";

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

// RPC URLs
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || "";
const BNB_CHAIN_RPC_URL = process.env.BNB_CHAIN_RPC_URL || "";
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || "";
const ARBITRUM_RPC_URL = process.env.ARBITRUM_RPC_URL || "";
const OPTIMISM_RPC_URL = process.env.OPTIMISM_RPC_URL || "";
const BASE_RPC_URL = process.env.BASE_RPC_URL || "";
const AVALANCHE_RPC_URL = process.env.AVALANCHE_RPC_URL || "";
const GNOSIS_RPC_URL = process.env.GNOSIS_RPC_URL || "";
const MANTLE_RPC_URL = process.env.MANTLE_RPC_URL || "";
const CELO_RPC_URL = process.env.CELO_RPC_URL || "";
const BLAST_RPC_URL = process.env.BLAST_RPC_URL || "";
const SCROLL_RPC_URL = process.env.SCROLL_RPC_URL || "";
const UNICHAIN_RPC_URL = process.env.UNICHAIN_RPC_URL || "";
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";

// API Keys
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "";
const ARBISCAN_API_KEY = process.env.ARBISCAN_API_KEY || "";
const OPTIMISTIC_ETHERSCAN_API_KEY =
  process.env.OPTIMISTIC_ETHERSCAN_API_KEY || "";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";
const SNOWTRACE_API_KEY = process.env.SNOWTRACE_API_KEY || "";
const GNOSISSCAN_API_KEY = process.env.GNOSISSCAN_API_KEY || "";
const MANTLESCAN_API_KEY = process.env.MANTLESCAN_API_KEY || "";
const CELOSCAN_API_KEY = process.env.CELOSCAN_API_KEY || "";
const BLASTSCAN_API_KEY = process.env.BLASTSCAN_API_KEY || "";
const SCROLLSCAN_API_KEY = process.env.SCROLLSCAN_API_KEY || "";
const UNISCAN_API_KEY = process.env.UNISCAN_API_KEY || "";

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
  // Ethereum Mainnet
  if (ETHEREUM_RPC_URL) {
    networks.ethereum = {
      url: ETHEREUM_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 1,
    };
  }

  // BNB Chain
  if (BNB_CHAIN_RPC_URL) {
    networks.bnbchain = {
      url: BNB_CHAIN_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 56,
    };
  }

  // Polygon
  if (POLYGON_RPC_URL) {
    networks.polygon = {
      url: POLYGON_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 137,
    };
  }

  // Arbitrum
  if (ARBITRUM_RPC_URL) {
    networks.arbitrum = {
      url: ARBITRUM_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 42161,
    };
  }

  // Optimism
  if (OPTIMISM_RPC_URL) {
    networks.optimism = {
      url: OPTIMISM_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 10,
    };
  }

  // Base
  if (BASE_RPC_URL) {
    networks.base = {
      url: BASE_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 8453,
    };
  }

  // Avalanche
  if (AVALANCHE_RPC_URL) {
    networks.avalanche = {
      url: AVALANCHE_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 43114,
    };
  }

  // Gnosis
  if (GNOSIS_RPC_URL) {
    networks.gnosis = {
      url: GNOSIS_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 100,
    };
  }

  // Mantle
  if (MANTLE_RPC_URL) {
    networks.mantle = {
      url: MANTLE_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 5000,
    };
  }

  // Celo
  if (CELO_RPC_URL) {
    networks.celo = {
      url: CELO_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 42220,
    };
  }

  // Blast
  if (BLAST_RPC_URL) {
    networks.blast = {
      url: BLAST_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 81457,
    };
  }

  // Scroll
  if (SCROLL_RPC_URL) {
    networks.scroll = {
      url: SCROLL_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 534352,
    };
  }

  // Unichain
  if (UNICHAIN_RPC_URL) {
    networks.unichain = {
      url: UNICHAIN_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 130,
    };
  }

  // Sepolia (testnet)
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

// Define sourcify configuration
const sourcify = {
  enabled: true,
  browserUrl: "https://github.com/createdao",
};

// Add API keys only if they are available
if (ETHERSCAN_API_KEY) {
  etherscan.apiKey.ethereum = ETHERSCAN_API_KEY;
  etherscan.apiKey.sepolia = ETHERSCAN_API_KEY;
}
if (BSCSCAN_API_KEY) {
  etherscan.apiKey.bnbchain = BSCSCAN_API_KEY;
}
if (POLYGONSCAN_API_KEY) {
  etherscan.apiKey.polygon = POLYGONSCAN_API_KEY;
}
if (ARBISCAN_API_KEY) {
  etherscan.apiKey.arbitrum = ARBISCAN_API_KEY;
}
if (OPTIMISTIC_ETHERSCAN_API_KEY) {
  etherscan.apiKey.optimism = OPTIMISTIC_ETHERSCAN_API_KEY;
}
if (BASESCAN_API_KEY) {
  etherscan.apiKey.base = BASESCAN_API_KEY;
}
if (SNOWTRACE_API_KEY) {
  etherscan.apiKey.avalanche = SNOWTRACE_API_KEY;
}
if (GNOSISSCAN_API_KEY) {
  etherscan.apiKey.gnosis = GNOSISSCAN_API_KEY;
}
if (MANTLESCAN_API_KEY) {
  etherscan.apiKey.mantle = MANTLESCAN_API_KEY;
}
if (CELOSCAN_API_KEY) {
  etherscan.apiKey.celo = CELOSCAN_API_KEY;
}
if (BLASTSCAN_API_KEY) {
  etherscan.apiKey.blast = BLASTSCAN_API_KEY;
}
if (SCROLLSCAN_API_KEY) {
  etherscan.apiKey.scroll = SCROLLSCAN_API_KEY;
}
if (UNISCAN_API_KEY) {
  etherscan.apiKey.unichain = UNISCAN_API_KEY;
}

const config: HardhatUserConfig = {
  // mocha: {
  //   reporter: 'mocha-json-output-reporter',
  //   reporterOptions: {
  //     output: 'reports/data/test-results.json'
  //   }
  // },
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
  etherscan,
  sourcify,
};

export default config;
