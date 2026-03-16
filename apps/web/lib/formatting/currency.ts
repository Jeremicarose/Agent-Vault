/**
 * Centralized currency and number formatting utilities
 *
 * All functions expect amounts in smallest unit (6 decimals for USDC)
 * e.g., 1_000_000 = $1.00
 */

const DECIMALS = 6
const DIVISOR = 10 ** DECIMALS

/**
 * Format currency with appropriate precision based on amount size
 *
 * @param amountInSmallestUnit - Amount in smallest unit (1_000_000 = $1.00)
 * @returns Formatted currency string with $ prefix
 *
 * @example
 * formatCurrency(0)          // "$0.00"
 * formatCurrency(100)        // "$0.000100"
 * formatCurrency(10_000)     // "$0.0100"
 * formatCurrency(1_000_000)  // "$1.00"
 * formatCurrency(1_500_000_000) // "$1.50K"
 */
export function formatCurrency(amountInSmallestUnit: number): string {
  const amount = amountInSmallestUnit / DIVISOR

  if (amount === 0) return '$0.00'

  // Large numbers use K/M suffixes
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(2)}K`
  }

  // Precision based on amount size
  if (amount < 0.01) return `$${amount.toFixed(6)}`
  if (amount < 1) return `$${amount.toFixed(4)}`
  return `$${amount.toFixed(2)}`
}

/**
 * Format earnings with appropriate precision
 * Alias for formatCurrency - earnings use same formatting logic
 *
 * @param amountInSmallestUnit - Amount in smallest unit (1_000_000 = $1.00)
 * @returns Formatted currency string with $ prefix
 *
 * @example
 * formatEarnings(0)          // "$0.00"
 * formatEarnings(1_000_000)  // "$1.00"
 */
export function formatEarnings(amountInSmallestUnit: number): string {
  return formatCurrency(amountInSmallestUnit)
}

/**
 * Format price with appropriate precision
 * Uses same logic as formatCurrency
 *
 * @param amountInSmallestUnit - Price in smallest unit (1_000_000 = $1.00)
 * @param decimals - Optional fixed decimal places (overrides automatic precision)
 * @returns Formatted price string with $ prefix
 *
 * @example
 * formatPrice(1_000_000)     // "$1.00"
 * formatPrice(500)           // "$0.000500"
 * formatPrice(1_000_000, 4)  // "$1.0000"
 */
export function formatPrice(
  amountInSmallestUnit: number,
  decimals?: number
): string {
  const amount = amountInSmallestUnit / DIVISOR

  if (decimals !== undefined) {
    return `$${amount.toFixed(decimals)}`
  }

  return formatCurrency(amountInSmallestUnit)
}

/**
 * Format price for form display (no currency symbol, raw number)
 *
 * @param priceInSmallestUnit - Price in smallest unit
 * @returns Price as string without currency symbol
 *
 * @example
 * formatPriceForDisplay(1_000_000) // "1"
 * formatPriceForDisplay(500_000)   // "0.5"
 */
export function formatPriceForDisplay(priceInSmallestUnit: number): string {
  return (priceInSmallestUnit / DIVISOR).toString()
}

/**
 * Format success rate as percentage
 *
 * @param successful - Number of successful items
 * @param total - Total number of items
 * @returns Formatted percentage string
 *
 * @example
 * formatSuccessRate(95, 100)  // "95.0%"
 * formatSuccessRate(0, 0)     // "0%"
 * formatSuccessRate(1, 3)     // "33.3%"
 */
export function formatSuccessRate(successful: number, total: number): string {
  if (total === 0) return '0%'
  const rate = (successful / total) * 100
  return `${rate.toFixed(1)}%`
}

/**
 * Format a number with K/M/B suffixes for compact display
 *
 * @param value - The number to format
 * @param decimals - Decimal places (default: 1)
 * @returns Formatted string with suffix
 *
 * @example
 * formatCompact(1234)       // "1.2K"
 * formatCompact(1_500_000)  // "1.5M"
 * formatCompact(500)        // "500"
 */
export function formatCompact(value: number, decimals: number = 1): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(decimals)}B`
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(decimals)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(decimals)}K`
  }
  return value.toString()
}
