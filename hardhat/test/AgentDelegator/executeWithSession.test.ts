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
  pad,
  toHex,
} from "viem";
import { encodeCalls } from "viem/experimental/erc7821";
import { setupTestContext, TestContext, ONE_DAY, delegatedAccount } from "../helpers/setup.js";

// ERC-7579 execution modes
const SINGLE_MODE = "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;
const BATCH_MODE = "0x0100000000000000000000000000000000000000000000000000000000000000" as Hex;

// EIP-712 typehash for executeWithSession
const EXECUTE_WITH_SESSION_TYPEHASH = keccak256(
  toBytes("ExecuteWithSession(bytes32 sessionId,bytes32 mode,bytes executionData)")
);

// Helper to pack a single call for ERC-7579 single format
// Format: target (20) + value (32) + data
function packSingleCall(target: Address, value: bigint, data: Hex): Hex {
  return concat([
    target,                              // 20 bytes
    pad(toHex(value), { size: 32 }),     // 32 bytes
    data,                                 // variable
  ]);
}

describe("AgentDelegator - executeWithSession", async function () {
  let ctx: TestContext;

  beforeEach(async function () {
    ctx = await setupTestContext();
  });

  describe("Batch Execution (approve + swap)", async function () {
    it("should execute approve and swap in a single batch transaction", async function () {
      const now = await ctx.getBlockTimestamp();
      const swapAmount = parseEther("100");

      // Step 1: Grant a session with USDC and SwapRouter as allowed targets
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
            [ctx.usdc.address, ctx.swapRouter.address], // allowed targets
            [], // allowed selectors (empty = all)
            now,
            now + ONE_DAY,
            [], // approved contracts for EIP-1271 (not needed for execution)
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

      // Verify session was created
      const isValid = await ctx.publicClient.readContract({
        address: delegatedAccount.address,
        abi: ctx.delegator.abi,
        functionName: "isSessionValid",
        args: [sessionId],
      });
      assert.equal(isValid, true, "Session should be valid");

      // Step 2: Mint tokens to delegated account and swap router (for output)
      await ctx.usdc.write.mint([delegatedAccount.address, swapAmount]);
      await ctx.usdc.write.mint([ctx.swapRouter.address, swapAmount]); // For swap output

      // Verify initial balances
      const initialBalance = await ctx.usdc.read.balanceOf([delegatedAccount.address]);
      assert.equal(initialBalance, swapAmount, "Delegated account should have tokens");

      // Step 3: Build batch execution data
      // Call 1: USDC.approve(swapRouter, swapAmount)
      const approveData = encodeFunctionData({
        abi: ctx.usdc.abi,
        functionName: "approve",
        args: [ctx.swapRouter.address, swapAmount],
      });

      // Call 2: swapRouter.swapExactTokensForTokens(tokenIn, tokenOut, amountIn, minOut, recipient)
      const swapData = encodeFunctionData({
        abi: ctx.swapRouter.abi,
        functionName: "swapExactTokensForTokens",
        args: [
          ctx.usdc.address,           // tokenIn
          ctx.usdc.address,           // tokenOut (same token for simplicity in mock)
          swapAmount,                 // amountIn
          swapAmount,                 // minAmountOut (1:1 exchange rate)
          ctx.recipient.account.address, // recipient
        ],
      });

      // Encode batch calls using viem's ERC-7821 utility
      const executionData = encodeCalls([
        { to: ctx.usdc.address as Address, value: 0n, data: approveData },
        { to: ctx.swapRouter.address as Address, value: 0n, data: swapData },
      ]);

      // Step 4: Sign the executeWithSession request
      const delegatorDomain = {
        name: "AgentDelegator",
        version: "1",
        chainId: ctx.chainId,
        verifyingContract: delegatedAccount.address,
      };

      const structHash = keccak256(
        encodeAbiParameters(
          parseAbiParameters("bytes32, bytes32, bytes32, bytes32"),
          [
            EXECUTE_WITH_SESSION_TYPEHASH,
            sessionId,
            BATCH_MODE,
            keccak256(executionData),
          ]
        )
      );

      // Session key signs the EIP-712 typed data
      const sessionKeySignature = await ctx.sessionKeyAccount.signTypedData({
        domain: delegatorDomain,
        types: {
          ExecuteWithSession: [
            { name: "sessionId", type: "bytes32" },
            { name: "mode", type: "bytes32" },
            { name: "executionData", type: "bytes" },
          ],
        },
        primaryType: "ExecuteWithSession",
        message: {
          sessionId,
          mode: BATCH_MODE,
          executionData,
        },
      });

      // Step 5: Execute via executeWithSession
      // Anyone can call this (relayer pattern) - we use owner as the relayer
      await ctx.owner.sendTransaction({
        to: delegatedAccount.address,
        data: encodeFunctionData({
          abi: ctx.delegator.abi,
          functionName: "executeWithSession",
          args: [sessionId, BATCH_MODE, executionData, sessionKeySignature],
        }),
      });

      // Step 6: Verify the swap happened
      const recipientBalance = await ctx.usdc.read.balanceOf([ctx.recipient.account.address]);
      assert.equal(recipientBalance, swapAmount, "Recipient should have received swapped tokens");

      const delegatedBalance = await ctx.usdc.read.balanceOf([delegatedAccount.address]);
      assert.equal(delegatedBalance, 0n, "Delegated account should have no tokens left");
    });

    it("should reject batch with unauthorized target", async function () {
      const now = await ctx.getBlockTimestamp();

      // Grant session with ONLY USDC as allowed target (not swapRouter)
      await ctx.delegatedWalletClient.sendTransaction({
        account: delegatedAccount,
        chain: ctx.publicClient.chain,
        to: delegatedAccount.address,
        data: encodeFunctionData({
          abi: ctx.delegator.abi,
          functionName: "grantSession",
          args: [
            ctx.sessionKeyAccount.address,
            [ctx.usdc.address], // Only USDC allowed, NOT swapRouter
            [],
            now,
            now + ONE_DAY,
            [],
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

      // Build batch with unauthorized target (swapRouter)
      const approveData = encodeFunctionData({
        abi: ctx.usdc.abi,
        functionName: "approve",
        args: [ctx.swapRouter.address, parseEther("100")],
      });

      const swapData = encodeFunctionData({
        abi: ctx.swapRouter.abi,
        functionName: "swapExactTokensForTokens",
        args: [
          ctx.usdc.address,
          ctx.usdc.address,
          parseEther("100"),
          parseEther("100"),
          ctx.recipient.account.address,
        ],
      });

      const executionData = encodeCalls([
        { to: ctx.usdc.address as Address, value: 0n, data: approveData },
        { to: ctx.swapRouter.address as Address, value: 0n, data: swapData }, // NOT ALLOWED
      ]);

      // Sign the request
      const delegatorDomain = {
        name: "AgentDelegator",
        version: "1",
        chainId: ctx.chainId,
        verifyingContract: delegatedAccount.address,
      };

      const sessionKeySignature = await ctx.sessionKeyAccount.signTypedData({
        domain: delegatorDomain,
        types: {
          ExecuteWithSession: [
            { name: "sessionId", type: "bytes32" },
            { name: "mode", type: "bytes32" },
            { name: "executionData", type: "bytes" },
          ],
        },
        primaryType: "ExecuteWithSession",
        message: {
          sessionId,
          mode: BATCH_MODE,
          executionData,
        },
      });

      // Should reject because swapRouter is not an allowed target
      // Error selector: TargetNotAllowed(address) = 0xe356c1d3
      await assert.rejects(
        ctx.owner.sendTransaction({
          to: delegatedAccount.address,
          data: encodeFunctionData({
            abi: ctx.delegator.abi,
            functionName: "executeWithSession",
            args: [sessionId, BATCH_MODE, executionData, sessionKeySignature],
          }),
        }),
        /0xe356c1d3/
      );
    });

    it("should reject with invalid session key signature", async function () {
      const now = await ctx.getBlockTimestamp();

      // Grant session
      await ctx.delegatedWalletClient.sendTransaction({
        account: delegatedAccount,
        chain: ctx.publicClient.chain,
        to: delegatedAccount.address,
        data: encodeFunctionData({
          abi: ctx.delegator.abi,
          functionName: "grantSession",
          args: [
            ctx.sessionKeyAccount.address,
            [ctx.usdc.address],
            [],
            now,
            now + ONE_DAY,
            [],
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

      // Build execution data
      const approveData = encodeFunctionData({
        abi: ctx.usdc.abi,
        functionName: "approve",
        args: [ctx.swapRouter.address, parseEther("100")],
      });
      const executionData = packSingleCall(ctx.usdc.address as Address, 0n, approveData);

      // Sign with WRONG key (attacker)
      const delegatorDomain = {
        name: "AgentDelegator",
        version: "1",
        chainId: ctx.chainId,
        verifyingContract: delegatedAccount.address,
      };

      const wrongSignature = await ctx.attacker.signTypedData({
        domain: delegatorDomain,
        types: {
          ExecuteWithSession: [
            { name: "sessionId", type: "bytes32" },
            { name: "mode", type: "bytes32" },
            { name: "executionData", type: "bytes" },
          ],
        },
        primaryType: "ExecuteWithSession",
        message: {
          sessionId,
          mode: SINGLE_MODE,
          executionData,
        },
      });

      // Should reject because signature is from wrong key
      // Error selector: InvalidSessionKey() = 0xbf10e9ba
      await assert.rejects(
        ctx.owner.sendTransaction({
          to: delegatedAccount.address,
          data: encodeFunctionData({
            abi: ctx.delegator.abi,
            functionName: "executeWithSession",
            args: [sessionId, SINGLE_MODE, executionData, wrongSignature],
          }),
        }),
        /0xbf10e9ba/
      );
    });
  });

  describe("Session Privilege Escalation Prevention", async function () {
    it("should reject session key attempting to grant a new elevated session", async function () {
      const now = await ctx.getBlockTimestamp();

      // Grant a limited session - only allowed to call USDC, NOT the delegator itself
      await ctx.delegatedWalletClient.sendTransaction({
        account: delegatedAccount,
        chain: ctx.publicClient.chain,
        to: delegatedAccount.address,
        data: encodeFunctionData({
          abi: ctx.delegator.abi,
          functionName: "grantSession",
          args: [
            ctx.sessionKeyAccount.address,
            [ctx.usdc.address], // Only USDC allowed - NOT the delegator
            [],
            now,
            now + ONE_DAY,
            [],
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

      // Attacker's new session key that would get elevated privileges
      const newSessionKey = ctx.attacker.account.address;

      // Build execution data to call grantSession on the delegator itself
      // This would grant a new session with ALL contracts allowed (no restrictions)
      const grantSessionData = encodeFunctionData({
        abi: ctx.delegator.abi,
        functionName: "grantSession",
        args: [
          newSessionKey,
          [], // Empty = trying to get unrestricted access (though contract uses explicit list)
          [],
          now,
          now + ONE_DAY * 30n, // Much longer validity
          [],
        ],
      });

      // Try to execute grantSession via the limited session
      const executionData = packSingleCall(delegatedAccount.address, 0n, grantSessionData);

      // Sign the request with the session key
      const delegatorDomain = {
        name: "AgentDelegator",
        version: "1",
        chainId: ctx.chainId,
        verifyingContract: delegatedAccount.address,
      };

      const sessionKeySignature = await ctx.sessionKeyAccount.signTypedData({
        domain: delegatorDomain,
        types: {
          ExecuteWithSession: [
            { name: "sessionId", type: "bytes32" },
            { name: "mode", type: "bytes32" },
            { name: "executionData", type: "bytes" },
          ],
        },
        primaryType: "ExecuteWithSession",
        message: {
          sessionId,
          mode: SINGLE_MODE,
          executionData,
        },
      });

      // Should reject because the delegator address is not in allowedTargets
      // Error selector: TargetNotAllowed(address) = 0xe356c1d3
      await assert.rejects(
        ctx.owner.sendTransaction({
          to: delegatedAccount.address,
          data: encodeFunctionData({
            abi: ctx.delegator.abi,
            functionName: "executeWithSession",
            args: [sessionId, SINGLE_MODE, executionData, sessionKeySignature],
          }),
        }),
        /0xe356c1d3/
      );

      // Verify no new session was created (nonce unchanged)
      const finalNonce = await ctx.publicClient.readContract({
        address: delegatedAccount.address,
        abi: ctx.delegator.abi,
        functionName: "getSessionNonce",
        args: [],
      });
      assert.equal(finalNonce, sessionNonce, "Session nonce should not have changed");
    });

    it("should reject session key attempting to revoke restrictions on itself", async function () {
      const now = await ctx.getBlockTimestamp();

      // Grant a limited session
      await ctx.delegatedWalletClient.sendTransaction({
        account: delegatedAccount,
        chain: ctx.publicClient.chain,
        to: delegatedAccount.address,
        data: encodeFunctionData({
          abi: ctx.delegator.abi,
          functionName: "grantSession",
          args: [
            ctx.sessionKeyAccount.address,
            [ctx.usdc.address],
            [],
            now,
            now + ONE_DAY,
            [],
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

      // Try to call addApprovedContracts to add more contracts to its own session
      const addContractsData = encodeFunctionData({
        abi: ctx.delegator.abi,
        functionName: "addApprovedContracts",
        args: [
          sessionId,
          [
            {
              contractAddress: ctx.swapRouter.address,
              nameHash: keccak256(toBytes("SwapRouter")),
              versionHash: keccak256(toBytes("1")),
            },
          ],
        ],
      });

      const executionData = packSingleCall(delegatedAccount.address, 0n, addContractsData);

      const delegatorDomain = {
        name: "AgentDelegator",
        version: "1",
        chainId: ctx.chainId,
        verifyingContract: delegatedAccount.address,
      };

      const sessionKeySignature = await ctx.sessionKeyAccount.signTypedData({
        domain: delegatorDomain,
        types: {
          ExecuteWithSession: [
            { name: "sessionId", type: "bytes32" },
            { name: "mode", type: "bytes32" },
            { name: "executionData", type: "bytes" },
          ],
        },
        primaryType: "ExecuteWithSession",
        message: {
          sessionId,
          mode: SINGLE_MODE,
          executionData,
        },
      });

      // Should reject because delegator is not in allowedTargets
      await assert.rejects(
        ctx.owner.sendTransaction({
          to: delegatedAccount.address,
          data: encodeFunctionData({
            abi: ctx.delegator.abi,
            functionName: "executeWithSession",
            args: [sessionId, SINGLE_MODE, executionData, sessionKeySignature],
          }),
        }),
        /0xe356c1d3/
      );

      // Verify swapRouter was not added as approved
      const isApproved = await ctx.publicClient.readContract({
        address: delegatedAccount.address,
        abi: ctx.delegator.abi,
        functionName: "isContractApproved",
        args: [sessionId, ctx.swapRouter.address],
      });
      assert.equal(isApproved, false, "SwapRouter should NOT be approved");
    });
  });

  describe("Single Execution", async function () {
    it("should execute a single approve call", async function () {
      const now = await ctx.getBlockTimestamp();
      const approveAmount = parseEther("500");

      // Grant session
      await ctx.delegatedWalletClient.sendTransaction({
        account: delegatedAccount,
        chain: ctx.publicClient.chain,
        to: delegatedAccount.address,
        data: encodeFunctionData({
          abi: ctx.delegator.abi,
          functionName: "grantSession",
          args: [
            ctx.sessionKeyAccount.address,
            [ctx.usdc.address],
            [],
            now,
            now + ONE_DAY,
            [],
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

      // Build single execution data
      const approveData = encodeFunctionData({
        abi: ctx.usdc.abi,
        functionName: "approve",
        args: [ctx.swapRouter.address, approveAmount],
      });
      const executionData = packSingleCall(ctx.usdc.address as Address, 0n, approveData);

      // Sign
      const delegatorDomain = {
        name: "AgentDelegator",
        version: "1",
        chainId: ctx.chainId,
        verifyingContract: delegatedAccount.address,
      };

      const sessionKeySignature = await ctx.sessionKeyAccount.signTypedData({
        domain: delegatorDomain,
        types: {
          ExecuteWithSession: [
            { name: "sessionId", type: "bytes32" },
            { name: "mode", type: "bytes32" },
            { name: "executionData", type: "bytes" },
          ],
        },
        primaryType: "ExecuteWithSession",
        message: {
          sessionId,
          mode: SINGLE_MODE,
          executionData,
        },
      });

      // Execute
      await ctx.owner.sendTransaction({
        to: delegatedAccount.address,
        data: encodeFunctionData({
          abi: ctx.delegator.abi,
          functionName: "executeWithSession",
          args: [sessionId, SINGLE_MODE, executionData, sessionKeySignature],
        }),
      });

      // Verify approval was set
      const allowance = await ctx.usdc.read.allowance([
        delegatedAccount.address,
        ctx.swapRouter.address,
      ]);
      assert.equal(allowance, approveAmount, "Allowance should be set");
    });
  });
});
