// src/ExpoPretext.ts
// JS binding to the native Expo module.
// All native calls go through this file.

import { NativeModule, requireNativeModule } from 'expo-modules-core'
import type { FontDescriptor, NativeSegmentResult } from './types'

type MeasureNativeOptions = {
  whiteSpace?: string
  locale?: string
}

interface ExpoPretextNativeModule extends InstanceType<typeof NativeModule> {
  segmentAndMeasure(
    text: string,
    font: FontDescriptor,
    options?: MeasureNativeOptions
  ): NativeSegmentResult

  batchSegmentAndMeasure(
    texts: string[],
    font: FontDescriptor,
    options?: MeasureNativeOptions
  ): NativeSegmentResult[]

  measureGraphemeWidths(
    segment: string,
    font: FontDescriptor
  ): number[]

  remeasureMerged(
    segments: string[],
    font: FontDescriptor
  ): number[]

  segmentAndMeasureAsync(
    text: string,
    font: FontDescriptor,
    options?: MeasureNativeOptions
  ): Promise<NativeSegmentResult>

  measureTextHeight(
    text: string,
    font: FontDescriptor,
    maxWidth: number,
    lineHeight: number
  ): { height: number; lineCount: number }

  clearNativeCache(): void

  setNativeCacheSize(size: number): void
}

let nativeModule: ExpoPretextNativeModule | null = null

export function getNativeModule(): ExpoPretextNativeModule | null {
  if (nativeModule !== null) return nativeModule
  try {
    nativeModule = requireNativeModule<ExpoPretextNativeModule>('ExpoPretext')
    return nativeModule
  } catch {
    if (__DEV__) {
      console.warn(
        '[expo-pretext] Native module not available. ' +
        'Using JS estimates. Use a development build for accurate measurements.'
      )
    }
    return null
  }
}
