import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { type Address, keccak256, toBytes, parseEther } from "viem";
import { setupTestContext, TestContext, ONE_HOUR } from "../helpers/setup.js";

describe("MockERC20WithEIP3009", async function () {
  let ctx: TestContext;

  beforeEach(async function () {
    ctx = await setupTestContext();
  });

  it("should deploy with correct name and symbol", async function () {
    const name = await ctx.usdc.read.name();
    const symbol = await ctx.usdc.read.symbol();
    assert.equal(name, "USD Coin");
    assert.equal(symbol, "USDC");
  });

  it("should allow minting tokens", async function () {
    const amount = parseEther("1000");
    await ctx.usdc.write.mint([ctx.owner.account.address, amount]);

    const balance = await ctx.usdc.read.balanceOf([ctx.owner.account.address]);
    assert.equal(balance, amount);
  });

  it("should have correct DOMAIN_SEPARATOR", async function () {
    const domainSeparator = await ctx.usdc.read.DOMAIN_SEPARATOR();
    assert.ok(domainSeparator);
    assert.equal(domainSeparator.length, 66); // 0x + 64 hex chars
  });

  it("should compute transfer authorization hash correctly", async function () {
    const now = await ctx.getBlockTimestamp();
    const hash = await ctx.usdc.read.getTransferAuthorizationHash([
      ctx.owner.account.address,
      ctx.recipient.account.address,
      parseEther("100"),
      now,
      now + ONE_HOUR,
      keccak256(toBytes("nonce-1")),
    ]);

    assert.ok(hash);
    assert.equal(hash.length, 66);
  });

  it("should execute transferWithAuthorization with valid EOA signature", async function () {
    const amount = parseEther("100");
    const now = await ctx.getBlockTimestamp();
    const nonce = keccak256(toBytes("unique-nonce"));

    // Mint tokens to owner
    await ctx.usdc.write.mint([ctx.owner.account.address, amount]);

    // Get chain ID for EIP-712 domain
    const publicClient = await ctx.viem.getPublicClient();
    const chainId = await publicClient.getChainId();

    // EIP-712 domain for USDC
    const domain = {
      name: "USD Coin",
      version: "1",
      chainId: chainId,
      verifyingContract: ctx.usdc.address as Address,
    };

    // EIP-3009 type
    const types = {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    };

    const message = {
      from: ctx.owner.account.address,
      to: ctx.recipient.account.address,
      value: amount,
      validAfter: now,
      validBefore: now + ONE_HOUR,
      nonce: nonce,
    };

    // Owner signs EIP-712 typed data
    const signature = await ctx.owner.signTypedData({
      domain,
      types,
      primaryType: "TransferWithAuthorization",
      message,
    });

    // Execute transfer
    await ctx.usdc.write.transferWithAuthorization(
      [
        ctx.owner.account.address,
        ctx.recipient.account.address,
        amount,
        now,
        now + ONE_HOUR,
        nonce,
        signature,
      ],
      { account: ctx.attacker.account } // Anyone can submit
    );

    // Verify transfer
    const recipientBalance = await ctx.usdc.read.balanceOf([
      ctx.recipient.account.address,
    ]);
    assert.equal(recipientBalance, amount);
  });

  it("should reject transferWithAuthorization with wrong signature", async function () {
    const amount = parseEther("100");
    const now = await ctx.getBlockTimestamp();
    const nonce = keccak256(toBytes("unique-nonce-2"));

    await ctx.usdc.write.mint([ctx.owner.account.address, amount]);

    const publicClient = await ctx.viem.getPublicClient();
    const chainId = await publicClient.getChainId();

    const domain = {
      name: "USD Coin",
      version: "1",
      chainId: chainId,
      verifyingContract: ctx.usdc.address as Address,
    };

    const types = {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    };

    const message = {
      from: ctx.owner.account.address,
      to: ctx.recipient.account.address,
      value: amount,
      validAfter: now,
      validBefore: now + ONE_HOUR,
      nonce: nonce,
    };

    // Attacker signs (wrong signer)
    const wrongSignature = await ctx.attacker.signTypedData({
      domain,
      types,
      primaryType: "TransferWithAuthorization",
      message,
    });

    await assert.rejects(
      ctx.usdc.write.transferWithAuthorization(
        [
          ctx.owner.account.address,
          ctx.recipient.account.address,
          amount,
          now,
          now + ONE_HOUR,
          nonce,
          wrongSignature,
        ],
        { account: ctx.attacker.account }
      ),
      /InvalidSignature/
    );
  });

  it("should reject expired authorization", async function () {
    const amount = parseEther("100");
    const now = await ctx.getBlockTimestamp();
    const nonce = keccak256(toBytes("unique-nonce-3"));

    await ctx.usdc.write.mint([ctx.owner.account.address, amount]);

    const publicClient = await ctx.viem.getPublicClient();
    const chainId = await publicClient.getChainId();

    const domain = {
      name: "USD Coin",
      version: "1",
      chainId: chainId,
      verifyingContract: ctx.usdc.address as Address,
    };

    const types = {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    };

    // Create authorization that expired in the past
    const message = {
      from: ctx.owner.account.address,
      to: ctx.recipient.account.address,
      value: amount,
      validAfter: 0n,
      validBefore: now - 1n,
      nonce: nonce,
    };

    const signature = await ctx.owner.signTypedData({
      domain,
      types,
      primaryType: "TransferWithAuthorization",
      message,
    });

    await assert.rejects(
      ctx.usdc.write.transferWithAuthorization(
        [
          ctx.owner.account.address,
          ctx.recipient.account.address,
          amount,
          0n,
          now - 1n,
          nonce,
          signature,
        ],
        { account: ctx.attacker.account }
      ),
      /AuthorizationExpired/
    );
  });

  it("should reject reused nonce", async function () {
    const amount = parseEther("50");
    const now = await ctx.getBlockTimestamp();
    const nonce = keccak256(toBytes("reused-nonce"));

    await ctx.usdc.write.mint([ctx.owner.account.address, parseEther("200")]);

    const publicClient = await ctx.viem.getPublicClient();
    const chainId = await publicClient.getChainId();

    const domain = {
      name: "USD Coin",
      version: "1",
      chainId: chainId,
      verifyingContract: ctx.usdc.address as Address,
    };

    const types = {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    };

    const message = {
      from: ctx.owner.account.address,
      to: ctx.recipient.account.address,
      value: amount,
      validAfter: now,
      validBefore: now + ONE_HOUR,
      nonce: nonce,
    };

    const signature = await ctx.owner.signTypedData({
      domain,
      types,
      primaryType: "TransferWithAuthorization",
      message,
    });

    // First transfer succeeds
    await ctx.usdc.write.transferWithAuthorization([
      ctx.owner.account.address,
      ctx.recipient.account.address,
      amount,
      now,
      now + ONE_HOUR,
      nonce,
      signature,
    ]);

    // Second transfer with same nonce fails
    await assert.rejects(
      ctx.usdc.write.transferWithAuthorization([
        ctx.owner.account.address,
        ctx.recipient.account.address,
        amount,
        now,
        now + ONE_HOUR,
        nonce,
        signature,
      ]),
      /AuthorizationAlreadyUsed/
    );
  });
});
