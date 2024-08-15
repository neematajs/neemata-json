import {
  ApiBlob,
  type ApiBlobMetadata,
  BaseClientFormat,
  type DecodeRpcContext,
  type EncodeRpcContext,
  type Rpc,
  decodeText,
  encodeText,
} from '@nmtjs/common'
import { deserializeStreamId, isStreamId, serializeStreamId } from './common.ts'

/**
 * Custom JSON encoding format with support for Neemata streams.
 */
export class JsonFormat extends BaseClientFormat {
  contentType = 'application/x-neemata-json'

  encode(data: any): ArrayBuffer {
    return encodeText(JSON.stringify(data))
  }

  encodeRpc(rpc: Rpc, context: EncodeRpcContext): ArrayBuffer {
    const { callId, service, procedure } = rpc
    const streams: Record<number, ApiBlobMetadata> = {}
    const replacer = (key: string, value: any) => {
      if (value instanceof ApiBlob) {
        const stream = context.addStream(value)
        streams[stream.id] = stream.metadata
        return serializeStreamId(stream.id)
      }
      return value
    }
    const payload = JSON.stringify(rpc.payload, replacer)
    return this.encode([callId, service, procedure, streams, payload])
  }

  decode(data: ArrayBuffer): any {
    return JSON.parse(decodeText(data))
  }

  decodeRpc(buffer: ArrayBuffer, context: DecodeRpcContext) {
    const [callId, error, streams, formatPayload] = this.decode(buffer)
    if (error) return { callId, error, payload: null }
    else {
      const replacer = (key: string, value: any) => {
        if (typeof value === 'string' && isStreamId(value)) {
          const id = deserializeStreamId(value)
          const metadata = streams[id]
          return context.addStream(id, metadata)
        }
        return value
      }
      const payload = formatPayload ? JSON.parse(formatPayload, replacer) : null
      return { callId, error: null, payload }
    }
  }
}

/**
 * Standard JSON encoding format with no Neemata streams support.
 */
export class StandardJsonFormat extends BaseClientFormat {
  contentType = 'application/json'

  encode(data: any) {
    return encodeText(JSON.stringify(data))
  }

  encodeRpc(rpc: Rpc) {
    const { callId, service, procedure, payload } = rpc
    return this.encode([callId, service, procedure, payload])
  }

  decode(data: ArrayBuffer) {
    return JSON.parse(decodeText(data))
  }

  decodeRpc(buffer: ArrayBuffer) {
    const [callId, error, payload] = this.decode(buffer)
    return { callId, error, payload }
  }
}
