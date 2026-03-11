import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { type Hex, keccak256, toBytes } from "viem";
import { setupTestContext, TestContext, ONE_DAY } from "../helpers/setup.js";

describe("AgentDelegator - Authorization", async function () {
  let ctx: TestContext;

  beforeEach(async function () {
    ctx = await setupTestContext();
  });

  it("should reject direct grantSession call from non-owner", async function () {
    const now = await ctx.getBlockTimestamp();

    // ApprovedContract struct: { contractAddress, nameHash, versionHash }
    const approvedContracts = [
      {
        contractAddress: ctx.usdc.address,
        nameHash: keccak256(toBytes("USD Coin")),
        versionHash: keccak256(toBytes("1")),
      },
    ];

    await assert.rejects(
      ctx.delegator.write.grantSession(
        [
          ctx.sessionKeyAccount.address,
          [ctx.swapRouter.address],
          [],
          now,
          now + ONE_DAY,
          approvedContracts,
        ],
        { account: ctx.attacker.account }
      ),
      /Only owner/
    );
  });

  it("should reject direct grantSession call from owner (not via execute)", async function () {
    const now = await ctx.getBlockTimestamp();

    const approvedContracts = [
      {
        contractAddress: ctx.usdc.address,
        nameHash: keccak256(toBytes("USD Coin")),
        versionHash: keccak256(toBytes("1")),
      },
    ];

    // Even the owner can't call grantSession directly - must be via execute
    // which makes msg.sender == address(this)
    await assert.rejects(
      ctx.delegator.write.grantSession(
        [
          ctx.sessionKeyAccount.address,
          [ctx.swapRouter.address],
          [],
          now,
          now + ONE_DAY,
          approvedContracts,
        ],
        { account: ctx.owner.account }
      ),
      /Only owner/
    );
  });

  it("should reject direct revokeSession call from non-owner", async function () {
    const fakeSessionId = keccak256(toBytes("fake-session"));

    await assert.rejects(
      ctx.delegator.write.revokeSession([fakeSessionId], {
        account: ctx.attacker.account,
      }),
      /Only owner/
    );
  });

  it("should reject execute call from unauthorized account", async function () {
    // ERC-7821 execute requires msg.sender == address(this) or entryPoint
    const mode =
      "0x0100000000000000000000000000000000000000000000000000000000000000" as Hex;
    const executionData = "0x" as Hex;

    await assert.rejects(
      ctx.delegator.write.execute([mode, executionData], {
        account: ctx.owner.account,
      }),
      /AccountUnauthorized/
    );
  });
});
