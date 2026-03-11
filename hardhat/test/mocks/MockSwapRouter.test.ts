import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { parseEther } from "viem";
import { setupTestContext, TestContext } from "../helpers/setup.js";

describe("MockSwapRouter", async function () {
  let ctx: TestContext;

  beforeEach(async function () {
    ctx = await setupTestContext();
  });

  it("should deploy successfully", async function () {
    assert.ok(ctx.swapRouter.address);
  });

  it("should return correct function selectors", async function () {
    const swapSelector = await ctx.swapRouter.read.SWAP_EXACT_TOKENS_SELECTOR();
    const ethSwapSelector = await ctx.swapRouter.read.SWAP_EXACT_ETH_SELECTOR();

    // Verify they are valid 4-byte selectors
    assert.equal(swapSelector.length, 10); // 0x + 8 hex chars
    assert.equal(ethSwapSelector.length, 10);
  });

  it("should have default 1:1 exchange rate", async function () {
    const rate = await ctx.swapRouter.read.exchangeRate();
    assert.equal(rate, parseEther("1"));
  });

  it("should allow setting exchange rate", async function () {
    const newRate = parseEther("2");
    await ctx.swapRouter.write.setExchangeRate([newRate]);

    const rate = await ctx.swapRouter.read.exchangeRate();
    assert.equal(rate, newRate);
  });
});
