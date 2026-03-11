import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  type Address,
  type Hex,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
  toBytes,
  concat,
  encodeFunctionData,
  parseEther,
} from "viem";
import { setupTestContext, TestContext, ONE_DAY, delegatedAccount } from "../helpers/setup.js";

// EIP-712 domain type hash
const EIP712_DOMAIN_TYPEHASH = keccak256(
  toBytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
);

// TransferWithAuthorization type hash (EIP-3009)
const TRANSFER_WITH_AUTHORIZATION_TYPEHASH = keccak256(
  toBytes("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")
);

// Helper to compute EIP-3009 struct hash
function computeTransferAuthorizationStructHash(params: {
  from: Address;
  to: Address;
  value: bigint;
  validAfter: bigint;
  validBefore: bigint;
  nonce: Hex;
}): Hex {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("bytes32, address, address, uint256, uint256, uint256, bytes32"),
      [
        TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
        params.from,
        params.to,
        params.value,
        params.validAfter,
        params.validBefore,
        params.nonce,
      ]
    )
  );
}

// Helper to compute domain separator
function computeDomainSeparator(params: {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: Address;
}): Hex {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("bytes32, bytes32, bytes32, uint256, address"),
      [
        EIP712_DOMAIN_TYPEHASH,
        keccak256(toBytes(params.name)),
        keccak256(toBytes(params.version)),
        BigInt(params.chainId),
        params.verifyingContract,
      ]
    )
  );
}

// Helper to compute final EIP-712 hash
function computeEIP712Hash(domainSeparator: Hex, structHash: Hex): Hex {
  return keccak256(concat(["0x1901", domainSeparator, structHash]));
}

describe("AgentDelegator - EIP-1271 Signature Validation", async function () {
  let ctx: TestContext;

  beforeEach(async function () {
    ctx = await setupTestContext();
  });

  describe("Basic Signature Validation", async function () {
    it("should reject invalid signature length", async function () {
      const hash = keccak256(toBytes("test-message"));
      const invalidSignature = "0x1234" as Hex; // Too short

      const result = await ctx.delegator.read.isValidSignature([
        hash,
        invalidSignature,
      ]);
      assert.notEqual(result, "0x1626ba7e"); // Not valid magic value
    });

    it("should ALWAYS reject 97-byte signatures for EIP-1271 (security measure)", async function () {
      const hash = keccak256(toBytes("test-message"));
      const fakeSessionId = keccak256(toBytes("fake-session"));

      const sessionSig = await ctx.sessionKeyAccount.signMessage({
        message: { raw: hash },
      });

      const combinedSignature = concat([fakeSessionId, sessionSig]);
      assert.equal((combinedSignature.length - 2) / 2, 97);

      const result = await ctx.delegator.read.isValidSignature([
        hash,
        combinedSignature,
      ]);
      assert.equal(result, "0xffffffff");
    });

    it("should reject 149-byte signature with non-existent session", async function () {
      const fakeSessionId = keccak256(toBytes("fake-session"));
      const verifyingContract = ctx.usdc.address as Address;
      const structHash = keccak256(toBytes("fake-struct-hash"));

      const domainSeparator = computeDomainSeparator({
        name: "USD Coin",
        version: "1",
        chainId: ctx.chainId,
        verifyingContract,
      });

      const hash = computeEIP712Hash(domainSeparator, structHash);

      const delegatorDomain = {
        name: "AgentDelegator",
        version: "1",
        chainId: ctx.chainId,
        verifyingContract: ctx.delegator.address as Address,
      };

      const sessionSig = await ctx.sessionKeyAccount.signTypedData({
        domain: delegatorDomain,
        types: {
          SessionSignature: [
            { name: "verifyingContract", type: "address" },
            { name: "structHash", type: "bytes32" },
          ],
        },
        primaryType: "SessionSignature",
        message: {
          verifyingContract,
          structHash,
        },
      });

      const signature149 = concat([
        fakeSessionId,
        verifyingContract,
        structHash,
        sessionSig,
      ]);

      assert.equal((signature149.length - 2) / 2, 149);

      const result = await ctx.delegator.read.isValidSignature([
        hash,
        signature149,
      ]);
      assert.equal(result, "0xffffffff");
    });
  });

  describe("EIP-3009 TransferWithAuthorization (via delegated wallet)", async function () {
    it("should validate owner EOA signature for EIP-3009", async function () {
      // The delegated account (7702 delegated to AgentDelegator) can sign directly
      const now = await ctx.getBlockTimestamp();
      const nonce = keccak256(toBytes("test-nonce-1"));

      // Build EIP-3009 message
      const transferParams = {
        from: delegatedAccount.address,
        to: ctx.recipient.account.address,
        value: parseEther("100"),
        validAfter: now,
        validBefore: now + ONE_DAY,
        nonce,
      };

      // Compute USDC domain separator
      const usdcDomain = {
        name: "USD Coin",
        version: "1",
        chainId: ctx.chainId,
        verifyingContract: ctx.usdc.address as Address,
      };

      // Owner signs the EIP-3009 message directly
      const ownerSignature = await delegatedAccount.signTypedData({
        domain: usdcDomain,
        types: {
          TransferWithAuthorization: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
          ],
        },
        primaryType: "TransferWithAuthorization",
        message: transferParams,
      });

      // Compute the hash that USDC would compute
      const structHash = computeTransferAuthorizationStructHash(transferParams);
      const domainSeparator = computeDomainSeparator(usdcDomain);
      const hash = computeEIP712Hash(domainSeparator, structHash);

      // Verify via isValidSignature (65-byte owner signature)
      // Note: This calls the delegated contract's isValidSignature
      const result = await ctx.publicClient.readContract({
        address: delegatedAccount.address,
        abi: ctx.delegator.abi,
        functionName: "isValidSignature",
        args: [hash, ownerSignature],
      });

      assert.equal(result, "0x1626ba7e"); // Valid magic value
    });

    it("should validate session key 149-byte signature for approved contract", async function () {
      const now = await ctx.getBlockTimestamp();

      // Step 1: Grant a session with USDC approved
      // With ERC-7702, call grantSession directly (msg.sender == address(this))
      const approvedContracts = [
        {
          contractAddress: ctx.usdc.address as Address,
          nameHash: keccak256(toBytes("USD Coin")),
          versionHash: keccak256(toBytes("1")),
        },
      ];

      // Call grantSession directly on the delegated account
      await ctx.delegatedWalletClient.sendTransaction({
        account: delegatedAccount,
        chain: ctx.publicClient.chain,
        to: delegatedAccount.address,
        data: encodeFunctionData({
          abi: ctx.delegator.abi,
          functionName: "grantSession",
          args: [
            ctx.sessionKeyAccount.address,
            [ctx.swapRouter.address], // allowed targets
            [], // allowed selectors (empty = all)
            now,
            now + ONE_DAY,
            approvedContracts,
          ],
        }),
      });

      // Step 2: Get the sessionId (compute it the same way the contract does)
      const sessionNonce = await ctx.publicClient.readContract({
        address: delegatedAccount.address,
        abi: ctx.delegator.abi,
        functionName: "getSessionNonce",
        args: [],
      });

      // sessionId = keccak256(abi.encode(address(this), sessionKey, nonce - 1))
      const sessionId = keccak256(
        encodeAbiParameters(
          parseAbiParameters("address, address, uint256"),
          [delegatedAccount.address, ctx.sessionKeyAccount.address, (sessionNonce as bigint) - 1n]
        )
      );

      // Verify session was created
      const isValid = await ctx.publicClient.readContract({
        address: delegatedAccount.address,
        abi: ctx.delegator.abi,
        functionName: "isSessionValid",
        args: [sessionId],
      });
      assert.equal(isValid, true);

      // Step 3: Create EIP-3009 transfer authorization
      const nonce = keccak256(toBytes("session-nonce-1"));
      const transferParams = {
        from: delegatedAccount.address,
        to: ctx.recipient.account.address,
        value: parseEther("50"),
        validAfter: now,
        validBefore: now + ONE_DAY,
        nonce,
      };

      // Compute hashes
      const structHash = computeTransferAuthorizationStructHash(transferParams);
      const domainSeparator = computeDomainSeparator({
        name: "USD Coin",
        version: "1",
        chainId: ctx.chainId,
        verifyingContract: ctx.usdc.address as Address,
      });
      const hash = computeEIP712Hash(domainSeparator, structHash);

      // Step 4: Session key signs SessionSignature(verifyingContract, structHash)
      const delegatorDomain = {
        name: "AgentDelegator",
        version: "1",
        chainId: ctx.chainId,
        verifyingContract: delegatedAccount.address,
      };

      const sessionSig = await ctx.sessionKeyAccount.signTypedData({
        domain: delegatorDomain,
        types: {
          SessionSignature: [
            { name: "verifyingContract", type: "address" },
            { name: "structHash", type: "bytes32" },
          ],
        },
        primaryType: "SessionSignature",
        message: {
          verifyingContract: ctx.usdc.address as Address,
          structHash,
        },
      });

      // Step 5: Build 149-byte signature
      const signature149 = concat([
        sessionId,
        ctx.usdc.address as Hex,
        structHash,
        sessionSig,
      ]);

      assert.equal((signature149.length - 2) / 2, 149);

      // Step 6: Verify via isValidSignature on delegated account
      const result = await ctx.publicClient.readContract({
        address: delegatedAccount.address,
        abi: ctx.delegator.abi,
        functionName: "isValidSignature",
        args: [hash, signature149],
      });

      assert.equal(result, "0x1626ba7e"); // Valid magic value!
    });

    it("should reject session key signature for unapproved token (Permit2-style attack)", async function () {
      const now = await ctx.getBlockTimestamp();

      // Deploy a second token (WETH) that will NOT be approved for session signatures
      // This simulates an attacker trying to drain a different token than what was approved
      const weth = await ctx.viem.deployContract("MockERC20WithEIP3009", [
        "Wrapped Ether",
        "WETH",
      ]);

      // Mint some WETH to the delegated account (the victim's wallet)
      await weth.write.mint([delegatedAccount.address, parseEther("100")]);

      // Grant session with ONLY USDC approved (not WETH)
      // User approves session key for USDC payments only
      const approvedContracts = [
        {
          contractAddress: ctx.usdc.address as Address,
          nameHash: keccak256(toBytes("USD Coin")),
          versionHash: keccak256(toBytes("1")),
        },
      ];

      await ctx.delegatedWalletClient.sendTransaction({
        account: delegatedAccount,
        chain: ctx.publicClient.chain,
        to: delegatedAccount.address,
        data: encodeFunctionData({
          abi: ctx.delegator.abi,
          functionName: "grantSession",
          args: [
            ctx.sessionKeyAccount.address,
            [ctx.swapRouter.address],
            [],
            now,
            now + ONE_DAY,
            approvedContracts,
          ],
        }),
      });

      // Get sessionId
      const sessionNonce = await ctx.publicClient.readContract({
        address: delegatedAccount.address,
        abi: ctx.delegator.abi,
        functionName: "getSessionNonce",
        args: [],
      });
      const sessionId = keccak256(
        encodeAbiParameters(
          parseAbiParameters("address, address, uint256"),
          [delegatedAccount.address, ctx.sessionKeyAccount.address, (sessionNonce as bigint) - 1n]
        )
      );

      // ATTACK SCENARIO: Malicious session key tries to sign an EIP-3009
      // TransferWithAuthorization for WETH (which is NOT approved)
      // If successful, attacker could drain user's WETH balance
      const nonce = keccak256(toBytes("malicious-nonce"));
      const maliciousTransfer = {
        from: delegatedAccount.address,
        to: ctx.attacker.account.address, // Attacker as recipient
        value: parseEther("100"), // Drain all WETH
        validAfter: now,
        validBefore: now + ONE_DAY,
        nonce,
      };

      // Compute the EIP-3009 struct hash for this malicious WETH transfer
      const structHash = computeTransferAuthorizationStructHash(maliciousTransfer);

      // Use WETH's EIP-712 domain (not approved for this session)
      const wethDomainSeparator = computeDomainSeparator({
        name: "Wrapped Ether",
        version: "1",
        chainId: ctx.chainId,
        verifyingContract: weth.address as Address,
      });
      const hash = computeEIP712Hash(wethDomainSeparator, structHash);

      // Session key signs for WETH (attempting unauthorized transfer)
      const delegatorDomain = {
        name: "AgentDelegator",
        version: "1",
        chainId: ctx.chainId,
        verifyingContract: delegatedAccount.address,
      };

      const sessionSig = await ctx.sessionKeyAccount.signTypedData({
        domain: delegatorDomain,
        types: {
          SessionSignature: [
            { name: "verifyingContract", type: "address" },
            { name: "structHash", type: "bytes32" },
          ],
        },
        primaryType: "SessionSignature",
        message: {
          verifyingContract: weth.address as Address, // Trying to sign for unauthorized WETH
          structHash,
        },
      });

      // Build 149-byte signature attempting to authorize WETH transfer
      const signature149 = concat([
        sessionId,
        weth.address as Hex,
        structHash,
        sessionSig,
      ]);

      // Should be REJECTED because WETH is not in session's approvedContracts
      // This prevents the attack - session key can only sign for USDC
      const result = await ctx.publicClient.readContract({
        address: delegatedAccount.address,
        abi: ctx.delegator.abi,
        functionName: "isValidSignature",
        args: [hash, signature149],
      });

      assert.equal(result, "0xffffffff"); // Invalid - attack prevented!
    });

    it("should reject signature with wrong domain info (hash mismatch)", async function () {
      const now = await ctx.getBlockTimestamp();

      // Grant session with USDC approved
      const approvedContracts = [
        {
          contractAddress: ctx.usdc.address as Address,
          nameHash: keccak256(toBytes("USD Coin")),
          versionHash: keccak256(toBytes("1")),
        },
      ];

      // Call grantSession directly on the delegated account
      await ctx.delegatedWalletClient.sendTransaction({
        account: delegatedAccount,
        chain: ctx.publicClient.chain,
        to: delegatedAccount.address,
        data: encodeFunctionData({
          abi: ctx.delegator.abi,
          functionName: "grantSession",
          args: [
            ctx.sessionKeyAccount.address,
            [ctx.swapRouter.address],
            [],
            now,
            now + ONE_DAY,
            approvedContracts,
          ],
        }),
      });

      const sessionNonce = await ctx.publicClient.readContract({
        address: delegatedAccount.address,
        abi: ctx.delegator.abi,
        functionName: "getSessionNonce",
        args: [],
      });
      const sessionId = keccak256(
        encodeAbiParameters(
          parseAbiParameters("address, address, uint256"),
          [delegatedAccount.address, ctx.sessionKeyAccount.address, (sessionNonce as bigint) - 1n]
        )
      );

      // Create signature with correct verifyingContract but WRONG structHash
      const realStructHash = keccak256(toBytes("real-struct"));
      const fakeStructHash = keccak256(toBytes("fake-struct")); // Different!

      const domainSeparator = computeDomainSeparator({
        name: "USD Coin",
        version: "1",
        chainId: ctx.chainId,
        verifyingContract: ctx.usdc.address as Address,
      });

      // Hash is computed with REAL structHash
      const hash = computeEIP712Hash(domainSeparator, realStructHash);

      const delegatorDomain = {
        name: "AgentDelegator",
        version: "1",
        chainId: ctx.chainId,
        verifyingContract: delegatedAccount.address,
      };

      // Session key signs with FAKE structHash
      const sessionSig = await ctx.sessionKeyAccount.signTypedData({
        domain: delegatorDomain,
        types: {
          SessionSignature: [
            { name: "verifyingContract", type: "address" },
            { name: "structHash", type: "bytes32" },
          ],
        },
        primaryType: "SessionSignature",
        message: {
          verifyingContract: ctx.usdc.address as Address,
          structHash: fakeStructHash, // Using fake structHash
        },
      });

      // Build signature with FAKE structHash (preimage won't match)
      const signature149 = concat([
        sessionId,
        ctx.usdc.address as Hex,
        fakeStructHash,
        sessionSig,
      ]);

      // Should be rejected because hash != keccak256(0x1901 || domainSep || fakeStructHash)
      const result = await ctx.publicClient.readContract({
        address: delegatedAccount.address,
        abi: ctx.delegator.abi,
        functionName: "isValidSignature",
        args: [hash, signature149],
      });

      assert.equal(result, "0xffffffff"); // Invalid - preimage mismatch
    });
  });
});
