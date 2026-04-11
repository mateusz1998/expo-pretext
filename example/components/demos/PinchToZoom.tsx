import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { usePinchToZoomText } from 'expo-pretext/animated'

const SAMPLE_TEXT = "Pinch this text with two fingers. On every gesture frame the fontSize is scaled and the layout is recomputed via pure arithmetic. layout() runs in 0.0002ms — that's 120+ recalculations per frame. No reflow. No thrashing. No jank."

const BASE_STYLE = { fontFamily: 'Helvetica Neue', fontSize: 16, lineHeight: 24 }

export function PinchToZoomDemo() {
  const { width } = useWindowDimensions()
  // container padding 16 + bubble padding 16 per side = 64 total
  const maxWidth = width - 64

  const zoom = usePinchToZoomText(SAMPLE_TEXT, BASE_STYLE, maxWidth, {
    minFontSize: 10,
    maxFontSize: 48,
  })

  const pinch = Gesture.Pinch().onUpdate(e => {
    zoom.onPinchUpdate(e.scale)
  })

  // Text rendering uses the animated font/lineHeight — bubble grows naturally
  const textStyle = useAnimatedStyle(() => ({
    fontSize: zoom.animatedFontSize.value,
    lineHeight: zoom.animatedLineHeight.value,
  }))

  // Info bar showing the predicted height and current fontSize
  const infoStyle = useAnimatedStyle(() => ({
    // @ts-expect-error cross-platform string format
    width: `${Math.min(100, (zoom.animatedFontSize.value / 48) * 100)}%`,
  }))

  return (
    <GestureHandlerRootView style={styles.container}>
      <Text style={styles.hint}>Pinch with two fingers to zoom the text</Text>
      <GestureDetector gesture={pinch}>
        <View style={styles.bubble}>
          <Animated.Text style={[styles.bubbleText, textStyle]}>
            {SAMPLE_TEXT}
          </Animated.Text>
        </View>
      </GestureDetector>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>fontSize</Text>
        <AnimatedNumber value={zoom.animatedFontSize} suffix="px" />
        <Text style={[styles.infoLabel, { marginLeft: 16 }]}>height</Text>
        <AnimatedNumber value={zoom.animatedHeight} suffix="px" />
        <Text style={[styles.infoLabel, { marginLeft: 16 }]}>lines</Text>
        <Text style={styles.infoValue}>{zoom.layoutAtScale(1).lineCount}</Text>
      </View>

      <View style={styles.gaugeRow}>
        <View style={styles.gaugeTrack}>
          <Animated.View style={[styles.gaugeFill, infoStyle]} />
        </View>
      </View>

      <Text style={styles.infoText}>
        usePinchToZoomText() · predicted height from layout() at 0.0002ms per call
      </Text>
      <Text style={styles.infoText}>
        computeZoomLayout() re-runs on every gesture frame · 120+ layouts/frame
      </Text>
    </GestureHandlerRootView>
  )
}

// Renders an Animated.Text whose contents update from a SharedValue via
// Reanimated's animatedProps pattern. Since SharedValue can't be interpolated
// to text content directly, we show a static value that updates on re-render.
// This is shown next to the gauge.
function AnimatedNumber({ value, suffix }: { value: { value: number }; suffix: string }) {
  return (
    <Animated.Text style={styles.infoValue}>
      {Math.round(value.value)}{suffix}
    </Animated.Text>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0c', padding: 16 },
  hint: {
    fontFamily: 'Menlo',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 12,
  },
  bubble: {
    backgroundColor: '#1a1a1e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a32',
  },
  bubbleText: {
    fontFamily: 'Helvetica Neue',
    color: '#e8e4dc',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  infoLabel: {
    fontFamily: 'Menlo',
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    marginRight: 4,
  },
  infoValue: {
    fontFamily: 'Menlo',
    fontSize: 12,
    color: '#ffd369',
    fontWeight: '600',
  },
  gaugeRow: { marginTop: 8, paddingHorizontal: 4 },
  gaugeTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    backgroundColor: '#ffd369',
    borderRadius: 2,
  },
  infoText: {
    fontFamily: 'Menlo',
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 8,
    textAlign: 'center',
  },
})
