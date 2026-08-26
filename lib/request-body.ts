export class RequestBodyTooLargeError extends Error {}

export async function readBoundedText(request: Request, maxBytes: number): Promise<string> {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) throw new RequestBodyTooLargeError()
  if (!request.body) return ''

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new RequestBodyTooLargeError()
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

export async function readBoundedJsonObject(
  request: Request,
  maxBytes = 16_384,
): Promise<Record<string, unknown>> {
  const value: unknown = JSON.parse(await readBoundedText(request, maxBytes))
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new SyntaxError()
  return value as Record<string, unknown>
}
