import { describe, expect, it } from 'vitest';
import {
  distanceTransform2d,
  packTextTexture,
  rasterizeText,
  requestTextRaster,
  signedDistanceField,
  splitLines,
  textSpecKey,
  type GlyphBox,
} from './texts';

const INF = 1e20;

/** Brute-force squared distance to the nearest seed (value 0). */
function bruteForce(seeds: boolean[], w: number, h: number): number[] {
  const out: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let best = Infinity;
      for (let sy = 0; sy < h; sy++) {
        for (let sx = 0; sx < w; sx++) {
          if (!seeds[sy * w + sx]) continue;
          best = Math.min(best, (sx - x) ** 2 + (sy - y) ** 2);
        }
      }
      out.push(best);
    }
  }
  return out;
}

describe('synth/texts distance transform', () => {
  it('matches brute force on a single seed', () => {
    const w = 7;
    const h = 5;
    const seeds = Array.from({ length: w * h }, (_, i) => i === 2 * w + 3);
    const grid = new Float64Array(seeds.map((s) => (s ? 0 : INF)));
    distanceTransform2d(grid, w, h);
    expect(Array.from(grid)).toEqual(bruteForce(seeds, w, h));
  });

  it('matches brute force on scattered seeds (non-square grid)', () => {
    const w = 11;
    const h = 6;
    // Deterministic pseudo-random scatter.
    const seeds = Array.from({ length: w * h }, (_, i) => (i * 37 + 11) % 13 === 0);
    expect(seeds.some(Boolean)).toBe(true);
    const grid = new Float64Array(seeds.map((s) => (s ? 0 : INF)));
    distanceTransform2d(grid, w, h);
    expect(Array.from(grid)).toEqual(bruteForce(seeds, w, h));
  });

  it('signed field is positive inside, negative outside, symmetric for a square', () => {
    // 9×9 with a solid 3×3 square in the middle (cols/rows 3..5).
    const n = 9;
    const alpha = new Uint8Array(n * n);
    for (let y = 3; y <= 5; y++) for (let x = 3; x <= 5; x++) alpha[y * n + x] = 255;
    const sdf = signedDistanceField(alpha, n, n);
    const at = (x: number, y: number): number => sdf[y * n + x]!;
    // Centre is 2 px from the nearest outside pixel; edge pixels are 1 px in.
    expect(at(4, 4)).toBeCloseTo(2);
    expect(at(3, 4)).toBeCloseTo(1);
    // Just outside: 1 px from the nearest inside pixel.
    expect(at(2, 4)).toBeCloseTo(-1);
    expect(at(0, 4)).toBeCloseTo(-3);
    // Diagonal corner distance.
    expect(at(1, 1)).toBeCloseTo(-Math.hypot(2, 2));
    // 4-fold symmetry.
    expect(at(2, 4)).toBeCloseTo(at(6, 4));
    expect(at(4, 2)).toBeCloseTo(at(4, 6));
  });

  it('an anti-aliased edge pixel lands between the two sides', () => {
    const w = 5;
    const alpha = new Uint8Array([255, 255, 128, 0, 0]);
    const sdf = signedDistanceField(alpha, w, 1);
    // Half-covered pixel sits on (almost exactly) the outline.
    expect(Math.abs(sdf[2]!)).toBeLessThan(0.05);
    expect(sdf[1]!).toBeGreaterThan(0);
    expect(sdf[3]!).toBeLessThan(0);
  });
});

describe('synth/texts packTextTexture', () => {
  // 8×4 raster: two 4-px-wide glyph boxes on one line; glyph 0 is solid in
  // the top two rows only.
  const w = 8;
  const h = 4;
  const alpha = new Uint8Array(w * h);
  for (let y = 0; y < 2; y++) for (let x = 0; x < 4; x++) alpha[y * w + x] = 255;
  const glyphs: GlyphBox[] = [
    { index: 0, line: 0, x0: 0, x1: 4, y0: 0, y1: 4 },
    { index: 1, line: 0, x0: 4, x1: 8, y0: 0, y1: 4 },
  ];
  const data = packTextTexture(alpha, w, h, glyphs, 2, 2);
  /** Texel at canvas (top-row-first) coords. Output is bottom-row-first. */
  const texel = (x: number, y: number): number[] =>
    Array.from(data.slice(((h - 1 - y) * w + x) * 4, ((h - 1 - y) * w + x) * 4 + 4));

  it('is bottom-row-first (the images.ts orientation contract)', () => {
    // Canvas row 0 is inside the glyph → it must be the LAST row of the buffer.
    expect(texel(1, 0)[0]!).toBeGreaterThan(128);
    expect(data[(3 * w + 1) * 4]!).toBeGreaterThan(128);
    expect(data[1 * 4]!).toBeLessThan(128);
  });

  it('R is 0.5 + d / (2 · spread), clamped', () => {
    // canvas (1,3): 2 px below the glyph → d = -2 → 0.5 - 2/4 = 0.
    expect(texel(1, 3)[0]).toBe(0);
    // canvas (1,1): 1 px inside → 0.5 + 1/4 = 0.75.
    expect(texel(1, 1)[0]).toBe(Math.round(0.75 * 255));
  });

  it('G carries glyph index / count, B the position inside the glyph box, A = 1', () => {
    expect(texel(0, 0)[1]).toBe(0);
    expect(texel(5, 0)[1]).toBe(Math.round(0.5 * 255));
    expect(texel(0, 2)[2]).toBe(Math.round((0.5 / 4) * 255));
    expect(texel(7, 2)[2]).toBe(Math.round((3.5 / 4) * 255));
    for (let i = 3; i < data.length; i += 4) expect(data[i]).toBe(255);
  });

  it('pixels outside every box take the nearest line', () => {
    const tall = 10;
    const a = new Uint8Array(w * tall);
    const boxes: GlyphBox[] = [
      { index: 0, line: 0, x0: 0, x1: 4, y0: 0, y1: 3 },
      { index: 1, line: 1, x0: 0, x1: 8, y0: 6, y1: 9 },
    ];
    const d = packTextTexture(a, w, tall, boxes, 2, 2);
    const g = (x: number, y: number): number => d[((tall - 1 - y) * w + x) * 4 + 1]!;
    // Right of line 0's only glyph → still glyph 0.
    expect(g(7, 1)).toBe(0);
    // Below the last line → glyph 1.
    expect(g(2, 9)).toBe(Math.round(0.5 * 255));
  });
});

describe('synth/texts runtime glue (no canvas under Node)', () => {
  const spec = { text: 'HELLO', font: 'sans-serif', weight: 700 };

  it('rasterizeText degrades to null instead of throwing', () => {
    expect(rasterizeText(spec)).toBeNull();
    expect(rasterizeText({ ...spec, text: '   ' })).toBeNull();
  });

  it('requestTextRaster returns null (the scene draws its dummy) and never throws', async () => {
    expect(requestTextRaster(spec)).toBeNull();
    await new Promise((r) => setTimeout(r, 0));
    expect(requestTextRaster(spec)).toBeNull();
  });

  it('textSpecKey is stable across key order and distinguishes every field', () => {
    expect(textSpecKey({ weight: 700, font: 'sans-serif', text: 'HELLO' })).toBe(textSpecKey(spec));
    expect(textSpecKey({ ...spec, text: 'HELL0' })).not.toBe(textSpecKey(spec));
    expect(textSpecKey({ ...spec, font: 'serif' })).not.toBe(textSpecKey(spec));
    expect(textSpecKey({ ...spec, weight: 400 })).not.toBe(textSpecKey(spec));
  });

  it('splitLines handles \\n, \\r\\n and \\r', () => {
    expect(splitLines('A\nB\r\nC\rD')).toEqual(['A', 'B', 'C', 'D']);
  });
});
