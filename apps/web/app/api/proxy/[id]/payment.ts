export function isValidPaymentHeader(value: string | null): value is `0x${string}` {
  return typeof value === 'string' && /^0x[0-9a-f]{64}$/i.test(value)
}
