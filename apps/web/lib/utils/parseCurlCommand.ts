import type { HttpMethod } from '@/features/proxy/model/variables'

/**
 * Parsed result from a curl command
 */
export interface ParsedCurlCommand {
  url?: string
  method?: HttpMethod
  headers?: { key: string; value: string }[]
  body?: string
  contentType?: string
}

/**
 * Parse a curl command and extract relevant fields
 * Handles multiline curl commands (line continuations with \)
 */
export function parseCurlCommand(curlString: string): ParsedCurlCommand {
  const result: ParsedCurlCommand = {
    headers: [],
  }

  // Normalize the curl string (handle line continuations)
  const normalized = curlString
    .replace(/\\\n/g, ' ')
    .replace(/\\\r\n/g, ' ')
    .trim()

  // Extract URL - look for quoted URL or https:// URL (not starting with -)
  // Try double-quoted URL first
  let urlMatch = normalized.match(/['"]((https?:\/\/)[^'"]+)['"]/i)
  if (!urlMatch) {
    // Try unquoted URL starting with http
    urlMatch = normalized.match(/\s(https?:\/\/[^\s'"]+)/i)
  }
  if (urlMatch) {
    result.url = urlMatch[1]
  }

  // Extract method (-X or --request)
  const methodMatch = normalized.match(/(?:-X|--request)\s+['"]?(\w+)['"]?/i)
  if (methodMatch) {
    result.method = methodMatch[1].toUpperCase() as HttpMethod
  }

  // Extract headers (-H or --header)
  const headerRegex = /(?:-H|--header)\s+['"]([^'"]+)['"]/gi
  let headerMatch
  while ((headerMatch = headerRegex.exec(normalized)) !== null) {
    const [key, ...valueParts] = headerMatch[1].split(':')
    const value = valueParts.join(':').trim()
    if (key && value) {
      // Skip content-type header, we'll handle it separately
      if (key.toLowerCase() === 'content-type') {
        result.contentType = value
      } else {
        result.headers!.push({ key: key.trim(), value })
      }
    }
  }

  // Extract body (-d or --data or --data-raw) - handle single quotes containing JSON
  // First try to match single-quoted body (common for JSON)
  let bodyMatch = normalized.match(/(?:-d|--data|--data-raw)\s+'([^']+)'/i)
  if (!bodyMatch) {
    // Try double-quoted body
    bodyMatch = normalized.match(/(?:-d|--data|--data-raw)\s+"([^"]+)"/i)
  }
  if (!bodyMatch) {
    // Try $'...' format
    bodyMatch = normalized.match(/(?:-d|--data|--data-raw)\s+\$'([^']+)'/i)
  }
  if (bodyMatch) {
    result.body = bodyMatch[1]
    // If no method specified but has body, default to POST
    if (!result.method) {
      result.method = 'POST'
    }
  }

  // Default method to GET if not specified
  if (!result.method) {
    result.method = 'GET'
  }

  return result
}
