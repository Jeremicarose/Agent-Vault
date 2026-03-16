// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @dev Mock swap router for testing session key executions
 */
contract MockSwapRouter {
    event SwapExecuted(
        address indexed caller,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    // Simple 1:1 swap for testing (in reality would have price logic)
    uint256 public exchangeRate = 1e18; // 1:1 by default

    function setExchangeRate(uint256 rate) external {
        exchangeRate = rate;
    }

    /**
     * @notice Swap exact tokens for tokens
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount of input tokens
     * @param minAmountOut Minimum amount of output tokens
     * @param recipient Recipient of output tokens
     */
    function swapExactTokensForTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external returns (uint256 amountOut) {
        // Transfer tokens in from caller
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        // Calculate output amount
        amountOut = (amountIn * exchangeRate) / 1e18;
        require(amountOut >= minAmountOut, "Insufficient output");

        // Transfer tokens out to recipient
        IERC20(tokenOut).transfer(recipient, amountOut);

        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    /**
     * @notice Swap exact native tokens for tokens
     * @param tokenOut Output token address
     * @param minAmountOut Minimum amount of output tokens
     * @param recipient Recipient of output tokens
     */
    function swapExactETHForTokens(
        address tokenOut,
        uint256 minAmountOut,
        address recipient
    ) external payable returns (uint256 amountOut) {
        // Calculate output amount
        amountOut = (msg.value * exchangeRate) / 1e18;
        require(amountOut >= minAmountOut, "Insufficient output");

        // Transfer tokens out to recipient
        IERC20(tokenOut).transfer(recipient, amountOut);

        emit SwapExecuted(msg.sender, address(0), tokenOut, msg.value, amountOut);
    }

    // Function selector constants for testing
    function SWAP_EXACT_TOKENS_SELECTOR() external pure returns (bytes4) {
        return this.swapExactTokensForTokens.selector;
    }

    function SWAP_EXACT_ETH_SELECTOR() external pure returns (bytes4) {
        return this.swapExactETHForTokens.selector;
    }

    receive() external payable {}
}
