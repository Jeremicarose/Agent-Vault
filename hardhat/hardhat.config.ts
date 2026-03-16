import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.29",
        settings: {
          evmVersion: "prague",
        },
      },
      production: {
        version: "0.8.29",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "prague",
        },
      },
    },
  },

  networks: {
    hederaTestnet: {
      type: "http",
      chainType: "l1",
      url: "https://testnet.hashio.io/api",
      chainId: 296,
      accounts: [configVariable("HACKATHON_KEY")],
    },
    hederaMainnet: {
      type: "http",
      chainType: "l1",
      url: "https://mainnet.hashio.io/api",
      chainId: 295,
      accounts: [configVariable("HACKATHON_KEY")],
    },
  },

  chainDescriptors: {
    295: {
      name: "hedera",
      hardforkHistory: {
        cancun: { blockNumber: 0 },
      },
      blockExplorers: {
        etherscan: {
          name: "HashScan",
          url: "https://hashscan.io",
          apiUrl: "https://hashscan.io/api/v1",
        },
      },
    },
    296: {
      name: "hedera-testnet",
      hardforkHistory: {
        cancun: { blockNumber: 0 },
      },
      blockExplorers: {
        etherscan: {
          name: "HashScan Testnet",
          url: "https://hashscan.io/testnet",
          apiUrl: "https://hashscan.io/api/v1",
        },
      },
    },
  },

  verify: {
    etherscan: {
      apiKey: configVariable("HASHSCAN_API_KEY"),
    },
  },
});
