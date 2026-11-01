import type { GeneratorDefinition } from '../types';
import type { EmitContext, InlineGenerator } from './types';
import { valueNoiseGlsl } from './valueNoise';

/**
 * Aurora curtain (オーロラ) — the legacy `aurora` scene: layered sinusoidal
 * curtains, FBM-warped along their length and textured across it, falling off
 * toward the edge they hang from.
 *
 * Layouts (legacy variants): curtain (hanging from the top) · horizon (glow
 * hugging the bottom) · nebula (cloudy FBM with sparse twinkling stars) ·
 * ribbon (one thick winding band). The legacy colour layers (three hues) are
 * the material's job here; the three curtain layers survive as density, each
 * with its own band offset, wiggle frequency and speed, so the parallax stays.
 *
 * `sway` and `shimmer` were bass / treble-driven with seconds-scale smoothing
 * in the legacy scene; here they are modulatable, so derive's audio routes
 * drive them with route smoothing instead of new CPU state.
 */
export const auroraCurtainDef: GeneratorDefinition = {
  id: 'auroraCurtain',
  version: 1,
  category: 'source',
  costClass: 'medium',
  impl: 'inline',
  output: 'field',
  tags: {
    material: ['aurora', 'fluid', 'emissive'],
    motion: ['wave', 'sway', 'drift'],
    affect: ['cosmic', 'dreamy', 'calm', 'cold'],
    environment: ['space'],
  },
  parameters: [
    { id: 'layers', label: 'Layers', kind: 'int', min: 1, max: 3, default: 3, modulatable: false },
    { id: 'sway', label: 'Sway', kind: 'number', min: 0, max: 1, default: 0.35, modulatable: true },
    {
      id: 'shimmer',
      label: 'Shimmer',
      kind: 'number',
      min: 0,
      max: 1,
      default: 0.3,
      modulatable: true,
    },
    {
      id: 'scale',
      label: 'Scale',
      kind: 'number',
      min: 0.7,
      max: 1.6,
      default: 1,
      modulatable: true,
    },
    {
      id: 'layout',
      label: 'Layout',
      kind: 'enum',
      options: ['curtain', 'horizon', 'nebula', 'ribbon'],
      default: 'curtain',
      modulatable: false,
    },
  ],
  cost: { passes: 0, relativeFill: 0.55, stateful: false },
};

export const auroraCurtainGenerator: InlineGenerator = {
  def: auroraCurtainDef,
  emit(ctx: EmitContext): string {
    const { fnName, uniform, nsUniform, seedUniform } = ctx;
    const uLayers = uniform('layers');
    const uSway = uniform('sway');
    const uShimmer = uniform('shimmer');
    const uScale = uniform('scale');
    const uLayout = uniform('layout');
    const nz = `${fnName}_n`;
    const curtain = `${fnName}_curtain`;
    return /* glsl */ `
// auroraCurtain noise
${valueNoiseGlsl(nz, seedUniform, nsUniform)}
// one curtain layer: a sine band warped by fbm along x. tail = +1 / -1 gives a
// sharp lit edge on one side and a long fade on the other (a hanging curtain);
// tail = 0 is a symmetric glow.
float ${curtain}(vec2 p, float band, float freq, float phase, float thick, float warp, float tail, uint base) {
  float w = ${nz}_fbm(vec2(p.x * 1.5 + phase * 0.3, phase * 0.2 + warp), base, 4) - 0.5;
  float wave = sin(p.x * freq + phase + w * 3.0) * 0.12;
  float y = p.y - band - wave;
  float yy = y * tail;
  float v = tail == 0.0 || yy < 0.0
    ? exp(-y * y / (thick * thick * (tail == 0.0 ? 1.0 : 0.12)))
    : exp(-yy / (thick * 0.9));
  // vertical rays: fine in x, long in y, drifting along the curtain
  float rays = ${nz}_fbm(vec2(p.x * 8.0 + phase * 0.5, p.y * 1.2 - phase * 0.3), base, 3);
  v *= 0.25 + 1.1 * smoothstep(0.3, 0.75, rays);
  return v;
}
// auroraCurtain source (port of the aurora scene)
float ${fnName}(vec2 p0) {
  int nL = clamp(${uLayers}, 1, 3);
  float sway = clamp(${uSway}, 0.0, 1.0);
  float shimmer = clamp(${uShimmer}, 0.0, 1.0);
  float sc = clamp(${uScale}, 0.7, 1.6);
  int lay = clamp(${uLayout}, 0, 3);
  uint base = ${nz}_base();
  float t = uTime;
  // legacy space: x centred, y = 0 at the bottom edge .. 1 at the top
  float vy = p0.y + 0.5;
  vec2 p = vec2(p0.x, vy) * sc;
  p.x += sway * 0.6 * sin(t * 0.25);

  float alpha;
  if (lay == 2) {
    // nebula: cloudy fbm plus sparse twinkling stars on a pixel-ish lattice
    vec2 q = p * 1.4;
    float n = ${nz}_fbm(q + vec2(t * 0.05, -t * 0.03), base, 4);
    n = ${nz}_fbm(q * 1.2 + (vec2(n) - 0.5) * 2.0 + vec2(0.0, t * 0.04), base, 4);
    float cloud = smoothstep(0.45, 0.95, n) * 0.85;
    vec2 g = floor(p0 * 70.0);
    ivec2 gc = ivec2(g);
    float star = step(0.992, ${nz}_h(base ^ 0x5a5au, gc));
    float tw = 0.5 + 0.5 * sin(t * 3.0 + ${nz}_h(base ^ 0xa5a5u, gc) * 40.0);
    vec2 f = p0 * 70.0 - g - 0.5;
    float starA = star * tw * (0.5 + shimmer) * exp(-dot(f, f) * 8.0);
    alpha = max(cloud, starA);
  } else if (lay == 3) {
    float warp = ${nz}_fbm(vec2(p.x * 0.8 + t * 0.1, t * 0.15), base, 4) - 0.5;
    float band = 0.5 + sin(p.x * 1.3 + t * 0.3) * 0.18 + warp * 0.25;
    float y = vy - band;
    float v = exp(-y * y / (0.16 * 0.16));
    float rays = ${nz}_fbm(vec2(p.x * 8.0 + t * 0.6, vy * 1.2 - t * 0.3), base, 3);
    v *= 0.25 + 1.0 * smoothstep(0.3, 0.75, rays);
    v *= 1.0 + sin(p.x * 30.0 - t * 6.0) * shimmer * 0.25;
    alpha = 1.0 - exp(-1.2 * v);
  } else {
    float baseBand = lay == 1 ? 0.22 : 0.78;
    float dirB = lay == 1 ? 1.0 : -1.0;
    // curtain: lit lower edge, rays fading upward; horizon: symmetric glow
    float tailDir = lay == 1 ? 0.0 : 1.0;
    float ripple = sin(p.x * 26.0 - t * 5.0) * shimmer;
    float l0 = ${curtain}(p, baseBand, 2.2, t * 0.7, 0.3, 0.0, tailDir, base);
    float l1 = nL >= 2 ? ${curtain}(p, baseBand + dirB * 0.1, 3.1, t * 1.0 + 2.0, 0.22, 7.3, tailDir, base) * (1.0 + ripple * 0.4) : 0.0;
    float l2 = nL >= 3 ? ${curtain}(p, baseBand + dirB * 0.2, 4.3, t * 1.4 + 5.0, 0.16, 13.1, tailDir, base) * (1.0 + ripple * 0.6) : 0.0;
    float edgeY = lay == 1 ? vy : 1.0 - vy;
    float fall = smoothstep(1.05, -0.05, edgeY);
    // soft saturation: overlapping layers brighten without flattening into a slab
    alpha = 1.0 - exp(-1.1 * (l0 * 0.7 + l1 * 0.85 + l2) * fall);
  }
  alpha *= 1.0 + 0.25 * clamp(uPunch, 0.0, 1.0);
  return clamp(alpha, 0.0, 0.95);
}
`.trim();
  },
};
