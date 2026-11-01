import type { GeneratorDefinition } from '../types';
import type { EmitContext, InlineGenerator } from './types';

/**
 * Spectrum bars (スペクトラム・バー) — the classic analyser, ported from the
 * legacy `bars` scene. Reads the per-frame spectrum texture (`def.audio`), so
 * the bar heights are the real log-binned spectrum with the CPU-side
 * attack/release smoothing, and each bar carries a peak-hold cap.
 *
 * Layouts (legacy variants): bottom (grow up from the bottom edge) · center
 * (mirrored up/down from the horizon) · opposed (from the top and bottom edges
 * toward the middle) · sides (from the left and right edges toward the middle).
 *
 * Overlay-friendly: an idle (all-zero) spectrum draws nothing at all — a bar
 * is faded in over its first couple of pixels of height so a silent room does
 * not leave a hairline. Inside a bar the density runs from bright at the root
 * to dimmer at the tip, with a soft crown across the bar, so a material
 * downstream gets a gradient instead of a flat 1.0 slab.
 */
export const spectrumBarsDef: GeneratorDefinition = {
  id: 'spectrumBars',
  version: 1,
  category: 'source',
  costClass: 'light',
  impl: 'inline',
  output: 'field',
  tags: {
    material: ['spectrum', 'hard-edge', 'graphic'],
    motion: ['pulse', 'audio-reactive'],
    affect: ['electric', 'rhythmic', 'technical'],
    environment: ['club'],
  },
  parameters: [
    { id: 'count', label: 'Bars', kind: 'int', min: 16, max: 128, default: 64, modulatable: false },
    {
      id: 'gap',
      label: 'Gap',
      kind: 'number',
      min: 0.05,
      max: 0.6,
      default: 0.22,
      modulatable: true,
    },
    {
      id: 'height',
      label: 'Height',
      kind: 'number',
      min: 0.25,
      max: 1,
      default: 0.72,
      modulatable: true,
    },
    {
      id: 'caps',
      label: 'Peak caps',
      kind: 'number',
      min: 0,
      max: 1,
      default: 0.9,
      modulatable: true,
    },
    {
      id: 'layout',
      label: 'Layout',
      kind: 'enum',
      options: ['bottom', 'center', 'opposed', 'sides'],
      default: 'bottom',
      modulatable: false,
    },
  ],
  cost: { passes: 0, relativeFill: 0.3, stateful: false },
  audio: ['spectrum'],
};

export const spectrumBarsGenerator: InlineGenerator = {
  def: spectrumBarsDef,
  emit(ctx: EmitContext): string {
    const { fnName, uniform } = ctx;
    const uCount = uniform('count');
    const uGap = uniform('gap');
    const uHeight = uniform('height');
    const uCaps = uniform('caps');
    const uLayout = uniform('layout');
    return /* glsl */ `
// spectrumBars source: log-binned spectrum bars with peak-hold caps
float ${fnName}(vec2 p) {
  int n = clamp(${uCount}, 16, 128);
  float gap = clamp(${uGap}, 0.05, 0.6);
  float hmax = clamp(${uHeight}, 0.25, 1.0);
  float caps = clamp(${uCaps}, 0.0, 1.0);
  int lay = clamp(${uLayout}, 0, 3);
  float aspect = max(uRes.x / max(uRes.y, 1.0), 0.1);
  // derivatives in uniform control flow, before any early return
  float px = clamp(max(fwidth(p.x), fwidth(p.y)), 1e-4, 0.05);

  bool sides = lay == 3;
  float halfAcross = sides ? 0.5 : 0.5 * aspect;
  float across = sides ? p.y : p.x;
  float u = across / (2.0 * halfAcross) + 0.5;
  if (u <= 0.0 || u >= 1.0) return 0.0;

  float nf = float(n);
  float cell = u * nf;
  float idx = floor(cell);
  float f = cell - idx;
  float x = (idx + 0.5) / nf;
  float s = spectrumAt(x);
  float pk = max(spectrumPeakAt(x), s);

  // across the bar: AA'd slab, gap on both sides
  float cellW = 2.0 * halfAcross / nf;
  float halfBar = 0.5 * (1.0 - gap);
  float dAcross = (abs(f - 0.5) - halfBar) * cellW;
  float inBar = 1.0 - smoothstep(-0.5 * px, 0.5 * px, dAcross);
  float crown = 1.0 - 0.25 * clamp(abs(f - 0.5) / max(halfBar, 1e-3), 0.0, 1.0);

  // along the bar: distance from the root, and the full length for this layout
  float along;
  float full;
  if (lay == 0) {
    along = p.y + 0.5;
    full = hmax;
  } else if (lay == 1) {
    along = abs(p.y);
    full = 0.5 * hmax;
  } else if (lay == 2) {
    along = 0.5 - abs(p.y);
    full = 0.5 * hmax;
  } else {
    along = 0.5 * aspect - abs(p.x);
    full = 0.5 * aspect * hmax;
  }
  float len = s * full;
  float lenPk = pk * full;

  float body = (1.0 - smoothstep(len - 0.5 * px, len + 0.5 * px, along)) * step(0.0, along);
  // fade a bar in over its first pixels of height: silence draws nothing
  body *= smoothstep(0.0, 2.5 * px, len);
  float tip = clamp(along / max(len, 1e-4), 0.0, 1.0);
  float bodyV = body * mix(0.92, 0.55, tip) * crown;

  // peak cap: a thin bright line at the held peak, only once the peak is visible
  float capTh = max(0.0035, 1.2 * px);
  float capD = abs(along - lenPk - 0.5 * capTh) - 0.5 * capTh;
  float cap = (1.0 - smoothstep(0.0, px, capD)) * caps * smoothstep(0.004, 0.02, lenPk);

  return clamp(max(bodyV, cap) * inBar, 0.0, 1.0);
}
`.trim();
  },
};
