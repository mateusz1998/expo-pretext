import { useState, useMemo } from 'react'
import { View, Text, StyleSheet, useWindowDimensions, PanResponder } from 'react-native'
import { prepareWithSegments, layoutNextLine } from 'expo-pretext'

const style = { fontFamily: 'Helvetica Neue', fontSize: 14, lineHeight: 20 }
const lineHeight = 20

const articleText = `The giraffe stands as the tallest land animal on Earth, its long neck stretching skyward to reach acacia leaves inaccessible to any other creature. A fully grown male can reach nearly six metres in height. Despite this extraordinary stature, the giraffe shares the same number of cervical vertebrae as most other mammals — just seven — each bone simply elongated to remarkable length. Giraffes inhabit the savannahs, grasslands, and open woodlands of sub-Saharan Africa. They move in loose groups called towers, which range from a few individuals to several dozen. Though once thought largely silent, researchers now know giraffes communicate through infrasound, humming at frequencies too low for human ears to detect.`

export function EditorialEngineDemo() {
  const { width } = useWindowDimensions()
  const columnWidth = width - 64
  const [obstaclePos, setObstaclePos] = useState({ x: columnWidth - 100, y: 20 })
  const obstacleSize = 80

  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        setObstaclePos(prev => ({
          x: Math.max(0, Math.min(columnWidth - obstacleSize, prev.x + gs.dx)),
          y: Math.max(0, prev.y + gs.dy),
        }))
      },
    }),
  [columnWidth])

  // layoutNextLine — each line gets different width based on obstacle position
  const lines = useMemo(() => {
    const prepared = prepareWithSegments(articleText, style)
    const result: { text: string; x: number; y: number; width: number }[] = []

    let cursor = { segmentIndex: 0, graphemeIndex: 0 }
    let y = 0

    while (true) {
      // Check if this line overlaps with the obstacle
      const lineTop = y
      const lineBottom = y + lineHeight
      const obsTop = obstaclePos.y
      const obsBottom = obstaclePos.y + obstacleSize

      let lineWidth = columnWidth
      let lineX = 0

      if (lineBottom > obsTop && lineTop < obsBottom) {
        // Line overlaps obstacle — reduce available width
        const obsLeft = obstaclePos.x
        const obsRight = obstaclePos.x + obstacleSize

        if (obsLeft > columnWidth / 2) {
          // Obstacle on right — text flows on left
          lineWidth = obsLeft - 4
        } else {
          // Obstacle on left — text flows on right
          lineX = obsRight + 4
          lineWidth = columnWidth - obsRight - 4
        }
        lineWidth = Math.max(lineWidth, 40)
      }

      const line = layoutNextLine(prepared, cursor, lineWidth)
      if (!line) break

      result.push({ text: line.text, x: lineX, y, width: lineWidth })
      cursor = line.end
      y += lineHeight
    }

    return result
  }, [obstaclePos, columnWidth])

  return (
    <View style={styles.container}>
      <Text style={styles.info}>
        Drag the green square — text reflows in real-time around it.
        layoutNextLine() with variable width per line. Pure arithmetic, 0 native calls per frame.
      </Text>
      <View style={[styles.textArea, { width: columnWidth, height: Math.max(400, lines.length * lineHeight + 40) }]}>
        {/* Rendered lines */}
        {lines.map((line, i) => (
          <Text
            key={i}
            style={[
              styles.lineText,
              { position: 'absolute', top: line.y, left: line.x, width: line.width },
            ]}
            numberOfLines={1}
          >
            {line.text}
          </Text>
        ))}
        {/* Draggable obstacle */}
        <View
          {...panResponder.panHandlers}
          style={[
            styles.obstacle,
            {
              position: 'absolute',
              left: obstaclePos.x,
              top: obstaclePos.y,
              width: obstacleSize,
              height: obstacleSize,
            },
          ]}
        >
          <Text style={styles.obstacleText}>Drag me</Text>
        </View>
      </View>
      <Text style={styles.stats}>
        {lines.length} lines | prepare() once, layoutNextLine() {lines.length}x per drag
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  info: { fontSize: 13, color: '#666', lineHeight: 18, padding: 16, fontStyle: 'italic' },
  textArea: {
    marginHorizontal: 16,
    backgroundColor: '#fffef5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0d8c0',
    padding: 12,
  },
  lineText: {
    fontFamily: 'Helvetica Neue',
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  obstacle: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  obstacleText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  stats: { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 8 },
})
