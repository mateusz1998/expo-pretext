import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import { prepareWithSegments, measureNaturalWidth } from 'expo-pretext'

const STYLE = { fontFamily: 'Helvetica Neue', fontSize: 16, lineHeight: 24 }

const TODOS = [
  '📝 Write the blog post',
  '☕ Buy coffee',
  '🐛 Fix the layout bug',
  '💬 Reply to emails',
  '🏃 Go for a run',
  '📚 Read one chapter',
  '🌱 Water the plants',
  '🎨 Sketch a new idea',
]

type Item = {
  id: number
  text: string
  width: number
  x: number
  y: number
  vx: number
  vy: number
}

export function PhysicsTodoDemo() {
  const { width } = useWindowDimensions()
  const stageW = width - 16
  const stageH = 600
  const PAD = 12
  const itemH = 36

  // Measure each todo's natural width
  const [items, setItems] = useState<Item[]>(() => {
    const list: Item[] = []
    for (let i = 0; i < TODOS.length; i++) {
      const text = TODOS[i]!
      const prepared = prepareWithSegments(text, STYLE)
      const naturalW = measureNaturalWidth(prepared) + PAD * 2
      list.push({
        id: i,
        text,
        width: naturalW,
        x: Math.random() * (stageW - naturalW),
        y: Math.random() * (stageH - itemH),
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
      })
    }
    return list
  })

  useEffect(() => {
    const timer = setInterval(() => {
      setItems(prev => prev.map(it => {
        let { x, y, vx, vy, width: w } = it
        x += vx
        y += vy
        if (x < 0) { x = 0; vx = -vx }
        if (x + w > stageW) { x = stageW - w; vx = -vx }
        if (y < 0) { y = 0; vy = -vy }
        if (y + itemH > stageH) { y = stageH - itemH; vy = -vy }
        return { ...it, x, y, vx, vy }
      }))
    }, 33)
    return () => clearInterval(timer)
  }, [stageW])

  return (
    <View style={styles.container}>
      <View style={[styles.stage, { width: stageW, height: stageH }]}>
        {items.map(it => (
          <View
            key={it.id}
            style={[styles.pill, { left: it.x, top: it.y, width: it.width, height: itemH }]}
          >
            <Text style={styles.pillText}>{it.text}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.info}>measureNaturalWidth() · real text widths drive physics collision</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0c', alignItems: 'center', paddingTop: 4 },
  stage: { backgroundColor: '#0f0f14', overflow: 'hidden' },
  pill: {
    position: 'absolute',
    backgroundColor: '#2563eb',
    borderRadius: 18,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  pillText: { fontFamily: 'Helvetica Neue', fontSize: 16, color: '#fff' },
  info: { fontFamily: 'Menlo', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 8 },
})
