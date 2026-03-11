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
    cronosTestnet: {
      type: "http",
      chainType: "l1",
      url: "https://evm-t3.cronos.org",
      chainId: 338,
      accounts: [configVariable("HACKATHON_KEY")],
    },
    cronosMainnet: {
      type: "http",
      chainType: "l1",
      url: "https://evm.cronos.org",
      chainId: 25,
      accounts: [configVariable("HACKATHON_KEY")],
    },
  },

  chainDescriptors: {
    25: {
      name: "cronos",
      hardforkHistory: {
        cancun: { blockNumber: 0 },
      },
      blockExplorers: {
        etherscan: {
          name: "Cronoscan",
          url: "https://explorer.cronos.org",
          apiUrl: "https://explorer-api.cronos.org/mainnet/api/v1/hardhat/contract",
        },
      },
    },
    338: {
      name: "cronos-testnet",
      hardforkHistory: {
        cancun: { blockNumber: 0 },
      },
      blockExplorers: {
        etherscan: {
          name: "Cronoscan Testnet",
          url: "https://explorer.cronos.org/testnet",
          apiUrl: "https://explorer-api.cronos.org/testnet/api/v1/hardhat/contract",
        },
      },
    },
  },

  verify: {
    etherscan: {
      apiKey: configVariable(
        // process.env.HARDHAT_NETWORK === "cronosMainnet"
          // ? "CRONOS_EXPLORER"
          // : "CRONOS_EXPLORER_TEST",
          "CRONOS_EXPLORER"
      ),
    },
  },
});
