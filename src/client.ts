import { UpStream } from '@neematajs/client'
import {
  BaseClientFormat,
  type Rpc,
  type StreamMetadata,
  concat,
  decodeText,
  encodeNumber,
  encodeText,
} from '@neematajs/common'
import { serializeStreamId } from './common'

export class JsonFormat extends BaseClientFormat {
  mime = 'application/json'

  encode(
    data: any,
    replacer?: (this: any, key: string, value: any) => any,
  ): ArrayBuffer {
    return encodeText(JSON.stringify(data, replacer))
  }

  decode(data: ArrayBuffer): any {
    return JSON.parse(decodeText(data))
  }

  encodeRpc(rpc: Rpc): ArrayBuffer {
    const { callId, service, procedure, payload } = rpc
    const streams: Record<number, StreamMetadata> = {}
    const replacer = (key: string, value: any) => {
      if (value instanceof UpStream) {
        streams[value.id] = value.metadata
        return serializeStreamId(value)
      }
      return value
    }
    const rpcPayload = this.encode(
      [callId, service, procedure, payload],
      replacer,
    )
    const streamsData = this.encode(streams)
    const streamDataLength = encodeNumber(streamsData.byteLength, 'Uint32')
    return concat(streamDataLength, streamsData, rpcPayload)
  }
}
