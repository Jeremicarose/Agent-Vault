import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  decodeMirrorNodeMessage,
  filterHcsMessages,
  toHcsCsv,
  type MirrorNodeMessage,
} from './format'

describe('HCS message formatting', () => {
  const mirrorMessage: MirrorNodeMessage = {
    consensus_timestamp: '2026-06-18T12:00:00.000Z',
    sequence_number: 42,
    topic_id: '0.0.12345',
    message: Buffer.from(JSON.stringify({
      v: 1,
      ts: '2026-06-18T12:00:00.000Z',
      action: 'payment_sent',
      owner: '0x1111111111111111111111111111111111111111',
      agent: '0x2222222222222222222222222222222222222222',
      sessionId: '0x' + 'a'.repeat(64),
      name: 'USDC Payment',
      txHashes: ['0x' + 'b'.repeat(64)],
      chainId: 296,
    })).toString('base64'),
  }

  it('decodes a mirror node message into audit message shape', () => {
    const result = decodeMirrorNodeMessage(mirrorMessage, 'testnet', '0.0.12345')
    assert.equal(result.sequenceNumber, 42)
    assert.equal(result.decoded?.action, 'payment_sent')
  })

  it('filters messages by action and search term', () => {
    const messages = [decodeMirrorNodeMessage(mirrorMessage, 'testnet', '0.0.12345')]
    const filtered = filterHcsMessages(messages, {
      action: 'payment_sent',
      search: 'usdc',
    })

    assert.equal(filtered.length, 1)
  })

  it('exports messages to CSV', () => {
    const messages = [decodeMirrorNodeMessage(mirrorMessage, 'testnet', '0.0.12345')]
    const csv = toHcsCsv(messages)

    assert.match(csv, /sequenceNumber,timestamp,action/)
    assert.match(csv, /payment_sent/)
    assert.match(csv, /USDC Payment/)
  })
})
