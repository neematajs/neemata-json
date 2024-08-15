import { ApiBlob, type EncodeRpcContext, decodeText } from '@nmtjs/common'
import { describe, expect, it, vi } from 'vitest'
import { JsonFormat } from '../src/client.ts'
import { serializeStreamId } from '../src/common.ts'

describe('Client', () => {
  const format = new JsonFormat()

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

  it('should encode rpc', () => {
    const streamId = 0
    const rpc = {
      callId: 1,
      service: 'service',
      procedure: 'procedure',
      payload: {
        foo: 'bar',
        stream: ApiBlob.from(new ArrayBuffer(1), {
          size: 1,
          type: 'test',
          filename: 'file.txt',
        }),
      },
    }
    let stream: { streamId: number; blob: ApiBlob } | undefined
    const ctx = {
      addStream: vi.fn((blob: ApiBlob) => {
        return { id: streamId, metadata: blob.metadata }
      }),
      getStream: vi.fn(() => stream),
    } satisfies EncodeRpcContext
    const buffer = format.encodeRpc(rpc, ctx)
    expect(buffer).toBeInstanceOf(ArrayBuffer)

    const [callId, service, procedure, streams, formatPayload] = JSON.parse(
      decodeText(buffer),
    )

    expect(callId).toBe(rpc.callId)
    expect(service).toBe(rpc.service)
    expect(procedure).toBe(rpc.procedure)
    expect(streams).toHaveProperty(
      streamId.toString(),
      rpc.payload.stream.metadata,
    )
    expect(formatPayload).toBeTypeOf('string')

    const payload = JSON.parse(formatPayload)
    expect(payload).toStrictEqual({
      foo: 'bar',
      stream: serializeStreamId(streamId),
    })
  })

  // TODO: test decoding rpc
})
