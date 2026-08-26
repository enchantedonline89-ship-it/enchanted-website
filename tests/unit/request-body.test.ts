// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  readBoundedJsonObject,
  readBoundedText,
  RequestBodyTooLargeError,
} from '@/lib/request-body'

describe('bounded request bodies', () => {
  it('reads small JSON objects', async () => {
    await expect(readBoundedJsonObject(new Request('https://example.test', {
      method: 'POST',
      body: JSON.stringify({ ok: true }),
    }), 32)).resolves.toEqual({ ok: true })
  })

  it('stops bodies that exceed the byte limit', async () => {
    await expect(readBoundedText(new Request('https://example.test', {
      method: 'POST',
      body: '12345',
    }), 4)).rejects.toBeInstanceOf(RequestBodyTooLargeError)
  })
})
