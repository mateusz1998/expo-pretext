// example/components/demos/SnapshotTesting.tsx
//
// buildHeightSnapshot + compareHeightSnapshots canary.
// Shows the CI workflow: capture a baseline, mutate a parameter,
// run compareHeightSnapshots, visualize the diff.

import { useState, useMemo } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import {
  buildHeightSnapshot,
  compareHeightSnapshots,
  type HeightSnapshot,
} from 'expo-pretext'

const CORPUS = [
  'Short.',
  'A medium-length line that should wrap at narrow widths but fit at wide ones.',
  'The quick brown fox jumps over the lazy dog and keeps going through the next three fields before anyone notices.',
  'CJK 快速的棕色狐狸跳过懒惰的狗，然后去下一个田野。',
  'ქართული სწრაფი ყავისფერი მელა ხტუნავს ზარმაცი ძაღლის ზემოთ.',
  'Arabic العربية الثعلب البني السريع يقفز فوق الكلب الكسول.',
]

const BASELINE_STYLE = { fontFamily: 'System', fontSize: 16, lineHeight: 24 }
const BASELINE_WIDTH = 320

type Perturbation = {
  label: string
  style: { fontFamily: string; fontSize: number; lineHeight: number }
  width: number
  hint: string
}

const PERTURBATIONS: Perturbation[] = [
  { label: 'baseline', style: BASELINE_STYLE, width: BASELINE_WIDTH, hint: 'identical to baseline → 0 mismatches' },
  { label: '+1px font size', style: { ...BASELINE_STYLE, fontSize: 17, lineHeight: 25 }, width: BASELINE_WIDTH, hint: 'font nudge → likely all rows differ' },
  { label: 'narrower (280px)', style: BASELINE_STYLE, width: 280, hint: 'width change → rewrap → heights drift' },
  { label: 'wider (480px)', style: BASELINE_STYLE, width: 480, hint: 'wider column → fewer lines on long rows' },
  { label: 'tight line height', style: { ...BASELINE_STYLE, lineHeight: 20 }, width: BASELINE_WIDTH, hint: 'lineHeight only → same wrap, smaller heights' },
]

export function SnapshotTestingDemo() {
  const [perturbIndex, setPerturbIndex] = useState(0)

  const baseline: HeightSnapshot = useMemo(
    () => buildHeightSnapshot(CORPUS, BASELINE_STYLE, BASELINE_WIDTH),
    [],
  )

  const perturb = PERTURBATIONS[perturbIndex]!

  const current: HeightSnapshot = useMemo(
    () => buildHeightSnapshot(CORPUS, perturb.style, perturb.width),
    [perturb],
  )

  const comparison = useMemo(
    () => compareHeightSnapshots(baseline, current),
    [baseline, current],
  )

  const incompatible = baseline.width !== current.width || baseline.styleKey !== current.styleKey

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.title}>buildHeightSnapshot · CI Regression Check</Text>
      <Text style={s.desc}>
        Capture deterministic height snapshot → store on disk →{'\n'}
        compare on each PR. When wraps shift, the diff shows up here.
      </Text>

      <Text style={s.sectionLabel}>BASELINE</Text>
      <View style={s.baselineBox}>
        <Text style={s.metaLine}>
          style <Text style={s.metaVal}>{baseline.styleKey}</Text>
        </Text>
        <Text style={s.metaLine}>
          width <Text style={s.metaVal}>{baseline.width}px</Text>
          {'  '}total <Text style={s.metaVal}>{baseline.totalHeight.toFixed(0)}px</Text>
          {'  '}rows <Text style={s.metaVal}>{baseline.entries.length}</Text>
        </Text>
      </View>

      <Text style={s.sectionLabel}>PERTURBATION</Text>
      <View style={s.perturbRow}>
        {PERTURBATIONS.map((p, i) => (
          <Pressable
            key={p.label}
            onPress={() => setPerturbIndex(i)}
            style={[s.perturbBtn, perturbIndex === i && s.perturbBtnActive]}
          >
            <Text style={[s.perturbText, perturbIndex === i && s.perturbTextActive]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.perturbHint}>{perturb.hint}</Text>

      <Text style={s.sectionLabel}>RESULT</Text>
      <View style={[s.resultBox, comparison.match ? s.resultPass : s.resultFail]}>
        <Text style={[s.resultStatus, comparison.match ? s.statusPass : s.statusFail]}>
          {comparison.match ? 'MATCH' : 'MISMATCH'}
        </Text>
        <Text style={s.resultMeta}>
          {incompatible
            ? 'incompatible snapshots (width or styleKey differ)'
            : `${comparison.mismatchCount} of ${CORPUS.length} entries differ`}
        </Text>
      </View>

      {comparison.mismatches.length > 0 && (
        <View style={s.mismatchList}>
          {comparison.mismatches.map((m) => (
            <View key={m.index} style={s.mismatchRow}>
              <View style={s.mismatchHead}>
                <Text style={s.mismatchIdx}>#{m.index}</Text>
                <Text style={s.mismatchDiff}>Δ {m.heightDiff.toFixed(0)}px</Text>
              </View>
              <Text style={s.mismatchPreview} numberOfLines={1}>
                {m.textPreview}
              </Text>
              <Text style={s.mismatchNums}>
                expected {m.expectedHeight.toFixed(0)}px → actual {m.actualHeight.toFixed(0)}px
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={s.footerHint}>
        In CI: JSON.stringify(snapshot) is stable for equal inputs.{'\n'}
        Store `snapshot.json` in git and compare against current build.
      </Text>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0c' },
  content: { padding: 16, paddingBottom: 60 },
  title: {
    fontFamily: 'Menlo', fontSize: 14, fontWeight: '800', color: '#ffd369',
    letterSpacing: 1, marginBottom: 6,
  },
  desc: {
    fontFamily: 'Menlo', fontSize: 11, color: 'rgba(255,255,255,0.5)',
    lineHeight: 17, marginBottom: 14,
  },
  sectionLabel: {
    fontFamily: 'Menlo', fontSize: 9, fontWeight: '700',
    color: 'rgba(255,255,255,0.45)', letterSpacing: 1.2, marginBottom: 6,
  },
  baselineBox: {
    backgroundColor: '#121218', borderRadius: 12, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,211,105,0.18)',
  },
  metaLine: { fontFamily: 'Menlo', fontSize: 10, color: 'rgba(255,255,255,0.55)', marginBottom: 2 },
  metaVal: { color: '#ffd369', fontWeight: '700' },
  perturbRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  perturbBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#121218',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  perturbBtnActive: { backgroundColor: '#ffd369', borderColor: '#ffd369' },
  perturbText: { fontFamily: 'Menlo', fontSize: 10, color: 'rgba(255,255,255,0.65)' },
  perturbTextActive: { color: '#0a0a0c', fontWeight: '800' },
  perturbHint: {
    fontFamily: 'Menlo', fontSize: 9, color: 'rgba(255,255,255,0.4)',
    marginBottom: 14,
  },
  resultBox: {
    borderRadius: 12, padding: 14, marginBottom: 14,
    borderWidth: 1,
  },
  resultPass: {
    backgroundColor: '#0d1f13',
    borderColor: 'rgba(74,222,128,0.6)',
  },
  resultFail: {
    backgroundColor: '#1f0d0d',
    borderColor: 'rgba(239,68,68,0.6)',
  },
  resultStatus: {
    fontFamily: 'Menlo', fontSize: 22, fontWeight: '800',
    letterSpacing: 2, textAlign: 'center',
  },
  statusPass: { color: '#4ade80' },
  statusFail: { color: '#ef4444' },
  resultMeta: {
    fontFamily: 'Menlo', fontSize: 10,
    color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 4,
  },
  mismatchList: {
    backgroundColor: '#121218', borderRadius: 12, padding: 10, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
  },
  mismatchRow: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  mismatchHead: { flexDirection: 'row', justifyContent: 'space-between' },
  mismatchIdx: {
    fontFamily: 'Menlo', fontSize: 10, fontWeight: '800', color: '#ef4444',
  },
  mismatchDiff: {
    fontFamily: 'Menlo', fontSize: 10, fontWeight: '700', color: '#ffd369',
  },
  mismatchPreview: {
    fontFamily: 'Menlo', fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2,
  },
  mismatchNums: {
    fontFamily: 'Menlo', fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2,
  },
  footerHint: {
    fontFamily: 'Menlo', fontSize: 9, color: 'rgba(255,255,255,0.35)',
    textAlign: 'center', lineHeight: 14,
  },
})
