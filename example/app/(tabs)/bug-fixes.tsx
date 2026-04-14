import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import {
  prepareWithSegments,
  measureNaturalWidth,
  measureInkBounds,
  measureInkDebug,
  logInkDebugMessage,
  getFontMetrics,
  InkSafeText,
  getInkSafePadding,
} from 'expo-pretext'

const fmt = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? '—' : value.toFixed(1)
const emittedDebugLogs = new Set<string>()
const IOS_LEFT_SAFETY_INSET = 1
const IOS_BOTTOM_SAFETY_INSET = 1

const fmtBounds = (bounds?: { left: number; top: number; right: number; bottom: number; width: number; height: number } | null) => {
  if (!bounds) return '—'
  return `L${fmt(bounds.left)} T${fmt(bounds.top)} R${fmt(bounds.right)} B${fmt(bounds.bottom)} W${fmt(bounds.width)} H${fmt(bounds.height)}`
}

const IOS_TESTS = [
  { label: 'Georgia Bold Italic (system)', font: 'Georgia', size: 80, text: 'fly', weight: 'bold' as const, italic: true },
  { label: 'Georgia Bold Italic (system)', font: 'Georgia', size: 64, text: 'wafer', weight: 'bold' as const, italic: true },
  { label: 'Playfair Display Bold Italic (custom)', font: 'PlayfairDisplay-BoldItalic', size: 80, text: 'fly' },
  { label: 'Georgia Bold Italic (system)', font: 'Georgia', size: 64, text: 'fjord', weight: 'bold' as const, italic: true },
]

const ANDROID_TESTS = [
  { label: 'Serif Bold Italic (system)', font: 'serif', size: 80, text: 'fly', weight: 'bold' as const, italic: true },
  { label: 'Serif Bold Italic (system)', font: 'serif', size: 64, text: 'wafer', weight: 'bold' as const, italic: true },
  { label: 'Playfair Display Bold Italic (custom)', font: 'PlayfairDisplay-BoldItalic', size: 80, text: 'fly' },
  { label: 'Serif Bold Italic (system)', font: 'serif', size: 64, text: 'fjord', weight: 'bold' as const, italic: true },
]

const TESTS = Platform.OS === 'android' ? ANDROID_TESTS : IOS_TESTS

export default function TextBugsScreen() {
  const [fontsLoaded] = useFonts({
    'PlayfairDisplay-BoldItalic': require('../../assets/fonts/PlayfairDisplay-BoldItalic.ttf'),
  })

  if (!fontsLoaded) return <View style={s.root}><Text style={s.loading}>Loading fonts...</Text></View>

  return (
    <SafeAreaView style={s.root} edges={['top']}>
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.title}>RN #56349 — Italic Ink Overshoot</Text>
      <Text style={s.desc}>
        Red = container sized to advance width (clips){'\n'}
        Green = container sized to ink width (fits)
      </Text>

      {TESTS.map((t, i) => {
        const style = {
          fontFamily: t.font,
          fontSize: t.size,
          ...(t.weight ? { fontWeight: t.weight } : {}),
          ...(t.italic ? { fontStyle: 'italic' as const } : {}),
        }

        let advance = 0
        try {
          const p = prepareWithSegments(t.text, style)
          advance = measureNaturalWidth(p)
        } catch { advance = 0 }
        const inkBounds = measureInkBounds(t.text, style)
        const nativeDebug = Platform.OS === 'ios' ? measureInkDebug(t.text, style) : null
        const metrics = getFontMetrics(style)
        const ascender = Math.max(0, metrics.ascender)
        const descender = Math.max(0, Math.abs(metrics.descender))
        const inkPadLeft = Math.max(0, -inkBounds.left) + (Platform.OS === 'ios' ? IOS_LEFT_SAFETY_INSET : 0)
        const inkRightExtent = Math.max(advance, inkBounds.right)
        const inkPadRight = Math.max(0, inkRightExtent - advance)
        const inkPadTop = Math.max(0, -inkBounds.top - ascender)
        const inkPadBottom = Math.max(0, inkBounds.bottom - descender) + (Platform.OS === 'ios' ? IOS_BOTTOM_SAFETY_INSET : 0)
        const ink = Math.max(inkBounds.width, advance + inkPadLeft + inkPadRight)
        const diff = ink - advance
        const inkWidth = Math.max(20, Math.ceil(advance + inkPadLeft + inkPadRight))

        if (nativeDebug) {
          const debugPayload = {
            caseLabel: t.label,
            text: t.text,
            style,
            native: nativeDebug,
            js: {
              advance,
              inkBounds,
              metrics,
              inkPadLeft,
              inkPadRight,
              inkPadTop,
              inkPadBottom,
              inkRightExtent,
              ink,
              diff,
              inkWidth,
              advanceBoxWidth: Math.max(20, Math.ceil(advance)),
            },
          }
          const debugMessage = JSON.stringify(debugPayload)
          if (!emittedDebugLogs.has(debugMessage)) {
            emittedDebugLogs.add(debugMessage)
            logInkDebugMessage(debugMessage)
          }
        }

        return (
          <View key={i} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardLabel}>{t.label}</Text>
              <Text style={s.cardSub}>"{t.text}" {t.size}px</Text>
            </View>

            <View style={s.metricsRow}>
              <View style={[s.metric, s.metricRed]}>
                <Text style={s.metricLabel}>ADVANCE</Text>
                <Text style={s.metricValue}>{advance.toFixed(1)}</Text>
              </View>
              <View style={[s.metric, s.metricGreen]}>
                <Text style={s.metricLabel}>INK</Text>
                <Text style={s.metricValue}>{ink.toFixed(1)}</Text>
              </View>
              <View style={s.metric}>
                <Text style={s.metricLabel}>DIFF</Text>
                <Text style={[s.metricValue, { color: diff > 0 ? '#4ade80' : '#ffd369' }]}>
                  {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                </Text>
              </View>
            </View>

            <View style={s.compareRow}>
              {/* ADVANCE container — clips if text ink overshoots */}
              <View style={s.compareCol}>
                <Text style={s.compareLabel}>advance (clips)</Text>
                <View style={[s.clipBox, s.clipBoxRed, { width: Math.max(20, Math.ceil(advance)) }]}>
                  <Text style={style} numberOfLines={1} ellipsizeMode="clip">
                    {t.text}
                  </Text>
                </View>
              </View>

              <View style={s.vsLabel}>
                <Text style={s.vsText}>vs</Text>
              </View>

              {/* INK container — exact ink inset wrapper */}
              <View style={s.compareCol}>
                <Text style={s.compareLabel}>ink (fits)</Text>
                <View style={[s.clipBox, s.clipBoxGreen, { width: inkWidth }]}>
                  <Text
                    style={[
                      style,
                      {
                        width: inkWidth,
                        paddingLeft: inkPadLeft,
                        paddingRight: inkPadRight,
                        paddingTop: inkPadTop,
                        paddingBottom: inkPadBottom,
                      },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="clip"
                  >
                    {t.text}
                  </Text>
                </View>
              </View>
            </View>

            {nativeDebug ? (
              <View style={s.debugPanel}>
                <Text style={s.debugTitle}>iOS debug</Text>
                <Text style={s.debugLine}>requested: {t.font} / {t.weight ?? '400'} / {t.italic ? 'italic' : 'normal'} / {t.size}px</Text>
                <Text style={s.debugLine}>resolved: {nativeDebug.resolvedFont.fontName} · family {nativeDebug.resolvedFont.familyName} · traits {nativeDebug.resolvedFont.symbolicTraits}</Text>
                <Text style={s.debugLine}>native source: {nativeDebug.source} · advance {fmt(nativeDebug.typographic.advance)} · ascent {fmt(nativeDebug.typographic.ascent)} · descent {fmt(nativeDebug.typographic.descent)}</Text>
                <Text style={s.debugLine}>native final: {fmtBounds(nativeDebug.finalBounds)}</Text>
                <Text style={s.debugLine}>native raster: {fmtBounds(nativeDebug.rasterBounds)}</Text>
                <Text style={s.debugLine}>native vector: {fmtBounds(nativeDebug.vectorBounds)}</Text>
                <Text style={s.debugLine}>canvas: {fmt(nativeDebug.rasterContext.canvasWidth)}×{fmt(nativeDebug.rasterContext.canvasHeight)} pt · {nativeDebug.rasterContext.pixelWidth}×{nativeDebug.rasterContext.pixelHeight} px · scale {fmt(nativeDebug.rasterContext.scale)}</Text>
                <Text style={s.debugLine}>origin/padding: x {fmt(nativeDebug.rasterContext.originX)} · y {fmt(nativeDebug.rasterContext.originY)} · pad {fmt(nativeDebug.rasterContext.padding)}</Text>
                <Text style={s.debugLine}>js inkBounds: {fmtBounds(inkBounds)}</Text>
                <Text style={s.debugLine}>container: advanceBox {fmt(Math.ceil(advance))} · inkBox {fmt(inkWidth)} · left {fmt(inkPadLeft)} · right {fmt(inkPadRight)} · top {fmt(inkPadTop)} · bottom {fmt(inkPadBottom)}</Text>
                <Text style={s.debugLine}>font metrics: asc {fmt(ascender)} · desc {fmt(descender)} · inkRightExtent {fmt(inkRightExtent)}</Text>
              </View>
            ) : null}
          </View>
        )
      })}

      {/* ── InkSafeText API Demo ─────────────────────────────── */}
      <Text style={[s.title, { marginTop: 20, color: '#22c55e' }]}>{'<InkSafeText>'} API Demo</Text>
      <Text style={s.desc}>
        Drop-in {'<Text>'} replacement — auto-fixes italic clipping.{'\n'}
        No manual padding, no wrapper View. One component.
      </Text>

      {TESTS.map((t, i) => {
        const style = {
          fontFamily: t.font,
          fontSize: t.size,
          ...(t.weight ? { fontWeight: t.weight } : {}),
          ...(t.italic ? { fontStyle: 'italic' as const } : {}),
        }

        const result = getInkSafePadding(t.text, style)

        return (
          <View key={`ink-safe-${i}`} style={[s.card, { borderColor: 'rgba(34,197,94,0.25)' }]}>
            <View style={s.cardHeader}>
              <Text style={s.cardLabel}>{t.label}</Text>
              <Text style={s.cardSub}>"{t.text}" {t.size}px</Text>
            </View>

            {/* Row 1: plain <Text> — clips */}
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <Text style={s.compareLabel}>{'<Text>'} (clips)</Text>
              <View style={[s.clipBox, s.clipBoxRed, { width: Math.max(20, Math.ceil(result.advance)) }]}>
                <Text style={style} numberOfLines={1} ellipsizeMode="clip">
                  {t.text}
                </Text>
              </View>
            </View>

            {/* Row 2: <InkSafeText> — auto-fixed */}
            <View style={{ alignItems: 'center' }}>
              <Text style={s.compareLabel}>{'<InkSafeText>'} (fits)</Text>
              <View style={[s.clipBox, s.clipBoxGreen, { width: Math.max(20, result.inkWidth) }]}>
                <InkSafeText style={style} numberOfLines={1} ellipsizeMode="clip">
                  {t.text}
                </InkSafeText>
              </View>
            </View>

            <View style={{ marginTop: 8, alignItems: 'center' }}>
              <Text style={[s.debugLine, { color: '#4ade80' }]}>
                padding: L{result.padding.paddingLeft.toFixed(1)} R{result.padding.paddingRight.toFixed(1)} T{result.padding.paddingTop.toFixed(1)} B{result.padding.paddingBottom.toFixed(1)}
              </Text>
            </View>
          </View>
        )
      })}

      <View style={s.footer}>
        <Text style={s.footerText}>
          exact demo · green text padding = left/right/top/bottom ink inset
        </Text>
      </View>
    </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0c' },
  content: { padding: 16, paddingBottom: 60 },
  loading: { color: '#fff', fontFamily: 'Menlo', fontSize: 14, marginTop: 100, textAlign: 'center' },
  title: {
    fontFamily: 'Menlo',
    fontSize: 14,
    fontWeight: '800',
    color: '#ffd369',
    letterSpacing: 1,
    marginBottom: 4,
  },
  desc: {
    fontFamily: 'Menlo',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 17,
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#121218',
    borderWidth: 1,
    borderColor: 'rgba(255,211,105,0.18)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  cardLabel: {
    fontFamily: 'Menlo',
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.5,
    flex: 1,
  },
  cardSub: {
    fontFamily: 'Menlo',
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  metric: {
    flex: 1,
    backgroundColor: '#1a1a22',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  metricRed: { borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.6)' },
  metricGreen: { borderWidth: 1.5, borderColor: 'rgba(34,197,94,0.6)' },
  metricLabel: {
    fontFamily: 'Menlo',
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  metricValue: {
    fontFamily: 'Menlo',
    fontSize: 18,
    fontWeight: '800',
    color: '#ffd369',
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  compareCol: {
    alignItems: 'center',
  },
  vsLabel: {
    paddingHorizontal: 4,
  },
  vsText: {
    fontFamily: 'Menlo',
    fontSize: 10,
    color: 'rgba(255,255,255,0.25)',
    fontWeight: '700',
  },
  compareLabel: {
    fontFamily: 'Menlo',
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  clipBox: {
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 2,
  },
  clipBoxRed: { borderColor: '#ef4444' },
  clipBoxGreen: { borderColor: '#22c55e' },
  debugPanel: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#17171f',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.28)',
    gap: 3,
  },
  debugTitle: {
    fontFamily: 'Menlo',
    fontSize: 9,
    fontWeight: '700',
    color: '#93c5fd',
    marginBottom: 3,
    letterSpacing: 0.4,
  },
  debugLine: {
    fontFamily: 'Menlo',
    fontSize: 8,
    lineHeight: 12,
    color: 'rgba(255,255,255,0.72)',
  },
  footer: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,211,105,0.1)',
  },
  footerText: {
    fontFamily: 'Menlo',
    fontSize: 8,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    lineHeight: 13,
  },
})
