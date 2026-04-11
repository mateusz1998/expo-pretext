import { useState, useEffect, useMemo, useRef } from 'react'
import { View, Text, StyleSheet, useWindowDimensions, PanResponder } from 'react-native'
import { prepareWithSegments, measureNaturalWidth } from 'expo-pretext'

const BRICK_STYLE = { fontFamily: 'Menlo', fontSize: 14, lineHeight: 20 }

const BRICK_LABELS = [
  'layout', 'prepare', 'measure', 'cache',
  'segment', 'kerning', 'glyph', 'wrap',
  'span', 'chunk', 'baseline', 'script',
]

type Brick = { id: number; x: number; y: number; w: number; h: number; text: string; alive: boolean }

export function BreakoutTextDemo() {
  const { width } = useWindowDimensions()
  const stageW = width - 16
  const stageH = 500
  const PAD = 10

  const [bricks, setBricks] = useState<Brick[]>(() => {
    const list: Brick[] = []
    let x = PAD
    let y = 20
    for (let i = 0; i < BRICK_LABELS.length; i++) {
      const text = BRICK_LABELS[i]!
      const prepared = prepareWithSegments(text, BRICK_STYLE)
      const w = measureNaturalWidth(prepared) + 16
      if (x + w > stageW - PAD) {
        x = PAD
        y += 28
      }
      list.push({ id: i, x, y, w, h: 24, text, alive: true })
      x += w + 6
    }
    return list
  })

  const [ball, setBall] = useState({ x: stageW / 2, y: stageH / 2, vx: 3, vy: 3, r: 8 })
  const [paddle, setPaddle] = useState({ x: stageW / 2 - 40, y: stageH - 30, w: 80, h: 10 })
  const paddleRef = useRef(paddle)
  paddleRef.current = paddle
  const [score, setScore] = useState(0)

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (e) => {
      const lx = e.nativeEvent.locationX
      setPaddle(p => ({ ...p, x: Math.max(0, Math.min(stageW - p.w, lx - p.w / 2)) }))
    },
  }), [stageW])

  useEffect(() => {
    const timer = setInterval(() => {
      setBall(b => {
        let { x, y, vx, vy, r } = b
        x += vx
        y += vy
        if (x - r < 0 || x + r > stageW) vx = -vx
        if (y - r < 0) vy = -vy
        // Paddle bounce
        const p = paddleRef.current
        if (y + r >= p.y && y + r <= p.y + p.h + 4 && x >= p.x && x <= p.x + p.w && vy > 0) {
          vy = -vy
        }
        // Reset if ball goes below
        if (y > stageH) {
          return { x: stageW / 2, y: stageH / 2, vx: 3, vy: 3, r }
        }
        // Brick collisions
        setBricks(prevBricks => {
          let changed = false
          const next = prevBricks.map(br => {
            if (!br.alive) return br
            if (x >= br.x && x <= br.x + br.w && y - r <= br.y + br.h && y + r >= br.y) {
              changed = true
              vy = -vy
              return { ...br, alive: false }
            }
            return br
          })
          if (changed) setScore(s => s + 1)
          return changed ? next : prevBricks
        })
        return { x, y, vx, vy, r }
      })
    }, 16)
    return () => clearInterval(timer)
  }, [stageW, stageH])

  return (
    <View style={styles.container}>
      <Text style={styles.score}>Score: {score}</Text>
      <View {...pan.panHandlers} style={[styles.stage, { width: stageW, height: stageH }]}>
        {bricks.map(br => br.alive && (
          <View key={br.id} style={{
            position: 'absolute', left: br.x, top: br.y, width: br.w, height: br.h,
            backgroundColor: '#2563eb', borderRadius: 4, justifyContent: 'center', alignItems: 'center',
          }}>
            <Text style={styles.brickText}>{br.text}</Text>
          </View>
        ))}
        <View style={{
          position: 'absolute',
          left: ball.x - ball.r, top: ball.y - ball.r,
          width: ball.r * 2, height: ball.r * 2, borderRadius: ball.r,
          backgroundColor: '#f97316',
        }} />
        <View style={{
          position: 'absolute',
          left: paddle.x, top: paddle.y, width: paddle.w, height: paddle.h,
          backgroundColor: '#e8e4dc', borderRadius: 4,
        }} />
      </View>
      <Text style={styles.info}>measureNaturalWidth() · drag to move paddle</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0c', alignItems: 'center', paddingTop: 4 },
  score: { fontFamily: 'Menlo', fontSize: 12, color: '#e8e4dc', marginBottom: 8 },
  stage: { backgroundColor: '#0f0f14', overflow: 'hidden' },
  brickText: { fontFamily: 'Menlo', fontSize: 12, color: '#fff' },
  info: { fontFamily: 'Menlo', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 8 },
})
