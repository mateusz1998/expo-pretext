import { useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native'
import { truncateText, useTextHeight, useTypewriterLayout } from 'expo-pretext'

const SAMPLE_TEXT =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque scelerisque efficitur posuere. ' +
  'Curabitur tincidunt placerat diam ac efficitur. Cras rutrum egestas nisl vitae pulvinar. ' +
  'Donec id mollis diam, id hendrerit neque. Donec accumsan efficitur libero, vitae feugiat odio fringilla ac. ' +
  'Aliquam a turpis bibendum, varius erat dictum, feugiat libero. ' +
  'Nam et dignissim nibh. Morbi elementum varius elit, at dignissim ex accumsan a.'

const STYLE = { fontFamily: 'Helvetica Neue', fontSize: 16, lineHeight: 24 }
const COLLAPSED_LINES = 3

const SPEEDS = [
  { label: '0.5x', ms: 60 },
  { label: '1x', ms: 30 },
  { label: '2x', ms: 15 },
  { label: '4x', ms: 6 },
  { label: 'Instant', ms: 0 },
]

export function ReadMoreDemo() {
  const { width } = useWindowDimensions()
  const maxWidth = width - 64

  // Truncated preview
  const truncation = useMemo(
    () => truncateText(SAMPLE_TEXT, STYLE, maxWidth, COLLAPSED_LINES, { ellipsis: '... ' }),
    [maxWidth],
  )

  // Full text height for expanded state
  const fullHeight = useTextHeight(SAMPLE_TEXT, STYLE, maxWidth)
  const collapsedHeight = COLLAPSED_LINES * (STYLE.lineHeight ?? STYLE.fontSize * 1.2)

  // The remaining text after truncation point
  const remainingText = useMemo(() => {
    if (!truncation.truncated) return ''
    // Strip the ellipsis we added to find the split point
    const previewText = truncation.text.replace(/\.\.\.\s*$/, '')
    const idx = SAMPLE_TEXT.indexOf(previewText.trimEnd().slice(-20))
    if (idx === -1) return SAMPLE_TEXT.slice(previewText.length - 4)
    return SAMPLE_TEXT.slice(idx + previewText.trimEnd().slice(-20).length)
  }, [truncation])

  // Typewriter for the remaining text
  const typewriter = useTypewriterLayout(remainingText, STYLE, maxWidth)

  const [state, setState] = useState<'collapsed' | 'expanding' | 'expanded'>('collapsed')
  const [speedIdx, setSpeedIdx] = useState(1) // default 1x
  const speed = SPEEDS[speedIdx]!

  // Drive the typewriter animation
  useEffect(() => {
    if (state !== 'expanding') return

    // Instant mode: reveal all at once
    if (speed.ms === 0) {
      typewriter.seekTo(typewriter.totalFrames - 1)
      setState('expanded')
      return
    }

    const timer = setInterval(() => {
      if (!typewriter.advance()) {
        setState('expanded')
      }
    }, speed.ms)
    return () => clearInterval(timer)
  }, [state, typewriter, speed.ms])

  const handleReadMore = useCallback(() => {
    typewriter.reset()
    setState('expanding')
  }, [typewriter])

  const handleReadLess = useCallback(() => {
    typewriter.reset()
    setState('collapsed')
  }, [typewriter])

  const isCollapsed = state === 'collapsed'

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Read More / Read Less</Text>
      <Text style={styles.subtitle}>
        truncateText() + useTypewriterLayout()
      </Text>

      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerBar} />
          <Text style={styles.headerTitle}>Read More Text</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.bodyText}>
            {isCollapsed ? truncation.text : (
              truncation.text.replace(/\.\.\.\s*$/, '') +
              (typewriter.current?.revealedText ?? '')
            )}
            {isCollapsed && truncation.truncated && (
              <Text style={styles.link} onPress={handleReadMore}> read more</Text>
            )}
            {state === 'expanded' && (
              <Text style={styles.link} onPress={handleReadLess}> read less</Text>
            )}
          </Text>
        </View>
      </View>

      {/* Speed control */}
      <View style={styles.speedRow}>
        <Text style={styles.speedLabel}>Speed:</Text>
        {SPEEDS.map((s, i) => (
          <Pressable
            key={s.label}
            onPress={() => setSpeedIdx(i)}
            style={[styles.speedBtn, i === speedIdx && styles.speedBtnActive]}
          >
            <Text style={[styles.speedBtnText, i === speedIdx && styles.speedBtnTextActive]}>
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.info}>
        <Text style={styles.infoText}>
          {isCollapsed ? `${COLLAPSED_LINES} lines` : `${typewriter.revealIndex + 1}/${typewriter.totalFrames} frames`}
          {' · '}
          {isCollapsed ? `${collapsedHeight}px` : `${fullHeight}px`}
          {state === 'expanding' ? ` · typing @ ${speed.label}` : ''}
        </Text>
        <Text style={styles.infoText}>
          truncateText(maxLines: {COLLAPSED_LINES}) → typewriter reveal on expand
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0c', padding: 16 },
  title: {
    fontFamily: 'Menlo', fontSize: 14, fontWeight: '800',
    color: '#ffd369', letterSpacing: 1, marginTop: 12, textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Menlo', fontSize: 10, color: 'rgba(255,255,255,0.4)',
    textAlign: 'center', marginTop: 4, marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#3b82f6',
    padding: 16,
    paddingTop: 24,
    alignItems: 'center',
  },
  headerBar: {
    width: 60, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: 'Helvetica Neue', fontSize: 18, fontWeight: '700',
    color: '#fff',
  },
  body: {
    padding: 16,
  },
  bodyText: {
    fontFamily: 'Helvetica Neue', fontSize: 16, lineHeight: 24,
    color: '#1a1a1a',
  },
  link: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  speedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 20,
  },
  speedLabel: {
    fontFamily: 'Menlo', fontSize: 10, fontWeight: '700',
    color: 'rgba(255,255,255,0.5)', marginRight: 4,
  },
  speedBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, backgroundColor: '#1a1a22',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  speedBtnActive: {
    backgroundColor: '#2563eb', borderColor: '#2563eb',
  },
  speedBtnText: {
    fontFamily: 'Menlo', fontSize: 10, fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  speedBtnTextActive: {
    color: '#fff',
  },
  info: { marginTop: 16, alignItems: 'center', gap: 4 },
  infoText: { fontFamily: 'Menlo', fontSize: 10, color: 'rgba(255,255,255,0.4)' },
})
