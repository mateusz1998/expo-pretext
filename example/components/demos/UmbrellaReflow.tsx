// Umbrella Text Reflow — Matrix-style digital rain that stops at a draggable umbrella.
// Inspired by the original pretextjs.dev umbrella demo by @janmukeer.
// Each vertical column of characters is a stream that "rains" down; the umbrella shape
// casts a shadow — columns whose x-coordinate lands inside the umbrella body stop early,
// as if the umbrella is blocking the rain.

import { useState, useEffect, useMemo, useRef } from 'react'
import { View, Text, StyleSheet, PanResponder, useWindowDimensions } from 'react-native'
import { prepareWithSegments, measureNaturalWidth } from 'expo-pretext'

const CHAR_STYLE = { fontFamily: 'Menlo', fontSize: 14, lineHeight: 18 }
const LH = 18

// Matrix-style character pool (katakana + digits + latin) — looks like rain
const CHAR_POOL = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789ABCDEF'

function randomChar(): string {
  return CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)]!
}

type Stream = {
  col: number              // column index
  x: number                // x position in pixels
  head: number             // current head y in pixel units
  speed: number            // pixels per tick
  length: number           // length of the trail
  chars: string[]          // current rendered characters (top to bottom)
}

type Umbrella = {
  // Circular canopy (ellipse) + handle (thin rectangle)
  cx: number    // center x of canopy
  cy: number    // center y of canopy (top of umbrella body)
  rx: number    // canopy half-width
  ry: number    // canopy half-height
  handleW: number
  handleH: number
}

// Is a given (x, y) point inside the umbrella's rain-blocking region?
// The region is: canopy (upper ellipse) + full shadow column below the canopy
// all the way to the bottom of the stage. This matches the upstream pretextjs.dev
// umbrella demo where the umbrella casts a full shadow that blocks all rain below.
function pointInUmbrellaShadow(x: number, y: number, u: Umbrella, stageBottom: number): boolean {
  // Canopy: upper half of an ellipse (cy is the flat bottom of the canopy)
  if (y <= u.cy) {
    const dx = (x - u.cx) / u.rx
    const dy = (y - u.cy) / u.ry
    if (dx * dx + dy * dy <= 1) return true
    return false
  }
  // Below canopy: entire shadow column from canopy bottom to stage bottom
  // Shadow width equals canopy width (2 * rx)
  if (y > u.cy && y <= stageBottom) {
    if (x >= u.cx - u.rx && x <= u.cx + u.rx) return true
  }
  return false
}

export function UmbrellaReflowDemo() {
  const { width } = useWindowDimensions()
  const stageW = width - 16
  const stageH = 600

  // Measure character cell width once (monospace — all chars same width)
  const cellWidth = useMemo(() => {
    const prepared = prepareWithSegments('0', CHAR_STYLE)
    return measureNaturalWidth(prepared)
  }, [])

  const cols = useMemo(() => Math.floor(stageW / cellWidth), [stageW, cellWidth])
  const rows = useMemo(() => Math.floor(stageH / LH), [stageH])

  // Umbrella state — draggable
  const [umbrella, setUmbrella] = useState<Umbrella>(() => ({
    cx: stageW / 2,
    cy: stageH * 0.45,
    rx: Math.min(120, stageW * 0.25),
    ry: 48,
    handleW: 6,
    handleH: 100,
  }))

  const umbrellaRef = useRef(umbrella)
  umbrellaRef.current = umbrella

  // Drag gesture
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (e) => {
      const x = e.nativeEvent.locationX
      const y = e.nativeEvent.locationY
      setUmbrella(prev => ({
        ...prev,
        cx: Math.max(prev.rx, Math.min(stageW - prev.rx, x)),
        cy: Math.max(prev.ry, Math.min(stageH - prev.handleH - 20, y)),
      }))
    },
  }), [stageW, stageH])

  // Rain streams — initialized once, animated over time
  const streamsRef = useRef<Stream[]>([])
  const [tick, setTick] = useState(0)

  // Initialize streams lazily
  useEffect(() => {
    streamsRef.current = Array.from({ length: cols }, (_, col) => ({
      col,
      x: col * cellWidth,
      head: Math.random() * -stageH,
      speed: 1 + Math.random() * 2,
      length: 8 + Math.floor(Math.random() * 16),
      chars: Array.from({ length: 24 }, () => randomChar()),
    }))
  }, [cols, cellWidth, stageH])

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      const streams = streamsRef.current
      for (const s of streams) {
        s.head += s.speed
        // Respawn when fully off-screen
        if (s.head - s.length * LH > stageH) {
          s.head = -Math.random() * stageH * 0.5
          s.speed = 1 + Math.random() * 2
          s.length = 8 + Math.floor(Math.random() * 16)
        }
        // Occasionally cycle a character to simulate flicker
        if (Math.random() < 0.1) {
          s.chars[Math.floor(Math.random() * s.chars.length)] = randomChar()
        }
      }
      setTick(t => t + 1)
    }, 50)
    return () => clearInterval(timer)
  }, [stageH])

  // Compute visible character cells — for each stream, each row from head-length to head.
  // If a cell falls inside the umbrella, it is hidden (the umbrella blocks the rain).
  const cells = useMemo(() => {
    const out: Array<{ key: string; x: number; y: number; char: string; brightness: number }> = []
    const streams = streamsRef.current
    for (const s of streams) {
      for (let i = 0; i < s.length; i++) {
        const y = s.head - i * LH
        if (y < 0 || y > stageH) continue
        // Check umbrella collision — skip if occluded
        if (pointInUmbrellaShadow(s.x + cellWidth / 2, y + LH / 2, umbrella, stageH)) continue
        // Brightness fades from head (1.0) to tail (0.2)
        const brightness = i === 0 ? 1 : Math.max(0.15, 1 - i / s.length)
        out.push({
          key: `${s.col}-${i}`,
          x: s.x,
          y,
          char: s.chars[i % s.chars.length]!,
          brightness,
        })
      }
    }
    return out
  // tick drives re-render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, umbrella, stageH, cellWidth])

  return (
    <View style={styles.container}>
      <View {...pan.panHandlers} style={[styles.stage, { width: stageW, height: stageH }]}>
        {cells.map(cell => (
          <Text
            key={cell.key}
            style={[
              styles.char,
              {
                position: 'absolute',
                left: cell.x,
                top: cell.y,
                color: cell.brightness >= 0.95
                  ? '#d0f0ff'
                  : `rgba(80, 180, 255, ${cell.brightness})`,
              },
            ]}
          >
            {cell.char}
          </Text>
        ))}

        {/* Pretty umbrella — multi-layered render */}
        {(() => {
          const { cx, cy, rx, ry, handleH } = umbrella
          const panelCount = 5
          const panelW = (rx * 2) / panelCount
          return (
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
              {/* Soft shadow halo behind the umbrella */}
              <View style={{
                position: 'absolute',
                left: cx - rx - 4,
                top: cy - ry - 2,
                width: rx * 2 + 8,
                height: ry + 6,
                borderTopLeftRadius: rx + 4,
                borderTopRightRadius: rx + 4,
                backgroundColor: '#000',
                shadowColor: '#fff',
                shadowOpacity: 0.15,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 4 },
              }} />

              {/* Main canopy — half ellipse */}
              <View style={{
                position: 'absolute',
                left: cx - rx,
                top: cy - ry,
                width: rx * 2,
                height: ry,
                borderTopLeftRadius: rx,
                borderTopRightRadius: rx,
                backgroundColor: '#f5f5f7',
                overflow: 'hidden',
              }}>
                {/* Top-light highlight gradient (simulated with inner glow) */}
                <View style={{
                  position: 'absolute',
                  left: rx * 0.3,
                  top: 2,
                  width: rx * 0.5,
                  height: ry * 0.35,
                  borderRadius: rx * 0.5,
                  backgroundColor: 'rgba(255,255,255,0.5)',
                }} />

                {/* Panel seam lines — 4 interior dividers, curving from knob to bottom */}
                {Array.from({ length: panelCount - 1 }, (_, i) => {
                  const t = (i + 1) / panelCount
                  const seamX = t * rx * 2
                  return (
                    <View key={i} style={{
                      position: 'absolute',
                      left: seamX - 0.5,
                      top: 0,
                      bottom: 0,
                      width: 1,
                      backgroundColor: 'rgba(0,0,0,0.14)',
                    }} />
                  )
                })}

                {/* Bottom inner shadow for depth */}
                <View style={{
                  position: 'absolute',
                  left: 0, right: 0, bottom: 0, height: 6,
                  backgroundColor: 'rgba(0,0,0,0.18)',
                }} />
              </View>

              {/* Top knob */}
              <View style={{
                position: 'absolute',
                left: cx - 4,
                top: cy - ry - 5,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#d0d0d3',
                borderWidth: 1,
                borderColor: '#a0a0a3',
              }} />

              {/* Scalloped panel tips — small downward triangles at each panel seam */}
              {Array.from({ length: panelCount }, (_, i) => {
                const tipX = cx - rx + (i + 0.5) * panelW
                return (
                  <View key={`tip${i}`} style={{
                    position: 'absolute',
                    left: tipX - 6,
                    top: cy - 1,
                    width: 12,
                    height: 8,
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6,
                    borderBottomLeftRadius: 10,
                    borderBottomRightRadius: 10,
                    backgroundColor: '#e8e8eb',
                    transform: [{ scaleY: -1 }],
                  }} />
                )
              })}

              {/* Handle rod */}
              <View style={{
                position: 'absolute',
                left: cx - 1.5,
                top: cy,
                width: 3,
                height: handleH - 16,
                backgroundColor: '#c8a878',
                borderRadius: 1.5,
              }} />

              {/* Handle rod darker stripe (wood grain hint) */}
              <View style={{
                position: 'absolute',
                left: cx,
                top: cy,
                width: 1,
                height: handleH - 16,
                backgroundColor: 'rgba(0,0,0,0.25)',
              }} />

              {/* Curved hook (J shape) at bottom of handle */}
              <View style={{
                position: 'absolute',
                left: cx - 14,
                top: cy + handleH - 24,
                width: 16,
                height: 16,
                borderWidth: 3,
                borderTopColor: 'transparent',
                borderRightColor: 'transparent',
                borderBottomColor: '#c8a878',
                borderLeftColor: '#c8a878',
                borderBottomLeftRadius: 14,
              }} />
            </View>
          )
        })()}
      </View>
      <Text style={styles.info}>measureNaturalWidth() · drag the umbrella — digital rain casts into its shadow</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', paddingTop: 4 },
  stage: { backgroundColor: '#000', overflow: 'hidden' },
  char: { fontFamily: 'Menlo', fontSize: 14, lineHeight: 18 },
  info: { fontFamily: 'Menlo', fontSize: 10, color: 'rgba(120,180,255,0.5)', marginTop: 8 },
})
