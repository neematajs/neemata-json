import {
  BaseServerFormat,
  type DecodeRpcContext,
  decodeNumber,
  decodeText,
  encodeText,
} from '@neematajs/common'
import { deserializeStreamId, isStreamId } from './common.ts'

export class JsonFormat extends BaseServerFormat {
  accepts = ['application/json']
  mime = 'application/json'

  encode(
    data: any,
    replacer?: (this: any, key: string, value: any) => any,
  ): ArrayBuffer {
    return encodeText(JSON.stringify(data, replacer))
  }

  decode(
    data: ArrayBuffer,
    replacer?: (this: any, key: string, value: any) => any,
  ): any {
    return JSON.parse(decodeText(data), replacer)
  }

  decodeRpc(buffer: ArrayBuffer, context: DecodeRpcContext) {
    const streams = this.parseRPCStreams(buffer, context)
    const data = this.parseRPCMessageData(
      buffer.slice(Uint32Array.BYTES_PER_ELEMENT + streams.length),
      streams.replacer,
    )
    return data
  }

  protected parseRPCStreams(buffer: ArrayBuffer, context: DecodeRpcContext) {
    const length = decodeNumber(buffer, 'Uint32')
    const streams = this.decode(
      buffer.slice(
        Uint32Array.BYTES_PER_ELEMENT,
        Uint32Array.BYTES_PER_ELEMENT + length,
      ),
    )

    const replacer = streams.length
      ? (key, value) => {
          if (isStreamId(value)) {
            const streamId = deserializeStreamId(value)
            return context.getStream(streamId)
          }
          return value
        }
      : undefined

    for (const [id, metadata] of Object.entries(streams)) {
      context.addStream(Number.parseInt(id), metadata as any)
    }

    return { length, replacer }
  }

  protected parseRPCMessageData(
    buffer: ArrayBuffer,
    streamsJsonReplacer?: (...args: any[]) => any,
  ) {
    const [callId, service, procedure, payload] = this.decode(
      buffer,
      streamsJsonReplacer,
    )
    return { callId, service, procedure, payload }
  }
}
