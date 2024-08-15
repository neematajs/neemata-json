import {
  ApiBlob,
  BaseServerFormat,
  type DecodeRpcContext,
  type EncodeRpcContext,
  type RpcResponse,
  decodeText,
  encodeText,
} from '@nmtjs/common'
import { deserializeStreamId, isStreamId, serializeStreamId } from './common.ts'

/**
 * Custom JSON encoding format with Neemata streams support.
 */
export class JsonFormat extends BaseServerFormat {
  contentType = 'application/x-neemata-json'
  accept = ['application/x-neemata-json']

  encode(data: any): ArrayBuffer {
    return encodeText(JSON.stringify(data))
  }

  encodeRpc(rpc: RpcResponse, context: EncodeRpcContext): ArrayBuffer {
    const { callId, error } = rpc
    if (error) return this.encode([callId, error, null])
    else {
      const streams: any = {}
      const replacer = (key: string, value: any) => {
        if (value instanceof ApiBlob) {
          const stream = context.addStream(value)
          streams[stream.id] = stream.metadata
          return serializeStreamId(stream.id)
        }
        return value
      }
      const payload = JSON.stringify(rpc.payload, replacer)
      return this.encode([callId, null, streams, payload])
    }
  }

  decode(data: ArrayBuffer): any {
    return JSON.parse(decodeText(data))
  }

  decodeRpc(buffer: ArrayBuffer, context: DecodeRpcContext) {
    const [callId, service, procedure, streams, formatPayload] =
      this.decode(buffer)

    const replacer = (key: string, value: any) => {
      if (typeof value === 'string' && isStreamId(value)) {
        const id = deserializeStreamId(value)
        const metadata = streams[id]
        return context.addStream(id, metadata)
      }
      return value
    }

    const payload = formatPayload ? JSON.parse(formatPayload, replacer) : null

    return {
      callId,
      service,
      procedure,
      payload,
    }
  }
}

/**
 * Standard JSON encoding format with no Neemata streams support.
 */
export class StandardJsonFormat extends BaseServerFormat {
  contentType = 'application/json'
  accept = ['application/json', 'application/vnd.api+json']

  encode(data: any) {
    return encodeText(JSON.stringify(data))
  }

  encodeRpc(rpc: RpcResponse) {
    const { callId, error } = rpc
    if (error) return this.encode([callId, error, null])
    else {
      return this.encode([callId, null, rpc.payload])
    }
  }

  decode(buffer: ArrayBuffer) {
    return JSON.parse(decodeText(buffer))
  }

  decodeRpc(buffer: ArrayBuffer) {
    const [callId, service, procedure, payload] = this.decode(buffer)
    return { callId, service, procedure, payload }
  }
}
