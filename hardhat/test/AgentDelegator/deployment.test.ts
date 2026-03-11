import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { keccak256, toBytes } from "viem";
import { setupTestContext, TestContext } from "../helpers/setup.js";

describe("AgentDelegator - Deployment", async function () {
  let ctx: TestContext;

  beforeEach(async function () {
    ctx = await setupTestContext();
  });

  it("should deploy successfully", async function () {
    assert.ok(ctx.delegator.address);
  });

  it("should have zero session nonce initially", async function () {
    const nonce = await ctx.delegator.read.getSessionNonce();
    assert.equal(nonce, 0n);
  });

  it("should return invalid for non-existent session", async function () {
    const fakeSessionId = keccak256(toBytes("fake-session"));
    const isValid = await ctx.delegator.read.isSessionValid([fakeSessionId]);
    assert.equal(isValid, false);
  });

  it("should return empty session for non-existent sessionId", async function () {
    const fakeSessionId = keccak256(toBytes("fake-session"));
    const session = await ctx.delegator.read.getSession([fakeSessionId]);
    assert.equal(
      session.sessionKey,
      "0x0000000000000000000000000000000000000000"
    );
    assert.equal(session.active, false);
  });
});
