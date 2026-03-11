import hre from "hardhat";
import {
  type Address,
  type Hex,
  parseEther,
  PublicClient,
  WalletClient,
  createWalletClient,
  custom,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

// Get the viem helpers and provider from the network connection
export const getViemAndProvider = async () => {
  const connection = await hre.network.connect();
  return {
    viem: connection.viem,
    provider: connection.provider,
  };
};

export type ViemHelpers = Awaited<ReturnType<typeof getViemAndProvider>>["viem"];

export async function checkDelegation(
  client: PublicClient,
  eoaAddress: Address
): Promise<boolean> {
  try {
    const code = await client.getCode({ address: eoaAddress });

    if (!code || code === "0x") {
      return false;
    }

    return true;
  } catch (error) {
    console.error("[checkDelegation] Error checking delegation status:", error);
    return false;
  }
}

// Delegated account using local private key (required for signAuthorization)
// Created at module level so it persists across tests
const delegatedAccountPrivateKey = generatePrivateKey();
export const delegatedAccount = privateKeyToAccount(delegatedAccountPrivateKey);

export interface TestContext {
  viem: ViemHelpers;
  owner: Awaited<ReturnType<ViemHelpers["getWalletClients"]>>[0];
  attacker: Awaited<ReturnType<ViemHelpers["getWalletClients"]>>[0];
  recipient: Awaited<ReturnType<ViemHelpers["getWalletClients"]>>[0];
  sessionKeyAccount: ReturnType<typeof privateKeyToAccount>;
  sessionKeyPrivateKey: Hex;
  delegatedAccount: ReturnType<typeof privateKeyToAccount>;
  delegatedWalletClient: WalletClient;
  delegator: any;
  usdc: any;
  swapRouter: any;
  getBlockTimestamp: () => Promise<bigint>;
  publicClient: PublicClient;
  chainId: number;
}

// Common test values
export const ONE_HOUR = 3600n;
export const ONE_DAY = 86400n;

export async function setupTestContext(): Promise<TestContext> {
  // Get viem helpers and provider from a single network connection
  const { viem, provider } = await getViemAndProvider();

  // Get signers
  const wallets = await viem.getWalletClients();
  const owner = wallets[0];
  const attacker = wallets[1];
  const recipient = wallets[2];

  // Generate session key
  const sessionKeyPrivateKey = generatePrivateKey();
  const sessionKeyAccount = privateKeyToAccount(sessionKeyPrivateKey);

  // Deploy contracts
  const delegator = await viem.deployContract("AgentDelegator");
  const usdc = await viem.deployContract("MockERC20WithEIP3009", [
    "USD Coin",
    "USDC",
  ]);
  const swapRouter = await viem.deployContract("MockSwapRouter");

  // Fund the delegated account with some ETH for transactions
  const publicClient = await viem.getPublicClient();
  await owner.sendTransaction({
    to: delegatedAccount.address,
    value: parseEther("1"),
  });

  // Sign the authorization using the local account (not JSON-RPC)
  // Local accounts can sign directly without needing a wallet client
  const nonce = await publicClient.getTransactionCount({
    address: delegatedAccount.address,
  });
  const authorization = await delegatedAccount.signAuthorization({
    contractAddress: delegator.address as Address,
    chainId: publicClient.chain!.id,
    nonce,
  });

  // Send transaction with authorization list (owner can broadcast for delegatedAccount)
  await owner.sendTransaction({
    to: delegatedAccount.address,
    authorizationList: [authorization],
  });

  // const detected = await checkDelegation(publicClient, delegatedAccount.address);
  // console.log("Delegation detected:", detected);

  const chainId = await publicClient.getChainId();

  // Create a wallet client for the delegated account using the same provider/transport
  const delegatedWalletClient = createWalletClient({
    account: delegatedAccount,
    chain: publicClient.chain,
    transport: custom(provider),
  });

  const getBlockTimestamp = async (): Promise<bigint> => {
    const publicClient = await viem.getPublicClient();
    const block = await publicClient.getBlock();
    return block.timestamp;
  };

  return {
    viem,
    owner,
    attacker,
    recipient,
    sessionKeyAccount,
    sessionKeyPrivateKey,
    delegatedAccount,
    delegatedWalletClient,
    delegator,
    usdc,
    swapRouter,
    getBlockTimestamp,
    publicClient,
    chainId,
  };
}
