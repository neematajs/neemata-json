import { UpStream } from '@neematajs/client'
import { describe, expect, it } from 'vitest'
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
    const decoder = new TextDecoder()
    const rpc = {
      callId: 1,
      service: 'service',
      procedure: 'procedure',
      payload: {
        foo: 'bar',
        stream: new UpStream(
          1,
          { size: 1, type: 'test', filename: 'file.txt' },
          new ArrayBuffer(1),
        ),
      },
    }
    const buffer = format.encodeRpc(rpc)
    expect(buffer).toBeInstanceOf(ArrayBuffer)
    const view = new DataView(buffer)
    const streamsLength = view.getUint32(0, false)
    const streams = JSON.parse(
      decoder.decode(buffer.slice(4, 4 + streamsLength)),
    )
    expect(streams).toEqual({
      1: { size: 1, type: 'test', filename: 'file.txt' },
    })
    const payload = JSON.parse(decoder.decode(buffer.slice(4 + streamsLength)))
    expect(payload).toEqual([
      rpc.callId,
      rpc.service,
      rpc.procedure,
      {
        foo: 'bar',
        stream: serializeStreamId(rpc.payload.stream),
      },
    ])
  })
})
