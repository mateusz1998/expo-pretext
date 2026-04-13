import ExpoModulesCore
import UIKit
import CoreText
import OSLog

private let inkDebugLogger = Logger(subsystem: "ExpoPretext", category: "InkDebug")

// MARK: - Cache Entry

private struct CacheEntry {
  let width: Double
  var hits: Int
}

private struct InkBoundsValue {
  let left: Double
  let top: Double
  let right: Double
  let bottom: Double
  let width: Double
  let height: Double

  func dictionary() -> [String: Any] {
    return [
      "left": left,
      "top": top,
      "right": right,
      "bottom": bottom,
      "width": width,
      "height": height,
    ]
  }
}

private struct InkBoundsCacheEntry {
  let bounds: InkBoundsValue
  var hits: Int
}

private struct InkMeasurementDebugValue {
  let text: String
  let source: String
  let requestedFont: [String: Any]
  let resolvedFont: [String: Any]
  let typographic: [String: Any]
  let rasterContext: [String: Any]
  let rasterBounds: InkBoundsValue?
  let vectorBounds: InkBoundsValue?
  let advanceFallbackBounds: InkBoundsValue?
  let finalBounds: InkBoundsValue

  func dictionary() -> [String: Any] {
    return [
      "text": text,
      "source": source,
      "requestedFont": requestedFont,
      "resolvedFont": resolvedFont,
      "typographic": typographic,
      "rasterContext": rasterContext,
      "rasterBounds": rasterBounds?.dictionary() ?? NSNull(),
      "vectorBounds": vectorBounds?.dictionary() ?? NSNull(),
      "advanceFallbackBounds": advanceFallbackBounds?.dictionary() ?? NSNull(),
      "finalBounds": finalBounds.dictionary(),
    ]
  }
}

// MARK: - ExpoPretext Module

public class ExpoPretext: Module {

  // Font cache: "family_size_weight_style" -> UIFont
  private var fontCache: [String: UIFont] = [:]

  // Measure cache: fontKey -> (segmentText -> CacheEntry)
  private var measureCache: [String: [String: CacheEntry]] = [:]

  // Max segments per font before LRU eviction
  private var maxCacheSize: Int = 5000

  // MARK: - Module Definition

  public func definition() -> ModuleDefinition {
    Name("ExpoPretext")

    // Trim caches on memory warning
    OnAppEntersBackground {
      self.trimCaches(keepTop: 1000)
    }

    // Register for memory warning notifications
    OnStartObserving {
      NotificationCenter.default.addObserver(
        self,
        selector: #selector(self.handleMemoryWarning),
        name: UIApplication.didReceiveMemoryWarningNotification,
        object: nil
      )
    }

    OnStopObserving {
      NotificationCenter.default.removeObserver(
        self,
        name: UIApplication.didReceiveMemoryWarningNotification,
        object: nil
      )
    }

    // segmentAndMeasure(text, font, options?) -> { segments, isWordLike, widths }
    Function("segmentAndMeasure") { (text: String, fontDesc: [String: Any], options: [String: Any]?) -> [String: Any] in
      let font = self.resolveFont(fontDesc)
      let fontKey = self.fontKey(fontDesc)
      let whiteSpace = (options?["whiteSpace"] as? String) ?? "normal"
      let locale = options?["locale"] as? String
      return self.performSegmentAndMeasure(text: text, font: font, fontKey: fontKey, whiteSpace: whiteSpace, locale: locale)
    }

    // batchSegmentAndMeasure(texts, font, options?) -> [{ segments, isWordLike, widths }]
    Function("batchSegmentAndMeasure") { (texts: [String], fontDesc: [String: Any], options: [String: Any]?) -> [[String: Any]] in
      let font = self.resolveFont(fontDesc)
      let fontKey = self.fontKey(fontDesc)
      let whiteSpace = (options?["whiteSpace"] as? String) ?? "normal"
      let locale = options?["locale"] as? String
      return texts.map { text in
        self.performSegmentAndMeasure(text: text, font: font, fontKey: fontKey, whiteSpace: whiteSpace, locale: locale)
      }
    }

    // measureGraphemeWidths(segment, font) -> [Double]
    Function("measureGraphemeWidths") { (segment: String, fontDesc: [String: Any]) -> [Double] in
      let font = self.resolveFont(fontDesc)
      var widths: [Double] = []
      var index = segment.startIndex
      while index < segment.endIndex {
        let nextIndex = segment.index(after: index)
        // Walk to next grapheme cluster boundary
        let grapheme = String(segment[index..<nextIndex])
        let attrStr = NSAttributedString(string: grapheme, attributes: [.font: font])
        let ctLine = CTLineCreateWithAttributedString(attrStr)
        widths.append(Double(CTLineGetTypographicBounds(ctLine, nil, nil, nil)))
        index = nextIndex
      }
      return widths
    }

    // remeasureMerged(segments, font) -> [Double]
    Function("remeasureMerged") { (segments: [String], fontDesc: [String: Any]) -> [Double] in
      let font = self.resolveFont(fontDesc)
      return segments.map { segment in
        let attrStr = NSAttributedString(string: segment, attributes: [.font: font])
        let ctLine = CTLineCreateWithAttributedString(attrStr)
        return Double(CTLineGetTypographicBounds(ctLine, nil, nil, nil))
      }
    }

    // segmentAndMeasureAsync(text, font, options?) -> Promise<{ segments, isWordLike, widths }>
    AsyncFunction("segmentAndMeasureAsync") { (text: String, fontDesc: [String: Any], options: [String: Any]?, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        let font = self.resolveFont(fontDesc)
        let fontKey = self.fontKey(fontDesc)
        let whiteSpace = (options?["whiteSpace"] as? String) ?? "normal"
        let locale = options?["locale"] as? String
        let result = self.performSegmentAndMeasure(text: text, font: font, fontKey: fontKey, whiteSpace: whiteSpace, locale: locale)
        promise.resolve(result)
      }
    }

    // clearNativeCache() -> void
    Function("clearNativeCache") {
      self.fontCache.removeAll()
      self.measureCache.removeAll()
      self.inkResultCache.removeAll()
    }

    // setNativeCacheSize(size) -> void
    Function("setNativeCacheSize") { (size: Int) in
      self.maxCacheSize = max(size, 100) // floor at 100 to avoid thrashing
    }

    // measureInkWidth(text, font) -> { width, left }
    // Uses CTLineGetImageBounds with a real bitmap context for pixel-accurate
    // ink bounds. Returns width (full container size) and left (paddingLeft
    // needed to prevent left-side italic overshoot clipping).
    // Fixes RN #56349-class italic/bold-italic container clipping.
    Function("measureInkWidth") { (text: String, fontDesc: [String: Any]) -> Double in
      if text.isEmpty { return 0 }
      let font = self.resolveFont(fontDesc)
      let fontKey = self.fontKey(fontDesc)
      return self.cachedInkMeasure(segment: text, font: font, fontKey: fontKey).width
    }

    Function("measureInkBounds") { (text: String, fontDesc: [String: Any]) -> [String: Any] in
      if text.isEmpty {
        return [
          "left": 0.0,
          "top": 0.0,
          "right": 0.0,
          "bottom": 0.0,
          "width": 0.0,
          "height": 0.0,
        ]
      }
      let font = self.resolveFont(fontDesc)
      let fontKey = self.fontKey(fontDesc)
      return self.cachedInkMeasure(segment: text, font: font, fontKey: fontKey).dictionary()
    }

    // measureInkSafe(text, font) -> { inkBounds + advance + metrics }
    // Single-call API for getInkSafePadding() — one bridge crossing.
    Function("measureInkSafe") { (text: String, fontDesc: [String: Any]) -> [String: Any] in
      if text.isEmpty {
        return [
          "left": 0.0, "top": 0.0,
          "right": 0.0, "bottom": 0.0,
          "width": 0.0, "height": 0.0,
          "advance": 0.0,
          "ascender": 0.0, "descender": 0.0,
        ]
      }
      let font = self.resolveFont(fontDesc)
      let fontKey = self.fontKey(fontDesc)
      let bounds = self.cachedInkMeasure(segment: text, font: font, fontKey: fontKey)

      let attrStr = NSAttributedString(string: text, attributes: [.font: font])
      let ctLine = CTLineCreateWithAttributedString(attrStr)
      let advance = Double(CTLineGetTypographicBounds(ctLine, nil, nil, nil))

      return [
        "left": bounds.left,
        "top": bounds.top,
        "right": bounds.right,
        "bottom": bounds.bottom,
        "width": bounds.width,
        "height": bounds.height,
        "advance": advance,
        "ascender": Double(font.ascender),
        "descender": Double(font.descender),
      ]
    }

    Function("measureInkDebug") { (text: String, fontDesc: [String: Any]) -> [String: Any] in
      let font = self.resolveFont(fontDesc)
      return self.measureInkDebugValue(segment: text, font: font, requestedFontDesc: fontDesc).dictionary()
    }

    Function("logDebugMessage") { (message: String) in
      NSLog("[ExpoPretextInkDebug] %@", message)
      inkDebugLogger.notice("\(message, privacy: .public)")
      print("[ExpoPretextInkDebug] \(message)")
    }

    // getFontMetrics(font) -> { ascender, descender, xHeight, capHeight, lineGap }
    Function("getFontMetrics") { (fontDesc: [String: Any]) -> [String: Any] in
      let font = self.resolveFont(fontDesc)
      return [
        "ascender": Double(font.ascender),
        "descender": Double(font.descender),
        "xHeight": Double(font.xHeight),
        "capHeight": Double(font.capHeight),
        "lineGap": Double(font.leading),
      ]
    }

    // measureTextHeight(text, font, maxWidth, lineHeight) -> { height, lineCount }
    // Uses NSLayoutManager (TextKit) — same layout engine as RN Text
    Function("measureTextHeight") {
      (text: String, fontDesc: [String: Any], maxWidth: Double, lineHeight: Double) -> [String: Any] in
      let font = self.resolveFont(fontDesc)

      let textStorage = NSTextStorage(string: text, attributes: [
        .font: font,
        .paragraphStyle: {
          let ps = NSMutableParagraphStyle()
          ps.minimumLineHeight = CGFloat(lineHeight)
          ps.maximumLineHeight = CGFloat(lineHeight)
          return ps
        }()
      ])

      let layoutManager = NSLayoutManager()
      let textContainer = NSTextContainer(size: CGSize(
        width: CGFloat(maxWidth),
        height: CGFloat.greatestFiniteMagnitude
      ))
      textContainer.lineFragmentPadding = 0

      layoutManager.addTextContainer(textContainer)
      textStorage.addLayoutManager(layoutManager)

      // Force layout
      layoutManager.ensureLayout(for: textContainer)

      let usedRect = layoutManager.usedRect(for: textContainer)
      let glyphRange = layoutManager.glyphRange(for: textContainer)

      // Count lines
      var lineCount = 0
      var index = glyphRange.location
      while index < NSMaxRange(glyphRange) {
        var lineRange = NSRange()
        layoutManager.lineFragmentRect(forGlyphAt: index, effectiveRange: &lineRange)
        lineCount += 1
        index = NSMaxRange(lineRange)
      }

      return [
        "height": Double(ceil(usedRect.height)),
        "lineCount": lineCount
      ]
    }
  }

  // MARK: - Memory Warning

  @objc private func handleMemoryWarning() {
    trimCaches(keepTop: 200)
  }

  // MARK: - Cache Trimming

  /// Trim each font's measure cache to the top N entries by hit count.
  private func trimCaches(keepTop n: Int) {
    for fontKey in measureCache.keys {
      guard let entries = measureCache[fontKey], entries.count > n else { continue }
      let sorted = entries.sorted { $0.value.hits > $1.value.hits }
      var trimmed: [String: CacheEntry] = [:]
      trimmed.reserveCapacity(n)
      for (i, pair) in sorted.enumerated() {
        if i >= n { break }
        trimmed[pair.key] = pair.value
      }
      measureCache[fontKey] = trimmed
    }
    for fontKey in inkResultCache.keys {
      guard let entries = inkResultCache[fontKey], entries.count > n else { continue }
      let sorted = entries.sorted { $0.value.hits < $1.value.hits }
      for (i, key) in sorted.map({ $0.key }).enumerated() {
        if entries.count - i <= n { break }
        inkResultCache[fontKey]?.removeValue(forKey: key)
      }
    }
  }

  // MARK: - Ink-bounds measurement

  // Ink-bounds cache: fontKey -> (text -> (width, hits))
  private var inkResultCache: [String: [String: InkBoundsCacheEntry]] = [:]

  private func cachedInkMeasure(segment: String, font: UIFont, fontKey: String) -> InkBoundsValue {
    if var perFont = inkResultCache[fontKey], var entry = perFont[segment] {
      entry.hits += 1
      perFont[segment] = entry
      inkResultCache[fontKey] = perFont
      return entry.bounds
    }

    let measured = self.measureInkBoundsValue(segment: segment, font: font)

    var perFont = inkResultCache[fontKey] ?? [:]
    if perFont.count >= maxCacheSize {
      if let victim = perFont.min(by: { $0.value.hits < $1.value.hits })?.key {
        perFont.removeValue(forKey: victim)
      }
    }
    perFont[segment] = InkBoundsCacheEntry(bounds: measured, hits: 1)
    inkResultCache[fontKey] = perFont
    return measured
  }

  private func measureInkDebugValue(
    segment: String,
    font: UIFont,
    requestedFontDesc: [String: Any]
  ) -> InkMeasurementDebugValue {
    if segment.isEmpty {
      let emptyBounds = InkBoundsValue(left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0)
      return InkMeasurementDebugValue(
        text: segment,
        source: "empty",
        requestedFont: requestedFontDesc,
        resolvedFont: resolvedFontDictionary(font),
        typographic: [
          "advance": 0.0,
          "ascent": 0.0,
          "descent": 0.0,
          "leading": 0.0,
        ],
        rasterContext: [
          "padding": 0.0,
          "canvasWidth": 0.0,
          "canvasHeight": 0.0,
          "pixelWidth": 0,
          "pixelHeight": 0,
          "scale": 0.0,
          "originX": 0.0,
          "originY": 0.0,
          "contextCreated": false,
        ],
        rasterBounds: nil,
        vectorBounds: nil,
        advanceFallbackBounds: nil,
        finalBounds: emptyBounds
      )
    }

    let attrStr = NSAttributedString(string: segment, attributes: [.font: font])
    let ctLine = CTLineCreateWithAttributedString(attrStr)

    var ascent: CGFloat = 0
    var descent: CGFloat = 0
    var leading: CGFloat = 0
    let advance = Double(CTLineGetTypographicBounds(ctLine, &ascent, &descent, &leading))
    let padding = max(8.0, ceil(Double(font.pointSize)))
    let canvasWidth = max(1.0, ceil(advance + padding * 2.0 + Double(font.pointSize)))
    let canvasHeight = max(1.0, ceil(Double(ascent + descent + leading) + padding * 2.0 + 2.0))
    let scale = max(Double(UIScreen.main.scale), 1.0)
    let pixelWidth = max(Int(ceil(canvasWidth * scale)), 1)
    let pixelHeight = max(Int(ceil(canvasHeight * scale)), 1)
    let originX = CGFloat(padding)
    let originY = CGFloat(padding + Double(descent) + 1.0)
    let bitmapInfo = CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.premultipliedLast.rawValue

    var contextCreated = false
    var rasterBounds: InkBoundsValue? = nil

    if let context = CGContext(
      data: nil,
      width: pixelWidth,
      height: pixelHeight,
      bitsPerComponent: 8,
      bytesPerRow: 0,
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: bitmapInfo
    ) {
      contextCreated = true
      context.scaleBy(x: scale, y: scale)
      context.setAllowsAntialiasing(true)
      context.setShouldAntialias(true)
      context.setShouldSmoothFonts(true)
      context.setTextDrawingMode(.fill)
      context.setFillColor(UIColor.clear.cgColor)
      context.fill(CGRect(x: 0, y: 0, width: canvasWidth, height: canvasHeight))
      context.setFillColor(UIColor.black.cgColor)
      context.textMatrix = .identity
      context.textPosition = CGPoint(x: originX, y: originY)
      CTLineDraw(ctLine, context)

      rasterBounds = self.scanRasterInkBounds(
        context: context,
        pixelWidth: pixelWidth,
        pixelHeight: pixelHeight,
        scale: scale,
        originX: originX,
        originY: originY
      )
    }

    let vectorBounds = self.measureVectorInkBoundsValue(segment: segment, font: font)
    let advanceFallback = advance > 0 ? self.advanceFallbackBounds(advance: advance, font: font) : nil
    let finalBounds: InkBoundsValue
    let source: String

    if let rasterBounds {
      finalBounds = rasterBounds
      source = "raster"
    } else if contextCreated, let advanceFallback {
      finalBounds = advanceFallback
      source = "advance-fallback"
    } else {
      finalBounds = vectorBounds
      source = "vector-fallback"
    }

    return InkMeasurementDebugValue(
      text: segment,
      source: source,
      requestedFont: requestedFontDesc,
      resolvedFont: resolvedFontDictionary(font),
      typographic: [
        "advance": advance,
        "ascent": Double(ascent),
        "descent": Double(descent),
        "leading": Double(leading),
      ],
      rasterContext: [
        "padding": padding,
        "canvasWidth": canvasWidth,
        "canvasHeight": canvasHeight,
        "pixelWidth": pixelWidth,
        "pixelHeight": pixelHeight,
        "scale": scale,
        "originX": Double(originX),
        "originY": Double(originY),
        "contextCreated": contextCreated,
      ],
      rasterBounds: rasterBounds,
      vectorBounds: vectorBounds,
      advanceFallbackBounds: advanceFallback,
      finalBounds: finalBounds
    )
  }

  private func measureInkBoundsValue(segment: String, font: UIFont) -> InkBoundsValue {
    let attrStr = NSAttributedString(string: segment, attributes: [.font: font])
    let ctLine = CTLineCreateWithAttributedString(attrStr)

    var ascent: CGFloat = 0
    var descent: CGFloat = 0
    var leading: CGFloat = 0
    let advance = Double(CTLineGetTypographicBounds(ctLine, &ascent, &descent, &leading))
    let padding = max(8.0, ceil(Double(font.pointSize)))
    let canvasWidth = max(1.0, ceil(advance + padding * 2.0 + Double(font.pointSize)))
    let canvasHeight = max(1.0, ceil(Double(ascent + descent + leading) + padding * 2.0 + 2.0))
    let scale = max(Double(UIScreen.main.scale), 1.0)
    let pixelWidth = max(Int(ceil(canvasWidth * scale)), 1)
    let pixelHeight = max(Int(ceil(canvasHeight * scale)), 1)
    let bitmapInfo = CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.premultipliedLast.rawValue

    if let context = CGContext(
      data: nil,
      width: pixelWidth,
      height: pixelHeight,
      bitsPerComponent: 8,
      bytesPerRow: 0,
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: bitmapInfo
    ) {
      context.scaleBy(x: scale, y: scale)
      context.setAllowsAntialiasing(true)
      context.setShouldAntialias(true)
      context.setShouldSmoothFonts(true)
      context.setTextDrawingMode(.fill)
      context.setFillColor(UIColor.clear.cgColor)
      context.fill(CGRect(x: 0, y: 0, width: canvasWidth, height: canvasHeight))
      context.setFillColor(UIColor.black.cgColor)
      context.textMatrix = .identity

      let originX = CGFloat(padding)
      let originY = CGFloat(padding + Double(descent) + 1.0)
      context.textPosition = CGPoint(x: originX, y: originY)
      CTLineDraw(ctLine, context)

      if let rasterBounds = self.scanRasterInkBounds(
        context: context,
        pixelWidth: pixelWidth,
        pixelHeight: pixelHeight,
        scale: scale,
        originX: originX,
        originY: originY
      ) {
        return rasterBounds
      }

      if advance > 0 {
        return self.advanceFallbackBounds(advance: advance, font: font)
      }
    }

    return self.measureVectorInkBoundsValue(segment: segment, font: font)
  }

  private func advanceFallbackBounds(advance: Double, font: UIFont) -> InkBoundsValue {
    let top = floor(-Double(font.ascender))
    let bottom = ceil(Double(abs(font.descender)))
    let right = ceil(advance)
    return InkBoundsValue(
      left: 0,
      top: top,
      right: right,
      bottom: bottom,
      width: right,
      height: bottom - top
    )
  }

  private func scanRasterInkBounds(
    context: CGContext,
    pixelWidth: Int,
    pixelHeight: Int,
    scale: Double,
    originX: CGFloat,
    originY: CGFloat
  ) -> InkBoundsValue? {
    guard let data = context.data else { return nil }

    let bytesPerRow = context.bytesPerRow
    let byteCount = bytesPerRow * pixelHeight
    let pixels = data.bindMemory(to: UInt8.self, capacity: byteCount)

    var minX = pixelWidth
    var maxX = -1
    var minY = pixelHeight
    var maxY = -1

    for y in 0..<pixelHeight {
      let row = pixels.advanced(by: y * bytesPerRow)
      for x in 0..<pixelWidth {
        let alpha = row[x * 4 + 3]
        if alpha > 0 {
          minX = min(minX, x)
          maxX = max(maxX, x)
          minY = min(minY, y)
          maxY = max(maxY, y)
        }
      }
    }

    if maxX < 0 || maxY < 0 || minX >= pixelWidth || minY >= pixelHeight {
      return nil
    }

    let left = Double(minX) / scale - Double(originX)
    let right = Double(maxX + 1) / scale - Double(originX)
    let minRasterY = Double(minY) / scale
    let maxRasterY = Double(maxY + 1) / scale
    let top = floor(-(maxRasterY - Double(originY)))
    let bottom = ceil(-(minRasterY - Double(originY)))

    let flooredLeft = floor(left)
    let ceiledRight = ceil(right)
    return InkBoundsValue(
      left: flooredLeft,
      top: top,
      right: ceiledRight,
      bottom: bottom,
      width: ceiledRight - flooredLeft,
      height: bottom - top
    )
  }

  private func measureVectorInkBoundsValue(segment: String, font: UIFont) -> InkBoundsValue {
    let attrStr = NSAttributedString(string: segment, attributes: [.font: font])
    let ctLine = CTLineCreateWithAttributedString(attrStr)
    let runs = CTLineGetGlyphRuns(ctLine) as! [CTRun]

    var minX = Double.greatestFiniteMagnitude
    var minY = Double.greatestFiniteMagnitude
    var maxX = -Double.greatestFiniteMagnitude
    var maxY = -Double.greatestFiniteMagnitude
    var hasInk = false

    for run in runs {
      let runAttributes = CTRunGetAttributes(run) as NSDictionary
      let runFont = (runAttributes[kCTFontAttributeName] as! CTFont?) ?? (font as CTFont)
      let glyphCount = CTRunGetGlyphCount(run)
      if glyphCount == 0 { continue }

      var glyphs = Array(repeating: CGGlyph(), count: glyphCount)
      var positions = Array(repeating: CGPoint.zero, count: glyphCount)
      glyphs.withUnsafeMutableBufferPointer { glyphBuffer in
        CTRunGetGlyphs(run, CFRangeMake(0, 0), glyphBuffer.baseAddress!)
      }
      positions.withUnsafeMutableBufferPointer { positionBuffer in
        CTRunGetPositions(run, CFRangeMake(0, 0), positionBuffer.baseAddress!)
      }

      for i in 0..<glyphCount {
        if let path = CTFontCreatePathForGlyph(runFont, glyphs[i], nil) {
          let glyphBounds = path.boundingBox.offsetBy(dx: positions[i].x, dy: positions[i].y)
          if glyphBounds.isNull || glyphBounds.isEmpty { continue }
          hasInk = true
          minX = min(minX, Double(glyphBounds.minX))
          minY = min(minY, Double(glyphBounds.minY))
          maxX = max(maxX, Double(glyphBounds.maxX))
          maxY = max(maxY, Double(glyphBounds.maxY))
        }
      }
    }

    if !hasInk {
      let advance = Double(CTLineGetTypographicBounds(ctLine, nil, nil, nil))
      let top = floor(Double(-font.ascender))
      let bottom = ceil(Double(abs(font.descender)))
      let right = ceil(advance)
      return InkBoundsValue(
        left: 0,
        top: top,
        right: right,
        bottom: bottom,
        width: right,
        height: bottom - top
      )
    }

    let left = floor(minX)
    let top = floor(-maxY)
    let right = ceil(maxX)
    let bottom = ceil(-minY)
    return InkBoundsValue(
      left: left,
      top: top,
      right: right,
      bottom: bottom,
      width: right - left,
      height: bottom - top
    )
  }

  // MARK: - Font Resolution

  /// Build a cache key from a font descriptor dictionary.
  private func fontKey(_ desc: [String: Any]) -> String {
    let family = (desc["fontFamily"] as? String) ?? "System"
    let size = desc["fontSize"] as? Double ?? 14.0
    let weight = (desc["fontWeight"] as? String) ?? "400"
    let style = (desc["fontStyle"] as? String) ?? "normal"
    return "\(family)_\(size)_\(weight)_\(style)"
  }

  /// Resolve a font descriptor to a UIFont, using the font cache.
  private func resolveFont(_ desc: [String: Any]) -> UIFont {
    let key = fontKey(desc)
    if let cached = fontCache[key] {
      return cached
    }

    let family = (desc["fontFamily"] as? String) ?? "System"
    let size = CGFloat(desc["fontSize"] as? Double ?? 14.0)
    let weightStr = (desc["fontWeight"] as? String) ?? "400"
    let style = (desc["fontStyle"] as? String) ?? "normal"

    let uiWeight = mapFontWeight(weightStr)
    let wantsBold = self.isBoldWeight(weightStr)
    let wantsItalic = style == "italic"
    var font: UIFont

    if family == "System" || family == "system" {
      font = UIFont.systemFont(ofSize: size, weight: uiWeight)
    } else {
      if let exactFont = UIFont(name: family, size: size), self.fontMatchesRequest(exactFont, wantsBold: wantsBold, wantsItalic: wantsItalic) {
        font = exactFont
      } else if let familyVariant = self.resolveFamilyVariantFont(family: family, size: size, wantsBold: wantsBold, wantsItalic: wantsItalic) {
        font = familyVariant
      } else if let descriptorFont = UIFont(name: family, size: size) {
        font = self.applyCombinedSymbolicTraits(to: descriptorFont, wantsBold: wantsBold, wantsItalic: wantsItalic, size: size)
      } else {
        font = UIFont.systemFont(ofSize: size, weight: uiWeight)
      }
    }

    if !self.fontMatchesRequest(font, wantsBold: wantsBold, wantsItalic: wantsItalic) {
      font = self.applyCombinedSymbolicTraits(to: font, wantsBold: wantsBold, wantsItalic: wantsItalic, size: size)
    }

    fontCache[key] = font
    return font
  }

  private func resolveFamilyVariantFont(
    family: String,
    size: CGFloat,
    wantsBold: Bool,
    wantsItalic: Bool
  ) -> UIFont? {
    let familyMembers = UIFont.fontNames(forFamilyName: family)
    guard !familyMembers.isEmpty else { return nil }

    let sortedMembers = familyMembers.sorted {
      self.fontVariantScore(fontName: $0, wantsBold: wantsBold, wantsItalic: wantsItalic) >
        self.fontVariantScore(fontName: $1, wantsBold: wantsBold, wantsItalic: wantsItalic)
    }

    for member in sortedMembers {
      if let font = UIFont(name: member, size: size) {
        return font
      }
    }

    return nil
  }

  private func fontVariantScore(fontName: String, wantsBold: Bool, wantsItalic: Bool) -> Int {
    let lowercasedName = fontName.lowercased()
    let hasBold = lowercasedName.contains("bold") || lowercasedName.contains("semibold") || lowercasedName.contains("heavy") || lowercasedName.contains("black")
    let hasItalic = lowercasedName.contains("italic") || lowercasedName.contains("oblique")

    var score = 0
    if hasBold == wantsBold { score += 5 }
    if hasItalic == wantsItalic { score += 5 }
    if wantsBold && hasBold { score += 3 }
    if wantsItalic && hasItalic { score += 3 }
    if !wantsBold && !hasBold { score += 1 }
    if !wantsItalic && !hasItalic { score += 1 }
    return score
  }

  private func fontMatchesRequest(_ font: UIFont, wantsBold: Bool, wantsItalic: Bool) -> Bool {
    let traits = font.fontDescriptor.symbolicTraits
    let lowercasedName = font.fontName.lowercased()
    let hasBoldTrait = traits.contains(.traitBold) || lowercasedName.contains("bold") || lowercasedName.contains("semibold") || lowercasedName.contains("heavy") || lowercasedName.contains("black")
    let hasItalicTrait = traits.contains(.traitItalic) || lowercasedName.contains("italic") || lowercasedName.contains("oblique")

    return hasBoldTrait == wantsBold && hasItalicTrait == wantsItalic
  }

  private func applyCombinedSymbolicTraits(
    to font: UIFont,
    wantsBold: Bool,
    wantsItalic: Bool,
    size: CGFloat
  ) -> UIFont {
    var symbolicTraits = font.fontDescriptor.symbolicTraits
    if wantsBold {
      symbolicTraits.insert(.traitBold)
    }
    if wantsItalic {
      symbolicTraits.insert(.traitItalic)
    }

    guard let descriptor = font.fontDescriptor.withSymbolicTraits(symbolicTraits) else {
      return font
    }

    return UIFont(descriptor: descriptor, size: size)
  }

  private func isBoldWeight(_ weight: String) -> Bool {
    switch weight {
    case "bold", "600", "700", "800", "900":
      return true
    default:
      return (Int(weight) ?? 400) >= 600
    }
  }

  private func resolvedFontDictionary(_ font: UIFont) -> [String: Any] {
    return [
      "fontName": font.fontName,
      "familyName": font.familyName,
      "pointSize": Double(font.pointSize),
      "ascender": Double(font.ascender),
      "descender": Double(font.descender),
      "leading": Double(font.leading),
      "capHeight": Double(font.capHeight),
      "xHeight": Double(font.xHeight),
      "symbolicTraits": Int(font.fontDescriptor.symbolicTraits.rawValue),
    ]
  }

  /// Map CSS-style font weight string to UIFont.Weight.
  private func mapFontWeight(_ weight: String) -> UIFont.Weight {
    switch weight {
    case "100": return .ultraLight
    case "200": return .thin
    case "300": return .light
    case "400", "normal": return .regular
    case "500": return .medium
    case "600": return .semibold
    case "700", "bold": return .bold
    case "800": return .heavy
    case "900": return .black
    default: return .regular
    }
  }

  // MARK: - Segmentation & Measurement

  /// Core implementation: segment text and measure each segment's width.
  private func performSegmentAndMeasure(
    text: String,
    font: UIFont,
    fontKey: String,
    whiteSpace: String,
    locale: String?
  ) -> [String: Any] {
    if text.isEmpty {
      return [
        "segments": [String](),
        "isWordLike": [Bool](),
        "widths": [Double]()
      ]
    }

    let rawSegments = segmentText(text, whiteSpace: whiteSpace, locale: locale)

    var segments: [String] = []
    var isWordLike: [Bool] = []
    var widths: [Double] = []

    segments.reserveCapacity(rawSegments.count)
    isWordLike.reserveCapacity(rawSegments.count)
    widths.reserveCapacity(rawSegments.count)

    // Ensure font key has a cache bucket
    if measureCache[fontKey] == nil {
      measureCache[fontKey] = [:]
    }

    for segment in rawSegments {
      segments.append(segment)
      isWordLike.append(classifyWordLike(segment))

      // Check measurement cache
      if var entry = measureCache[fontKey]?[segment] {
        entry.hits += 1
        measureCache[fontKey]?[segment] = entry
        widths.append(entry.width)
      } else {
        // Measure the segment using CTLine (Core Text) — this is what
        // RN Text's underlying layout engine uses for glyph measurement
        let attrStr = NSAttributedString(string: segment, attributes: [.font: font])
        let ctLine = CTLineCreateWithAttributedString(attrStr)
        let width = Double(CTLineGetTypographicBounds(ctLine, nil, nil, nil))
        measureCache[fontKey]?[segment] = CacheEntry(width: width, hits: 1)
        widths.append(width)

        // Check if we need LRU eviction
        if let count = measureCache[fontKey]?.count, count > maxCacheSize {
          evictLRU(fontKey: fontKey)
        }
      }
    }

    return [
      "segments": segments,
      "isWordLike": isWordLike,
      "widths": widths
    ]
  }

  /// Segment text using CFStringTokenizer.
  /// In pre-wrap mode, whitespace characters are split into individual segments.
  /// In normal mode, whitespace runs are collapsed into a single space.
  private func segmentText(_ text: String, whiteSpace: String, locale: String?) -> [String] {
    let cfText = text as CFString
    let fullRange = CFRangeMake(0, CFStringGetLength(cfText))

    // Set up locale for tokenizer
    let cfLocale: CFLocale?
    if let locale = locale {
      let loc = Locale(identifier: locale)
      cfLocale = loc as CFLocale
    } else {
      cfLocale = CFLocaleCopyCurrent()
    }

    let tokenizer = CFStringTokenizerCreate(
      nil,
      cfText,
      fullRange,
      kCFStringTokenizerUnitWordBoundary,
      cfLocale
    )

    var segments: [String] = []
    let nsText = text as NSString
    var currentPos: CFIndex = 0
    let length = CFStringGetLength(cfText)

    // Walk through all tokens
    var tokenType = CFStringTokenizerAdvanceToNextToken(tokenizer)

    while currentPos < length {
      if tokenType != CFStringTokenizerTokenType(rawValue: 0) {
        let tokenRange = CFStringTokenizerGetCurrentTokenRange(tokenizer)

        // Handle any gap before this token (whitespace between tokens)
        if tokenRange.location > currentPos {
          let gapRange = NSRange(location: currentPos, length: tokenRange.location - currentPos)
          let gap = nsText.substring(with: gapRange)
          let whitespaceSegments = processWhitespace(gap, mode: whiteSpace)
          segments.append(contentsOf: whitespaceSegments)
        }

        // Add the token itself
        let tokenNSRange = NSRange(location: tokenRange.location, length: tokenRange.length)
        let token = nsText.substring(with: tokenNSRange)
        segments.append(token)

        currentPos = tokenRange.location + tokenRange.length
        tokenType = CFStringTokenizerAdvanceToNextToken(tokenizer)
      } else {
        // No more tokens; process remaining text as whitespace/trailing content
        let remainingRange = NSRange(location: currentPos, length: length - currentPos)
        let remaining = nsText.substring(with: remainingRange)
        let whitespaceSegments = processWhitespace(remaining, mode: whiteSpace)
        segments.append(contentsOf: whitespaceSegments)
        currentPos = length
      }
    }

    return segments
  }

  /// Process a whitespace (or non-token gap) string based on white-space mode.
  /// - normal: collapse runs of whitespace to a single space " ".
  /// - pre-wrap: split each whitespace character into its own segment.
  private func processWhitespace(_ gap: String, mode: String) -> [String] {
    if gap.isEmpty { return [] }

    if mode == "pre-wrap" {
      // Each character becomes its own segment
      return gap.map { String($0) }
    } else {
      // Normal mode: collapse any whitespace run to a single space
      // But if the gap contains no whitespace, return it as-is
      let trimmed = gap.replacingOccurrences(
        of: "\\s+",
        with: " ",
        options: .regularExpression
      )
      if trimmed.isEmpty { return [] }
      return [trimmed]
    }
  }

  /// Classify whether a segment is "word-like" (contains at least one alphanumeric/letter character).
  private func classifyWordLike(_ segment: String) -> Bool {
    for scalar in segment.unicodeScalars {
      if CharacterSet.alphanumerics.contains(scalar) {
        return true
      }
    }
    return false
  }

  // MARK: - LRU Eviction

  /// Evict the least-hit entries from a font's measure cache, keeping the top maxCacheSize * 0.8 entries.
  private func evictLRU(fontKey: String) {
    guard let entries = measureCache[fontKey] else { return }
    let keepCount = Int(Double(maxCacheSize) * 0.8)
    let sorted = entries.sorted { $0.value.hits > $1.value.hits }
    var trimmed: [String: CacheEntry] = [:]
    trimmed.reserveCapacity(keepCount)
    for (i, pair) in sorted.enumerated() {
      if i >= keepCount { break }
      trimmed[pair.key] = pair.value
    }
    measureCache[fontKey] = trimmed
  }
}
