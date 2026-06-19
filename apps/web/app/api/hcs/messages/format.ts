export interface MirrorNodeMessage {
  consensus_timestamp: string
  sequence_number: number
  message: string
  topic_id: string
}

export interface DecodedAuditMessage {
  v: number
  ts: string
  action: string
  agent?: string
  owner?: string
  sessionId?: string
  name?: string
  txHashes?: string[]
  chainId?: number
  meta?: Record<string, unknown>
}

export interface HcsApiMessage {
  sequenceNumber: number
  timestamp: string
  topicId: string
  decoded: DecodedAuditMessage | null
  raw: string
  hashScanUrl: string
}

export interface HcsMessageFilters {
  action?: string
  search?: string
  owner?: string
  agent?: string
  sessionId?: string
}

export function decodeMirrorNodeMessage(
  msg: MirrorNodeMessage,
  network: string,
  topicId: string
): HcsApiMessage {
  let decoded: DecodedAuditMessage | null = null
  let raw = ''

  try {
    raw = Buffer.from(msg.message, 'base64').toString('utf8')
    decoded = JSON.parse(raw) as DecodedAuditMessage
  } catch {
    decoded = null
  }

  return {
    sequenceNumber: msg.sequence_number,
    timestamp: msg.consensus_timestamp,
    topicId: msg.topic_id,
    decoded,
    raw,
    hashScanUrl: `https://hashscan.io/${network}/topic/${topicId}/message/${msg.sequence_number}`,
  }
}

export function filterHcsMessages(
  messages: HcsApiMessage[],
  filters: HcsMessageFilters
): HcsApiMessage[] {
  const search = filters.search?.trim().toLowerCase()

  return messages.filter((msg) => {
    const decoded = msg.decoded

    if (filters.action && decoded?.action !== filters.action) {
      return false
    }

    if (filters.owner && decoded?.owner?.toLowerCase() !== filters.owner.toLowerCase()) {
      return false
    }

    if (filters.agent && decoded?.agent?.toLowerCase() !== filters.agent.toLowerCase()) {
      return false
    }

    if (filters.sessionId && decoded?.sessionId !== filters.sessionId) {
      return false
    }

    if (!search) {
      return true
    }

    const haystack = [
      msg.raw,
      decoded?.action,
      decoded?.owner,
      decoded?.agent,
      decoded?.sessionId,
      decoded?.name,
      ...(decoded?.txHashes ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(search)
  })
}

function escapeCsv(value: string): string {
  const needsQuotes = /[",\n]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}

export function toHcsCsv(messages: HcsApiMessage[]): string {
  const header = [
    'sequenceNumber',
    'timestamp',
    'action',
    'owner',
    'agent',
    'sessionId',
    'name',
    'txHashes',
    'chainId',
    'hashScanUrl',
  ]

  const rows = messages.map((msg) => {
    const decoded = msg.decoded
    return [
      String(msg.sequenceNumber),
      msg.timestamp,
      decoded?.action ?? '',
      decoded?.owner ?? '',
      decoded?.agent ?? '',
      decoded?.sessionId ?? '',
      decoded?.name ?? '',
      (decoded?.txHashes ?? []).join('|'),
      decoded?.chainId ? String(decoded.chainId) : '',
      msg.hashScanUrl,
    ].map(escapeCsv).join(',')
  })

  return [header.join(','), ...rows].join('\n')
}
