import dns from 'node:dns/promises'
import net from 'node:net'

export type OutboundGuardResult = {
  ok: true
} | {
  ok: false
  error: string
}

function isHttpsRequired(): boolean {
  return process.env.NODE_ENV === 'production'
}

function parseCsvEnv(key: string): string[] {
  return (process.env[key] || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

function ipToLong(ip: string): number | null {
  const parts = ip.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return null
  }
  return (
    ((parts[0] << 24) >>> 0) +
    ((parts[1] << 16) >>> 0) +
    ((parts[2] << 8) >>> 0) +
    (parts[3] >>> 0)
  )
}

function isPrivateOrUnsafeIpv4(ip: string): boolean {
  const value = ipToLong(ip)
  if (value === null) return true

  const ranges: Array<[number, number]> = [
    [ipToLong('0.0.0.0')!, ipToLong('0.255.255.255')!],
    [ipToLong('10.0.0.0')!, ipToLong('10.255.255.255')!],
    [ipToLong('127.0.0.0')!, ipToLong('127.255.255.255')!],
    [ipToLong('169.254.0.0')!, ipToLong('169.254.255.255')!],
    [ipToLong('172.16.0.0')!, ipToLong('172.31.255.255')!],
    [ipToLong('192.168.0.0')!, ipToLong('192.168.255.255')!],
  ]

  return ranges.some(([start, end]) => value >= start && value <= end)
}

function isUnsafeIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase()
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:')
  )
}

function isUnsafeHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  return [
    'localhost',
    '0.0.0.0',
    '127.0.0.1',
    '::1',
    '[::1]',
    'metadata.google.internal',
    'metadata.google.com',
    '169.254.169.254',
  ].includes(normalized)
}

export async function validateOutboundUrl(url: string): Promise<OutboundGuardResult> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, error: 'Invalid outbound URL' }
  }

  if (isHttpsRequired() && parsed.protocol !== 'https:') {
    return { ok: false, error: 'HTTPS is required for outbound requests in production' }
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, error: 'Only HTTP(S) outbound requests are allowed' }
  }

  const hostname = parsed.hostname.toLowerCase()
  if (isUnsafeHostname(hostname)) {
    return { ok: false, error: 'Outbound target is not allowed' }
  }

  const allowedHosts = parseCsvEnv('PROXY_OUTBOUND_ALLOWLIST')
  if (allowedHosts.length > 0 && !allowedHosts.includes(hostname)) {
    return { ok: false, error: 'Outbound host is not on the allowlist' }
  }

  const blockedHosts = parseCsvEnv('PROXY_OUTBOUND_BLOCKLIST')
  if (blockedHosts.includes(hostname)) {
    return { ok: false, error: 'Outbound host is blocked' }
  }

  if (net.isIP(hostname)) {
    if (net.isIPv4(hostname) && isPrivateOrUnsafeIpv4(hostname)) {
      return { ok: false, error: 'Outbound IP is private or otherwise unsafe' }
    }
    if (net.isIPv6(hostname) && isUnsafeIpv6(hostname)) {
      return { ok: false, error: 'Outbound IPv6 address is private or otherwise unsafe' }
    }
    return { ok: true }
  }

  try {
    const records = await dns.lookup(hostname, { all: true })
    if (records.length === 0) {
      return { ok: false, error: 'Outbound host could not be resolved' }
    }

    for (const record of records) {
      if (record.family === 4 && isPrivateOrUnsafeIpv4(record.address)) {
        return { ok: false, error: 'Outbound host resolves to a private or unsafe IPv4 address' }
      }
      if (record.family === 6 && isUnsafeIpv6(record.address)) {
        return { ok: false, error: 'Outbound host resolves to a private or unsafe IPv6 address' }
      }
    }
  } catch {
    return { ok: false, error: 'Outbound host could not be resolved' }
  }

  return { ok: true }
}
