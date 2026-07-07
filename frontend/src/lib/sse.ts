// Hand-rolled SSE parser over a fetch ReadableStream. We do not use the native
// EventSource because it cannot issue a POST with a JSON body. Verified against
// the platform: Response.body is a ReadableStream<Uint8Array>, read via a
// reader + TextDecoder — no library needed.

export interface RawEvent {
  event: string
  data: string
}

function parseBlock(block: string): RawEvent | null {
  let event = 'message'
  const dataLines: string[] = []

  for (const line of block.split(/\r?\n/)) {
    if (line === '' || line.startsWith(':')) continue // blank / comment
    const colon = line.indexOf(':')
    const field = colon === -1 ? line : line.slice(0, colon)
    let value = colon === -1 ? '' : line.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)

    if (field === 'event') event = value
    else if (field === 'data') dataLines.push(value)
  }

  if (dataLines.length === 0) return null
  return { event, data: dataLines.join('\n') }
}

// Yields one RawEvent per `\n\n`-delimited SSE block. Throws if the reader
// itself errors (network drop); a clean stream close simply ends iteration.
export async function* parseEventStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<RawEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let boundary = buffer.search(/\r?\n\r?\n/)
      while (boundary !== -1) {
        const match = buffer.slice(boundary).match(/^\r?\n\r?\n/)
        const sepLen = match ? match[0].length : 2
        const block = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + sepLen)
        const parsed = parseBlock(block)
        if (parsed) yield parsed
        boundary = buffer.search(/\r?\n\r?\n/)
      }
    }

    // Flush any trailing block with no final blank line.
    buffer += decoder.decode()
    const tail = buffer.trim()
    if (tail) {
      const parsed = parseBlock(tail)
      if (parsed) yield parsed
    }
  } finally {
    reader.releaseLock()
  }
}
