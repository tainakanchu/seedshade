import type { GeneratorDefinition } from '../types';
import type { EmitContext, InlineGenerator } from './types';

/**
 * Lissajous scope (リサージュ) — the legacy `lissajous` scene: an X-Y phase
 * scope of the live signal against itself a quarter-buffer later (the wave
 * texture's G/B pair), drawn as a glowing polyline.
 *
 * The curve is not a function of x, so the distance is taken by looping over
 * `samples` segments — the one place in the catalog that pays per-sample work.
 * The loop is bounded (≤ 192), the pixel is culled early outside the curve's
 * bounding disc, and fwidth is taken before either, so the cost stays at
 * "medium" and the AA stays valid.
 *
 * Styles (legacy variants): scope (the live X-Y figure; during silence it
 * crossfades into a dim 2:3 figure instead of collapsing to a dot) · harmonic
 * (a pure a:b Lissajous figure, ratio picked from the seed, phase driven by the
 * energy clock, size breathing with the level).
 *
 * Later samples are drawn brighter than earlier ones, a phosphor-decay hint
 * that also gives the line an in-surface gradient.
 */
export const lissajousScopeDef: GeneratorDefinition = {
  id: 'lissajousScope',
  version: 1,
  category: 'source',
  costClass: 'medium',
  impl: 'inline',
  output: 'field',
  tags: {
    material: ['oscilloscope', 'line', 'phosphor'],
    motion: ['rotate', 'audio-reactive'],
    affect: ['technical', 'hypnotic', 'retro-tech'],
  },
  parameters: [
    {
      id: 'scale',
      label: 'Scale',
      kind: 'number',
      min: 0.18,
      max: 0.46,
      default: 0.34,
      modulatable: true,
    },
    {
      id: 'thickness',
      label: 'Thickness',
      kind: 'number',
      min: 0.002,
      max: 0.012,
      default: 0.004,
      modulatable: true,
    },
    // loop bound: a modulated sample count would make the figure pop
    {
      id: 'samples',
      label: 'Samples',
      kind: 'int',
      min: 64,
      max: 192,
      default: 128,
      modulatable: false,
    },
    {
      id: 'spin',
      label: 'Spin',
      kind: 'number',
      min: -1,
      max: 1,
      default: 0.15,
      modulatable: true,
    },
    {
      id: 'style',
      label: 'Style',
      kind: 'enum',
      options: ['scope', 'harmonic'],
      default: 'scope',
      modulatable: false,
    },
  ],
  cost: { passes: 0, relativeFill: 0.7, stateful: false },
  audio: ['wave'],
};

export const lissajousScopeGenerator: InlineGenerator = {
  def: lissajousScopeDef,
  emit(ctx: EmitContext): string {
    const { fnName, uniform, nsUniform, seedUniform } = ctx;
    const uScale = uniform('scale');
    const uThick = uniform('thickness');
    const uSamples = uniform('samples');
    const uSpin = uniform('spin');
    const uStyle = uniform('style');
    const seg = `${fnName}_seg`;
    return /* glsl */ `
// lissajousScope helpers
float ${seg}(vec2 p, vec2 a, vec2 b, out float t) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  t = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-10), 0.0, 1.0);
  return length(pa - ba * t);
}
// lissajousScope source: X-Y scope of the wave texture (bounded segment loop)
float ${fnName}(vec2 p) {
  float sc = clamp(${uScale}, 0.18, 0.46);
  float th = clamp(${uThick}, 0.002, 0.012);
  int nS = clamp(${uSamples}, 64, 192);
  int style = clamp(${uStyle}, 0, 1);
  float px = clamp(max(fwidth(p.x), fwidth(p.y)), 1e-4, 0.05);

  float lv = clamp(uLevel, 0.0, 1.0);
  // harmonic figure: ratio from the seed, phase on the energy clock
  float pick = synthRand(${seedUniform}, ${nsUniform}, 0x11u);
  vec2 ratio = pick < 0.25 ? vec2(1.0, 2.0) : pick < 0.5 ? vec2(2.0, 3.0) : pick < 0.75 ? vec2(3.0, 4.0) : vec2(3.0, 5.0);
  float phase = uTime * 0.35 + 1.5 * clamp(uBeat, 0.0, 1.0);
  // scope style falls back to a dim 2:3 figure while the room is silent
  float idle = style == 1 ? 1.0 : 1.0 - smoothstep(0.02, 0.12, lv);
  vec2 ratioUse = style == 1 ? ratio : vec2(2.0, 3.0);
  float hScale = style == 1 ? sc * (0.7 + 0.3 * lv) : sc * 0.55;
  float gain = style == 1 ? 1.0 : mix(1.0, 0.4, idle);

  float rot = uTime * clamp(${uSpin}, -1.0, 1.0) * 0.25;
  mat2 R = mat2(cos(rot), sin(rot), -sin(rot), cos(rot));
  vec2 q = transpose(R) * p;

  float w = max(0.5 * th, 0.6 * px);
  float reach = w * 6.0 + 2.0 * px;
  // every point of either figure lies within sc * sqrt(2) of the centre
  if (length(q) > sc * 1.42 + reach) return 0.0;

  float lastTexel = float(SYNTH_WAVE_SAMPLES - 1);
  float last = float(nS - 1);
  vec2 prev = vec2(0.0);
  float best = 1e5;
  float bestK = 0.0;
  for (int k = 0; k < 192; k++) {
    if (k >= nS) break;
    float u = float(k) / last;
    vec2 live = waveXYSample(int(floor(u * lastTexel + 0.5))) * sc;
    float a = u * 6.28318530718;
    vec2 harm = vec2(sin(ratioUse.x * a + phase), sin(ratioUse.y * a)) * hScale;
    vec2 cur = mix(live, harm, idle);
    if (k > 0) {
      float t;
      float d = ${seg}(q, prev, cur, t);
      if (d < best) {
        best = d;
        bestK = (float(k - 1) + t) / last;
      }
    }
    prev = cur;
  }

  float core = 1.0 - smoothstep(w, w + px, best);
  float halo = exp(-best * best / (w * w * 14.0)) * 0.4;
  // later samples brighter: a phosphor-decay hint and an in-line gradient
  float decay = mix(0.55, 1.0, bestK);
  return clamp(max(core, halo) * decay * gain, 0.0, 1.0);
}
`.trim();
  },
};
