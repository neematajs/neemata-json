import { type DecodeRpcContext, encodeText } from '@nmtjs/common'
import { describe, expect, it, vi } from 'vitest'
import { serializeStreamId } from '../src/common.ts'
import { JsonFormat as ServerJsonFormat } from '../src/server.ts'

describe('Server', () => {
  const format = new ServerJsonFormat()

  it('should encode', () => {
    const data = { foo: 'bar' }
    const buffer = format.encode(data)
    expect(buffer).toBeInstanceOf(ArrayBuffer)
    expect(new Uint8Array(buffer)).toEqual(
      new TextEncoder().encode(JSON.stringify(data)),
    )
  })

  it('should decode', () => {
    const data = { foo: 'bar' }
    const buffer = new TextEncoder().encode(JSON.stringify(data))
    expect(format.decode(buffer)).toEqual(data)
  })

  it('should decode rpc', () => {
    const streamId = 1
    const input = {
      callId: 1,
      service: 'service',
      procedure: 'procedure',
      streams: {
        [streamId]: { size: 1, type: 'test', filename: 'file.txt' },
      },
      payload: JSON.stringify({
        foo: 'bar',
        stream: serializeStreamId(streamId),
      }),
    }
    let stream: { id: number; metadata: any } | undefined

    const ctx = {
      addStream: vi.fn((id, metadata) => (stream = { id, metadata })),
      getStream: vi.fn(() => stream),
    } satisfies DecodeRpcContext

    const rpc = format.decodeRpc(
      encodeText(
        JSON.stringify([
          input.callId,
          input.service,
          input.procedure,
          input.streams,
          input.payload,
        ]),
      ),
      ctx,
    )

    expect(rpc).toHaveProperty('callId', input.callId)
    expect(rpc).toHaveProperty('service', input.service)
    expect(rpc).toHaveProperty('procedure', input.procedure)
    expect(rpc).toHaveProperty('payload', {
      foo: 'bar',
      stream: stream!,
    })
  })

  // TODO: test encoding rpc
})
