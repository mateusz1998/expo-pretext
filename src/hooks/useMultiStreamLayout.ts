import { useMemo, useRef, useEffect } from 'react'
import { prepareStreaming, clearStreamingState } from '../streaming'
import { layout } from '../layout'
import type { TextStyle } from '../types'

type StreamInput = { key: string; text: string }
type StreamResult = { height: number; lineCount: number }

export function useMultiStreamLayout(
  streams: StreamInput[],
  style: TextStyle,
  maxWidth: number,
): Map<string, StreamResult> {
  // Stable object keys per string key
  const keysRef = useRef(new Map<string, object>())

  const results = useMemo(() => {
    const map = new Map<string, StreamResult>()
    for (const { key, text } of streams) {
      if (!keysRef.current.has(key)) {
        keysRef.current.set(key, {})
      }
      const objKey = keysRef.current.get(key)!
      const prepared = prepareStreaming(objKey, text, style)
      const result = layout(prepared, maxWidth)
      map.set(key, { height: result.height, lineCount: result.lineCount })
    }
    return map
  }, [streams, style, maxWidth])

  // Clean up removed streams
  useEffect(() => {
    const activeKeys = new Set(streams.map(s => s.key))
    for (const [key, objKey] of keysRef.current) {
      if (!activeKeys.has(key)) {
        clearStreamingState(objKey)
        keysRef.current.delete(key)
      }
    }
  }, [streams])

  return results
}
