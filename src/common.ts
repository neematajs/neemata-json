import type { UpStream } from '@neematajs/client'

// TODO: is this a good way to serialize streams within json?
const STREAM_SERIALIZE_KEY = '\fneemata:upstream:'

export const serializeStreamId = (stream: UpStream) => {
  return STREAM_SERIALIZE_KEY + stream.id
}

export const isStreamId = (value: any) =>
  value && typeof value === 'string' && value.startsWith(STREAM_SERIALIZE_KEY)

export const deserializeStreamId = (value: string) => {
  const streamId = value.slice(STREAM_SERIALIZE_KEY.length)
  return Number.parseInt(streamId)
}
