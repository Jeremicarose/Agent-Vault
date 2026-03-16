/**
 * Deploy AgentDelegator + MockERC20 (Test USDC) to Hedera testnet
 *
 * Usage:
 *   HACKATHON_KEY=0x... npx hardhat run scripts/deploy.ts --network hederaTestnet
 */

import hre from "hardhat";

async function main() {
  const connection = await hre.network.connect();
  const viem = connection.viem;
  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  const chainId = await publicClient.getChainId();
  console.log("Chain ID:", chainId);
  console.log("Deployer:", deployer.account.address);

  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log("Balance:", (Number(balance) / 1e18).toFixed(4), "HBAR (tinybars:", balance.toString(), ")");

  if (balance === 0n) {
    throw new Error("Deployer has no balance. Get testnet HBAR from https://portal.hedera.com/");
  }

  // Deploy AgentDelegator
  console.log("\n--- Deploying AgentDelegator ---");
  const delegator = await viem.deployContract("AgentDelegator");
  console.log("AgentDelegator deployed at:", delegator.address);

  // Deploy MockERC20 as Test USDC (6 decimals)
  console.log("\n--- Deploying Test USDC (MockERC20WithEIP3009) ---");
  const usdc = await viem.deployContract("MockERC20WithEIP3009", [
    "USD Coin",
    "USDC",
  ]);
  console.log("Test USDC deployed at:", usdc.address);

  // Mint 1,000,000 USDC to deployer (1M * 10^18 since MockERC20 uses 18 decimals)
  console.log("\n--- Minting test USDC ---");
  const mintAmount = 1_000_000n * 10n ** 18n;
  await usdc.write.mint([deployer.account.address, mintAmount]);
  console.log("Minted 1,000,000 test USDC to", deployer.account.address);

  console.log("\n========================================");
  console.log("DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log("Chain ID:          ", chainId);
  console.log("AgentDelegator:    ", delegator.address);
  console.log("Test USDC:         ", usdc.address);
  console.log("Deployer:          ", deployer.account.address);
  console.log("\nNext: Update packages/contracts/addresses.ts and apps/web/config/tokens.ts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
