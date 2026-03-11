import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { keccak256, toBytes } from "viem";
import { setupTestContext, TestContext } from "../helpers/setup.js";

describe("AgentDelegator - Approved Contracts View Functions", async function () {
  let ctx: TestContext;

  beforeEach(async function () {
    ctx = await setupTestContext();
  });

  it("should return false for non-existent session contract approval check", async function () {
    const fakeSessionId = keccak256(toBytes("fake-session"));
    const isApproved = await ctx.delegator.read.isContractApproved([
      fakeSessionId,
      ctx.usdc.address,
    ]);
    assert.equal(isApproved, false);
  });

  it("should return zero domain hashes for non-existent session contract", async function () {
    const fakeSessionId = keccak256(toBytes("fake-session"));
    const [nameHash, versionHash] = await ctx.delegator.read.getContractDomain([
      fakeSessionId,
      ctx.usdc.address,
    ]);
    assert.equal(
      nameHash,
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    assert.equal(
      versionHash,
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
  });

  it("should reject direct addApprovedContracts call from non-owner", async function () {
    const fakeSessionId = keccak256(toBytes("fake-session"));

    // ApprovedContract struct: { contractAddress, nameHash, versionHash }
    const approvedContracts = [
      {
        contractAddress: ctx.usdc.address,
        nameHash: keccak256(toBytes("USD Coin")),
        versionHash: keccak256(toBytes("1")),
      },
    ];

    await assert.rejects(
      ctx.delegator.write.addApprovedContracts(
        [fakeSessionId, approvedContracts],
        { account: ctx.attacker.account }
      ),
      /Only owner/
    );
  });
});
