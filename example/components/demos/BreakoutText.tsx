// PRETEXT BREAKER — arcade-style breakout game where bricks are words.
// Inspired by the pretextjs.dev Pretext Breaker demo.
// Each brick's width = natural width of its word at the game font (measureNaturalWidth).
// Words are laid out in sentence order with color cycling. Background shows dense prose.

import { useState, useEffect, useMemo, useRef } from 'react'
import { View, Text, StyleSheet, useWindowDimensions, PanResponder, Pressable } from 'react-native'
import { prepareWithSegments, measureNaturalWidth } from 'expo-pretext'

const BRICK_STYLE = { fontFamily: 'Menlo', fontSize: 14, lineHeight: 20 }

// Meaningful sentence — each word becomes a brick
const SENTENCE = 'PRETEXT TURNS MOTION INTO LANGUAGE AND LETS EVERY MEASURED WORD SWING INTO PLACE WHILE YOU BREAK THE APART'
const WORDS = SENTENCE.split(' ')

// Arcade palette — cycles per brick
const BRICK_COLORS = [
  '#e0893e', // orange
  '#d9a441', // yellow
  '#9c6eba', // purple
  '#4a9e5d', // green
  '#3d8bbf', // cyan
  '#c44e5a', // red
]

// Background prose text — fills the arena behind the bricks for texture
const BG_PROSE = `The layout engine measures every segment once, then lays out lines in pure arithmetic. No reflows, no DOM reads, no thrashing. The ball is a cursor, the bricks are words, and the words are geometry. When a word breaks, its measured width returns to the pool. When the paddle catches a power word, the rules shift for a moment — slow motion, multi ball, wider guard. The sentence at the top of the arena describes a philosophy: once you measure the text with the same engine that renders it, you stop fighting the browser and start choreographing it. `.repeat(6)

type Brick = {
  id: number
  text: string
  x: number
  y: number
  w: number
  h: number
  color: string
  alive: boolean
}

type Ball = { x: number; y: number; vx: number; vy: number; r: number }

export function BreakoutTextDemo() {
  const { width } = useWindowDimensions()
  const stageW = width
  const stageH = 640
  const HEADER_H = 72
  const ARENA_TOP = HEADER_H
  const ARENA_BOT = stageH - 44
  const PAD = 10
  const BRICK_H = 26

  // Build bricks once per width
  const initialBricks = useMemo<Brick[]>(() => {
    const list: Brick[] = []
    const widths = WORDS.map(w => {
      const prepared = prepareWithSegments(w, BRICK_STYLE)
      return measureNaturalWidth(prepared) + 18 // padding inside the brick
    })

    let x = PAD
    let y = ARENA_TOP + 12
    for (let i = 0; i < WORDS.length; i++) {
      const w = widths[i]!
      if (x + w > stageW - PAD) {
        x = PAD
        y += BRICK_H + 4
      }
      list.push({
        id: i,
        text: WORDS[i]!,
        x, y, w, h: BRICK_H,
        color: BRICK_COLORS[i % BRICK_COLORS.length]!,
        alive: true,
      })
      x += w + 6
    }
    return list
  }, [stageW])

  const [bricks, setBricks] = useState<Brick[]>(initialBricks)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [level] = useState(1)

  const [paddle, setPaddle] = useState({ x: stageW / 2 - 50, y: ARENA_BOT - 18, w: 100, h: 10 })
  const paddleRef = useRef(paddle)
  paddleRef.current = paddle

  const [ball, setBall] = useState<Ball>({ x: stageW / 2, y: ARENA_BOT - 40, vx: 2.6, vy: -2.6, r: 6 })

  const [powerLabel, setPowerLabel] = useState<string | null>(null)
  const powerExpiresRef = useRef(0)

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (e) => {
      const lx = e.nativeEvent.locationX
      setPaddle(p => ({ ...p, x: Math.max(PAD, Math.min(stageW - p.w - PAD, lx - p.w / 2)) }))
    },
  }), [stageW])

  useEffect(() => {
    const timer = setInterval(() => {
      if (powerExpiresRef.current && Date.now() > powerExpiresRef.current) {
        powerExpiresRef.current = 0
        setPowerLabel(null)
      }

      setBall(b => {
        let { x, y, vx, vy, r } = b

        const slow = powerLabel === 'SLOW' ? 0.55 : 1
        x += vx * slow
        y += vy * slow

        if (x - r < 0) { x = r; vx = -vx }
        if (x + r > stageW) { x = stageW - r; vx = -vx }
        if (y - r < ARENA_TOP) { y = ARENA_TOP + r; vy = -vy }

        const p = paddleRef.current
        if (y + r >= p.y && y + r <= p.y + p.h + 6 && x >= p.x && x <= p.x + p.w && vy > 0) {
          vy = -Math.abs(vy)
          const rel = (x - (p.x + p.w / 2)) / (p.w / 2)
          vx = rel * 3.5
        }

        if (y > stageH) {
          setLives(l => Math.max(0, l - 1))
          return { x: stageW / 2, y: ARENA_BOT - 40, vx: 2.6, vy: -2.6, r }
        }

        setBricks(prev => {
          let changed = false
          const next = prev.map(br => {
            if (!br.alive) return br
            if (
              x + r >= br.x && x - r <= br.x + br.w &&
              y + r >= br.y && y - r <= br.y + br.h
            ) {
              changed = true
              vy = -vy
              if (Math.random() < 0.15) {
                const powers = ['SLOW', 'MULTI', 'EXPAND'] as const
                const power = powers[Math.floor(Math.random() * powers.length)]!
                setPowerLabel(power)
                powerExpiresRef.current = Date.now() + 5000
                if (power === 'EXPAND') {
                  setPaddle(pp => ({ ...pp, w: 160 }))
                  setTimeout(() => setPaddle(pp => ({ ...pp, w: 100 })), 5000)
                }
              }
              return { ...br, alive: false }
            }
            return br
          })
          if (changed) setScore(s => s + 60 + level * 10)
          return changed ? next : prev
        })

        return { x, y, vx, vy, r }
      })
    }, 16)
    return () => clearInterval(timer)
  }, [stageW, stageH, level, powerLabel, ARENA_TOP, ARENA_BOT])

  const aliveCount = bricks.filter(b => b.alive).length

  const reset = () => {
    setBricks(initialBricks)
    setScore(0)
    setLives(3)
    setBall({ x: stageW / 2, y: ARENA_BOT - 40, vx: 2.6, vy: -2.6, r: 6 })
    setPowerLabel(null)
    powerExpiresRef.current = 0
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>PRETEXT BREAKER</Text>
          <Pressable onPress={reset} style={styles.resetBtn}>
            <Text style={styles.resetText}>RESET</Text>
          </Pressable>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statKey}>SCORE</Text>
          <Text style={styles.statVal}>{String(score).padStart(5, '0')}</Text>
          <Text style={styles.statKey}>LIVES</Text>
          <Text style={styles.statVal}>{'♥'.repeat(lives)}</Text>
          <Text style={styles.statKey}>LEVEL</Text>
          <Text style={styles.statVal}>{String(level).padStart(2, '0')}</Text>
        </View>
        <Text style={styles.instructions}>
          Break {aliveCount} words. Drag the paddle to aim, catch power words.
        </Text>
      </View>

      {/* Arena */}
      <View {...pan.panHandlers} style={[styles.arena, { width: stageW, height: ARENA_BOT - ARENA_TOP + 28 }]}>
        <Text style={styles.prose} numberOfLines={40}>{BG_PROSE}</Text>

        {bricks.map(br => br.alive && (
          <View key={br.id} style={{
            position: 'absolute',
            left: br.x,
            top: br.y - ARENA_TOP,
            width: br.w,
            height: br.h,
            backgroundColor: br.color,
            borderRadius: 2,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.3)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Text style={styles.brickText}>{br.text}</Text>
          </View>
        ))}

        <View style={{
          position: 'absolute',
          left: ball.x - ball.r,
          top: ball.y - ball.r - ARENA_TOP,
          width: ball.r * 2,
          height: ball.r * 2,
          borderRadius: ball.r,
          backgroundColor: '#ffe066',
          shadowColor: '#ffe066',
          shadowOpacity: 0.6,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
        }} />

        <View style={{
          position: 'absolute',
          left: paddle.x,
          top: paddle.y - ARENA_TOP,
          width: paddle.w,
          height: paddle.h,
          backgroundColor: '#e8e4dc',
          borderRadius: 2,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.5)',
        }} />

        {powerLabel && (
          <View style={styles.powerBadge}>
            <Text style={styles.powerText}>{powerLabel} 5s</Text>
          </View>
        )}
      </View>

      <Text style={styles.footerText}>
        measureNaturalWidth() · word brick widths = real measured text widths
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0c' },
  header: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2130',
    backgroundColor: '#0a0a0c',
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: {
    fontFamily: 'Menlo',
    fontSize: 16,
    fontWeight: '700',
    color: '#ffd369',
    letterSpacing: 2,
  },
  statsRow: { flexDirection: 'row', marginTop: 6, gap: 6, alignItems: 'baseline' },
  statKey: { fontFamily: 'Menlo', fontSize: 9, color: 'rgba(255,255,255,0.5)' },
  statVal: { fontFamily: 'Menlo', fontSize: 11, color: '#e8e4dc', marginRight: 8 },
  instructions: {
    fontFamily: 'Menlo',
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 4,
  },
  arena: { backgroundColor: '#0f0f14', overflow: 'hidden', position: 'relative' },
  prose: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 6,
    fontFamily: 'Menlo',
    fontSize: 9,
    lineHeight: 13,
    color: 'rgba(100, 140, 110, 0.2)',
  },
  brickText: {
    fontFamily: 'Menlo',
    fontSize: 12,
    fontWeight: '700',
    color: '#0a0a0c',
    letterSpacing: 0.5,
  },
  powerBadge: {
    position: 'absolute',
    left: 12,
    top: 6,
    backgroundColor: '#ffd369',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  powerText: { fontFamily: 'Menlo', fontSize: 10, fontWeight: '700', color: '#0a0a0c' },
  footerText: {
    fontFamily: 'Menlo',
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    paddingVertical: 10,
  },
  resetBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  resetText: { fontFamily: 'Menlo', fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 1 },
})
