import type { GeneratorDefinition } from '../types';
import type { EmitContext, InlineGenerator } from './types';

/**
 * Radial spectrum (円形スペクトラム) — the legacy `radial` scene: the spectrum
 * wrapped around a circle as spikes, ported onto the spectrum texture.
 *
 * The spectrum is mirrored inside each of `symmetry` sectors (low band at the
 * sector centre, high at its edges), so the ring is seamless at any symmetry —
 * the legacy scene repeated it unmirrored and showed a jump at every sector
 * boundary. The whole figure turns on the energy-driven clock (`spin`), and
 * the base radius breathes with bass / beat.
 *
 * Styles (legacy variants): spikes · blob (a filled closed curve r = R(θ) with
 * a rim) · twin (outer spikes outward + inner spikes inward, counter-rotating).
 * Nested polygons (legacy variant 2) are left to `beatRings` (polygon shape).
 *
 * Zero-length spikes are faded out, so an idle spectrum draws nothing for
 * spikes / twin; blob keeps a faint base ring (that *is* its idle look).
 */
export const spectrumRadialDef: GeneratorDefinition = {
  id: 'spectrumRadial',
  version: 1,
  category: 'source',
  costClass: 'light',
  impl: 'inline',
  output: 'field',
  tags: {
    material: ['spectrum', 'line', 'emissive'],
    motion: ['radial', 'spin', 'audio-reactive'],
    affect: ['electric', 'hypnotic', 'symmetrical'],
    environment: ['club'],
  },
  parameters: [
    {
      id: 'count',
      label: 'Spikes',
      kind: 'int',
      min: 32,
      max: 160,
      default: 96,
      modulatable: false,
    },
    {
      id: 'radius',
      label: 'Radius',
      kind: 'number',
      min: 0.08,
      max: 0.32,
      default: 0.17,
      modulatable: true,
    },
    {
      id: 'length',
      label: 'Length',
      kind: 'number',
      min: 0.08,
      max: 0.4,
      default: 0.24,
      modulatable: true,
    },
    { id: 'spin', label: 'Spin', kind: 'number', min: -1, max: 1, default: 0.3, modulatable: true },
    {
      id: 'symmetry',
      label: 'Symmetry',
      kind: 'int',
      min: 1,
      max: 8,
      default: 2,
      modulatable: false,
    },
    {
      id: 'style',
      label: 'Style',
      kind: 'enum',
      options: ['spikes', 'blob', 'twin'],
      default: 'spikes',
      modulatable: false,
    },
  ],
  cost: { passes: 0, relativeFill: 0.3, stateful: false },
  audio: ['spectrum'],
};

export const spectrumRadialGenerator: InlineGenerator = {
  def: spectrumRadialDef,
  emit(ctx: EmitContext): string {
    const { fnName, uniform } = ctx;
    const uCount = uniform('count');
    const uRadius = uniform('radius');
    const uLength = uniform('length');
    const uSpin = uniform('spin');
    const uSym = uniform('symmetry');
    const uStyle = uniform('style');
    const xAt = `${fnName}_x`;
    const spikes = `${fnName}_spikes`;
    const smooth = `${fnName}_smooth`;
    return /* glsl */ `
// spectrumRadial helpers
// angle (any range) -> spectrum coordinate, mirrored inside each sector
float ${xAt}(float th, float sym) {
  float local = fract(th / 6.28318530718 * sym);
  return abs(2.0 * local - 1.0);
}
float ${smooth}(float th, float sym) {
  float d = 0.035 / sym;
  return (spectrumAt(${xAt}(th - d, sym)) + spectrumAt(${xAt}(th, sym)) + spectrumAt(${xAt}(th + d, sym))) / 3.0;
}
// n radial spikes starting at radius r0, growing outward (dir = 1) or inward (dir = -1)
float ${spikes}(float r, float th, float r0, float dir, float n, float lenMax, float sym, float px) {
  float stp = 6.28318530718 / n;
  float k = floor(th / stp + 0.5);
  float thk = k * stp;
  float s = spectrumAt(${xAt}(thk, sym));
  float len = s * lenMax;
  float r1 = r0 + dir * len;
  float lo = min(r0, r1);
  float hi = max(r0, r1);
  float dPerp = r * abs(th - thk);
  float dr = max(lo - r, 0.0) + max(r - hi, 0.0);
  float d = sqrt(dr * dr + dPerp * dPerp);
  float w = max(0.0022, 0.6 * px) * (0.8 + 0.6 * s);
  float core = 1.0 - smoothstep(w, w + px, d);
  float glow = exp(-d * d / (w * w * 10.0)) * 0.35;
  // brighter toward the tip, like a meter needle
  float along = clamp(abs(r - r0) / max(len, 1e-4), 0.0, 1.0);
  float inten = (0.45 + 0.9 * s) * mix(0.75, 1.0, along);
  // zero-length spikes vanish instead of leaving a dotted ring
  return max(core, glow) * inten * smoothstep(0.002, 0.012, len);
}
// spectrumRadial source
float ${fnName}(vec2 p) {
  float n = float(clamp(${uCount}, 32, 160));
  float lenMax = clamp(${uLength}, 0.08, 0.4);
  float sym = float(clamp(${uSym}, 1, 8));
  int style = clamp(${uStyle}, 0, 2);
  float breathe = 1.0 + 0.22 * clamp(uBass, 0.0, 1.0) + 0.12 * clamp(uBeat, 0.0, 1.0);
  float r0 = clamp(${uRadius}, 0.08, 0.32) * breathe;
  float rot = uTime * clamp(${uSpin}, -1.0, 1.0) * 0.45;
  float px = clamp(max(fwidth(p.x), fwidth(p.y)), 1e-4, 0.05);
  float r = length(p);
  float a = atan(p.y, p.x);

  if (style == 1) {
    // blob: closed curve R(th) with a soft interior and a bright rim
    float th = a - rot;
    float e = 0.015;
    // 3-tap average: the rim follows the spectrum's envelope, not every bin
    float R = r0 + lenMax * ${smooth}(th, sym);
    float Rp = r0 + lenMax * ${smooth}(th + e, sym);
    float Rm = r0 + lenMax * ${smooth}(th - e, sym);
    float g = (Rp - Rm) / (2.0 * e);
    float d = abs(r - R) / sqrt(1.0 + (g * g) / max(r * r, 0.0025));
    float w = max(0.0025, 0.7 * px);
    float rim = 1.0 - smoothstep(w, w + px, d);
    float glow = exp(-d * d / (w * w * 14.0)) * 0.3;
    float inside = 1.0 - smoothstep(-px, px, r - R);
    float fill = inside * (0.08 + 0.16 * clamp(r / max(R, 1e-3), 0.0, 1.0));
    return clamp(max(max(rim * 0.95, glow), fill), 0.0, 1.0);
  }
  if (style == 2) {
    // twin: outer ring outward, inner ring inward, counter-rotating
    float outer = ${spikes}(r, a - rot, r0, 1.0, max(n * 0.5, 16.0), lenMax, sym, px);
    float inner = ${spikes}(r, a + rot * 1.3, r0 * 0.86, -1.0, max(n * 0.5, 16.0), r0 * 0.6, sym, px);
    return clamp(max(outer, inner), 0.0, 1.0);
  }
  return clamp(${spikes}(r, a - rot, r0, 1.0, n, lenMax, sym, px), 0.0, 1.0);
}
`.trim();
  },
};
