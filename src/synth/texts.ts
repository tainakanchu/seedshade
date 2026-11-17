/**
 * Text rasterizer — the pixels behind a Patch's `texts` entries.
 *
 * A {@link TextSpec} (string + font-family + weight) is drawn with Canvas2D and
 * turned into a signed distance field on the CPU (Felzenszwalb's 1D squared
 * distance transform, run over columns then rows, for the inside and the
 * outside). The type nodes (generators/type*.ts) read that field, so the
 * glyphs stay crisp at any zoom and can be thickened / thinned / outlined /
 * blurred in the shader without touching the CPU again.
 *
 * TEXTURE CONTRACT (RGBA8, one texel per raster pixel):
 * - R: signed distance. 0.5 is the outline, > 0.5 inside the glyphs.
 *   R = 0.5 + d / (2 · spread), clamped, where d is the distance in pixels
 *   (positive inside) and spread = {@link SDF_SPREAD_EM} × the font size in
 *   pixels — i.e. the field is normalized in em, so a weight offset in the
 *   shader means the same thing for a 3-letter word and a 200-letter line.
 * - G: glyph index / glyph count (newlines excluded), over the glyph's
 *   advance box. Pixels outside every box take the nearest box on the nearest
 *   non-empty line, so the inside and the outline neighbourhood of a glyph
 *   always carry that glyph's index.
 * - B: horizontal position inside the glyph's advance box, 0..1.
 * - A: 1 everywhere (the unassigned slot is the scene's transparent dummy,
 *   whose A = 0 — that is how the shaders tell "no text" apart).
 *
 * ORIENTATION CONTRACT: same as ./images.ts — rows come out bottom-row-first,
 * so t = 0 is the bottom of the text and uploaders never touch
 * UNPACK_FLIP_Y_WEBGL.
 *
 * Everything degrades instead of throwing: with no OffscreenCanvas and no
 * document (Node tests) {@link rasterizeText} returns null and the scene binds
 * its dummy. An empty / whitespace-only string is also null (= "no text").
 */
import type { TextSpec } from './types';

/** setText / UI で font を省いたときの既定。CJK も出るよう日本語ゴシックを先に並べる。 */
export const DEFAULT_TEXT_FONT =
  '"Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", system-ui, sans-serif';
/** setText / UI で weight を省いたときの既定。 */
export const DEFAULT_TEXT_WEIGHT = 700;

/** Long edge, in px, the raster is fitted to. */
export const TEXT_RASTER_LONG_EDGE = 1024;
/** Font size the layout is measured at before fitting to the long edge. */
export const TEXT_NOMINAL_FONT_PX = 160;
/** Bounds on the fitted font size (a 200-letter single line ends up near the floor). */
export const TEXT_MIN_FONT_PX = 8;
export const TEXT_MAX_FONT_PX = 384;
/** Line advance, in em. */
export const TEXT_LINE_HEIGHT_EM = 1.25;
/**
 * Half-width of the distance band, in em: R reaches 1 this far inside the
 * outline and 0 this far outside. Shaders assume this normalization.
 */
export const SDF_SPREAD_EM = 0.25;
/** Most rasters kept around (LRU). Each is up to 1024² × 4 bytes. */
export const TEXT_CACHE_MAX = 24;

const INF = 1e20;

/** RGBA8 SDF texture for one TextSpec, bottom-row-first. */
export interface TextRaster {
  width: number;
  height: number;
  data: Uint8Array;
  /** Glyphs counted for the G channel (newlines excluded). */
  glyphCount: number;
}

/** Advance box of one glyph, in raster pixels (top-row-first, like the canvas). */
export interface GlyphBox {
  index: number;
  line: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Cache key for a spec. JSON of the three fields in a fixed order. */
export function textSpecKey(spec: TextSpec): string {
  return JSON.stringify({ text: spec.text, font: spec.font, weight: spec.weight });
}

/** CSS font shorthand for canvas. */
export function cssFont(spec: TextSpec, px: number): string {
  return `${Math.round(spec.weight)} ${px}px ${spec.font}`;
}

/** Split into lines; `\r\n` / `\r` count as newlines too. */
export function splitLines(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').split('\n');
}

// ---------------------------------------------------------------------------
// Distance transform (pure)
// ---------------------------------------------------------------------------

/**
 * Felzenszwalb & Huttenlocher 1D squared distance transform, in place over a
 * strided slice of `grid`. `f`, `d`, `v`, `z` are scratch buffers of at least
 * `n` (`z`: n + 1) entries.
 */
function edt1d(
  grid: Float64Array,
  offset: number,
  stride: number,
  n: number,
  f: Float64Array,
  d: Float64Array,
  v: Int32Array,
  z: Float64Array,
): void {
  for (let q = 0; q < n; q++) f[q] = grid[offset + q * stride]!;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  let k = 0;
  for (let q = 1; q < n; q++) {
    let r = v[k]!;
    let s = (f[q]! + q * q - (f[r]! + r * r)) / (2 * q - 2 * r);
    while (s <= z[k]!) {
      k--;
      r = v[k]!;
      s = (f[q]! + q * q - (f[r]! + r * r)) / (2 * q - 2 * r);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1]! < q) k++;
    const r = v[k]!;
    d[q] = (q - r) * (q - r) + f[r]!;
  }
  for (let q = 0; q < n; q++) grid[offset + q * stride] = d[q]!;
}

/**
 * 2D squared Euclidean distance transform, in place. On input each cell holds
 * 0 (a seed), INF (not a seed) or a small squared sub-pixel offset; on output
 * each cell holds the squared distance to the nearest seed.
 */
export function distanceTransform2d(grid: Float64Array, width: number, height: number): void {
  const n = Math.max(width, height);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < width; x++) edt1d(grid, x, width, height, f, d, v, z);
  for (let y = 0; y < height; y++) edt1d(grid, y * width, 1, width, f, d, v, z);
}

/**
 * Signed distance (pixels, positive inside) from an 8-bit coverage mask,
 * top-row-first. Anti-aliased edge pixels seed both transforms with a
 * sub-pixel offset (the TinySDF trick), so the outline lands between pixels
 * instead of snapping to them.
 */
export function signedDistanceField(
  alpha: ArrayLike<number>,
  width: number,
  height: number,
): Float32Array {
  const size = width * height;
  const outer = new Float64Array(size); // distance to the inside
  const inner = new Float64Array(size); // distance to the outside
  for (let i = 0; i < size; i++) {
    const a = alpha[i]! / 255;
    if (a >= 1) {
      outer[i] = 0;
      inner[i] = INF;
    } else if (a <= 0) {
      outer[i] = INF;
      inner[i] = 0;
    } else {
      const o = Math.max(0, 0.5 - a);
      const n = Math.max(0, a - 0.5);
      outer[i] = o * o;
      inner[i] = n * n;
    }
  }
  distanceTransform2d(outer, width, height);
  distanceTransform2d(inner, width, height);
  const out = new Float32Array(size);
  for (let i = 0; i < size; i++) out[i] = Math.sqrt(inner[i]!) - Math.sqrt(outer[i]!);
  return out;
}

function toByte(x: number): number {
  return Math.max(0, Math.min(255, Math.round(x * 255)));
}

/**
 * Pack a coverage mask + glyph boxes into the RGBA8 texture described at the
 * top of this file (bottom-row-first). Pure: no canvas involved, so it is
 * what the unit tests drive.
 */
export function packTextTexture(
  alpha: ArrayLike<number>,
  width: number,
  height: number,
  glyphs: readonly GlyphBox[],
  glyphCount: number,
  spreadPx: number,
): Uint8Array {
  const sdf = signedDistanceField(alpha, width, height);
  const data = new Uint8Array(width * height * 4);
  const spread = Math.max(spreadPx, 1e-3);

  // Glyph boxes per line (x-sorted), and for each row the line it belongs to.
  const lines = new Map<number, GlyphBox[]>();
  for (const g of glyphs) {
    const arr = lines.get(g.line) ?? [];
    arr.push(g);
    lines.set(g.line, arr);
  }
  for (const arr of lines.values()) arr.sort((a, b) => a.x0 - b.x0);
  const lineRows = [...lines.values()].map((arr) => ({
    boxes: arr,
    y0: Math.min(...arr.map((g) => g.y0)),
    y1: Math.max(...arr.map((g) => g.y1)),
  }));

  const count = Math.max(glyphCount, 1);
  for (let y = 0; y < height; y++) {
    const cy = y + 0.5;
    // Nearest non-empty line to this row.
    let line: (typeof lineRows)[number] | undefined;
    let best = Infinity;
    for (const l of lineRows) {
      const dist = cy < l.y0 ? l.y0 - cy : cy > l.y1 ? cy - l.y1 : 0;
      if (dist < best) {
        best = dist;
        line = l;
      }
    }
    // Output row: bottom-row-first.
    const outRow = (height - 1 - y) * width;
    let gi = 0;
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const o = (outRow + x) * 4;
      data[o] = toByte(0.5 + sdf[i]! / (2 * spread));
      let g = 0;
      let b = 0;
      if (line) {
        const boxes = line.boxes;
        const cx = x + 0.5;
        // x only grows along the row, so the matching box only moves right.
        while (gi < boxes.length - 1 && cx >= boxes[gi]!.x1) gi++;
        const box = boxes[gi]!;
        g = box.index / count;
        const w = box.x1 - box.x0;
        b = w > 0 ? Math.max(0, Math.min(1, (cx - box.x0) / w)) : 0;
      }
      data[o + 1] = toByte(g);
      data[o + 2] = toByte(b);
      data[o + 3] = 255;
    }
  }
  return data;
}

// ---------------------------------------------------------------------------
// Canvas glue
// ---------------------------------------------------------------------------

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

interface Surface {
  ctx: Ctx2D;
  resize(w: number, h: number): void;
}

/** OffscreenCanvas first, then a detached document canvas, else null. */
function createSurface(): Surface | null {
  try {
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(1, 1);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        return {
          ctx,
          resize(w, h) {
            canvas.width = w;
            canvas.height = h;
          },
        };
      }
    }
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        return {
          ctx,
          resize(w, h) {
            canvas.width = w;
            canvas.height = h;
          },
        };
      }
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * Draw a spec and build its SDF texture, synchronously. Null when there is no
 * canvas to draw with or nothing to draw. Not cached — use
 * {@link requestTextRaster} at runtime.
 */
export function rasterizeText(spec: TextSpec): TextRaster | null {
  if (spec.text.trim() === '') return null;
  const surface = createSurface();
  if (!surface) return null;
  const { ctx } = surface;

  const lines = splitLines(spec.text).map((l) => Array.from(l));
  // Measure at the nominal size, then fit the whole block to the long edge.
  const nominal = TEXT_NOMINAL_FONT_PX;
  ctx.font = cssFont(spec, nominal);
  const nominalWidth = Math.max(1, ...lines.map((chars) => ctx.measureText(chars.join('')).width));
  const nominalHeight = lines.length * nominal * TEXT_LINE_HEIGHT_EM;
  const nominalPad = nominal * (SDF_SPREAD_EM + 0.1);
  const longest = Math.max(nominalWidth, nominalHeight) + 2 * nominalPad;
  const fontPx = Math.max(
    TEXT_MIN_FONT_PX,
    Math.min(TEXT_MAX_FONT_PX, Math.floor(nominal * (TEXT_RASTER_LONG_EDGE / longest))),
  );

  const spreadPx = fontPx * SDF_SPREAD_EM;
  const pad = Math.ceil(fontPx * (SDF_SPREAD_EM + 0.1));
  const lineH = fontPx * TEXT_LINE_HEIGHT_EM;
  ctx.font = cssFont(spec, fontPx);
  const lineWidths = lines.map((chars) => ctx.measureText(chars.join('')).width);
  const width = Math.min(
    TEXT_RASTER_LONG_EDGE * 2,
    Math.max(1, Math.ceil(Math.max(1, ...lineWidths) + 2 * pad)),
  );
  const height = Math.min(
    TEXT_RASTER_LONG_EDGE * 2,
    Math.max(1, Math.ceil(lines.length * lineH + 2 * pad)),
  );

  surface.resize(width, height);
  // Resizing resets the context state.
  ctx.font = cssFont(spec, fontPx);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.clearRect(0, 0, width, height);

  const glyphs: GlyphBox[] = [];
  let index = 0;
  lines.forEach((chars, li) => {
    const lineW = lineWidths[li] ?? 0;
    const x0 = (width - lineW) / 2;
    const y0 = pad + li * lineH;
    ctx.fillText(chars.join(''), x0, y0 + lineH / 2);
    let prefix = '';
    let prev = 0;
    for (const ch of chars) {
      prefix += ch;
      const next = ctx.measureText(prefix).width;
      glyphs.push({ index, line: li, x0: x0 + prev, x1: x0 + next, y0, y1: y0 + lineH });
      prev = next;
      index++;
    }
  });

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, width, height).data;
  } catch {
    return null;
  }
  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = pixels[i * 4 + 3]!;

  return {
    width,
    height,
    data: packTextTexture(alpha, width, height, glyphs, index, spreadPx),
    glyphCount: index,
  };
}

// ---------------------------------------------------------------------------
// Runtime cache
// ---------------------------------------------------------------------------

/** key → raster (null = cannot / nothing to rasterize). Map order = LRU order. */
const cache = new Map<string, TextRaster | null>();
const pending = new Set<string>();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of Array.from(listeners)) {
    try {
      listener();
    } catch (e) {
      console.error('[vj-texts] listener threw:', e);
    }
  }
}

/** ラスタ完成の購読（シーンの再バインド用）。unsubscribe を返す。 */
export function subscribeTexts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Wait for the font (if the platform can tell us), never throwing. */
async function loadFont(spec: TextSpec): Promise<void> {
  const fonts = (globalThis as { document?: { fonts?: FontFaceSet } }).document?.fonts;
  if (!fonts || typeof fonts.load !== 'function') return;
  try {
    await fonts.load(cssFont(spec, TEXT_NOMINAL_FONT_PX), spec.text || 'A');
  } catch {
    // An unknown family still draws with the fallback font.
  }
}

function remember(key: string, raster: TextRaster | null): void {
  cache.delete(key);
  cache.set(key, raster);
  while (cache.size > TEXT_CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/**
 * The raster for a spec, or null while it is not ready (or cannot be made).
 *
 * The first call for a spec waits for its font, rasterizes and notifies
 * {@link subscribeTexts}; until then the caller should draw its dummy.
 * Identical specs share one raster (key = {@link textSpecKey}).
 */
export function requestTextRaster(spec: TextSpec): TextRaster | null {
  const key = textSpecKey(spec);
  if (cache.has(key)) {
    const hit = cache.get(key) ?? null;
    remember(key, hit); // bump LRU
    return hit;
  }
  if (pending.has(key)) return null;
  pending.add(key);
  void loadFont(spec).then(() => {
    pending.delete(key);
    let raster: TextRaster | null = null;
    try {
      raster = rasterizeText(spec);
    } catch (e) {
      console.warn('[vj-texts] rasterize failed:', e);
    }
    remember(key, raster);
    notify();
  });
  return null;
}

/** Test hook: drop every cached raster. */
export function clearTextRasterCache(): void {
  cache.clear();
  pending.clear();
}
