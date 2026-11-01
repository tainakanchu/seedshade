import type { GeneratorDefinition } from '../types';
import type { EmitContext, InlineGenerator } from './types';
import { valueNoiseGlsl } from './valueNoise';

/**
 * Ink marble (墨流し) — the legacy `fluid` scene's look without its simulation.
 *
 * The legacy scene ran a Stable Fluids solver and, on GPUs without float render
 * targets, fell back to a single-pass procedural marble. This is that fallback
 * ported onto seeded noise: FBM, domain-warped by two more FBM lookups, then
 * banded into veins with a sine over the warped field. Stateless, single pass.
 *
 * Layouts (legacy variants): marble (whole frame) · edges (ink hugs the
 * borders, thins in the middle) · mandala (`symmetry`-fold kaleidoscope) ·
 * ribbon (concentrated into one winding band).
 *
 * The ink is soft-thresholded (`smoothstep(0.3, 0.85, m)`), so the thin regions
 * are genuinely empty — it reads as ink in water over the video, not as a
 * filled card — and the veins modulate the density inside the ink, so a
 * material downstream still sees the marbling.
 */
export const inkMarbleDef: GeneratorDefinition = {
  id: 'inkMarble',
  version: 1,
  category: 'source',
  costClass: 'medium',
  impl: 'inline',
  output: 'field',
  tags: {
    material: ['ink', 'fluid', 'marble'],
    motion: ['drift', 'swirl', 'turbulent'],
    affect: ['organic', 'meditative', 'liquid'],
    culturalTexture: ['japan'],
  },
  parameters: [
    {
      id: 'scale',
      label: 'Scale',
      kind: 'number',
      min: 0.6,
      max: 2,
      default: 1,
      modulatable: true,
    },
    { id: 'flow', label: 'Flow', kind: 'number', min: 0, max: 1, default: 0.45, modulatable: true },
    {
      id: 'veins',
      label: 'Veins',
      kind: 'number',
      min: 4,
      max: 16,
      default: 10,
      modulatable: true,
    },
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
      id: 'density',
      label: 'Density',
      kind: 'number',
      min: 0.3,
      max: 1,
      default: 0.7,
      modulatable: true,
    },
    {
      id: 'layout',
      label: 'Layout',
      kind: 'enum',
      options: ['marble', 'edges', 'mandala', 'ribbon'],
      default: 'marble',
      modulatable: false,
    },
    {
      id: 'symmetry',
      label: 'Symmetry',
      kind: 'int',
      min: 2,
      max: 8,
      default: 6,
      modulatable: false,
    },
  ],
  cost: { passes: 0, relativeFill: 0.6, stateful: false },
};

export const inkMarbleGenerator: InlineGenerator = {
  def: inkMarbleDef,
  emit(ctx: EmitContext): string {
    const { fnName, uniform, nsUniform, seedUniform } = ctx;
    const uScale = uniform('scale');
    const uFlow = uniform('flow');
    const uVeins = uniform('veins');
    const uShimmer = uniform('shimmer');
    const uDensity = uniform('density');
    const uLayout = uniform('layout');
    const uSym = uniform('symmetry');
    const nz = `${fnName}_n`;
    return /* glsl */ `
// inkMarble noise
${valueNoiseGlsl(nz, seedUniform, nsUniform)}
// inkMarble source: FBM domain-warped marble veins (port of the fluid fallback)
float ${fnName}(vec2 p) {
  float sc = clamp(${uScale}, 0.6, 2.0);
  float flow = clamp(${uFlow}, 0.0, 1.0);
  float veinsF = clamp(${uVeins}, 4.0, 16.0);
  float shimmer = clamp(${uShimmer}, 0.0, 1.0);
  float dens = clamp(${uDensity}, 0.3, 1.0);
  int lay = clamp(${uLayout}, 0, 3);
  float sym = float(clamp(${uSym}, 2, 8));
  float aspect = max(uRes.x / max(uRes.y, 1.0), 0.1);
  uint base = ${nz}_base();
  float t = uTime * 0.32;

  vec2 q0 = p * (1.7 * sc);
  if (lay == 2) {
    float seg = 6.28318530718 / sym;
    float ang = abs(mod(atan(q0.y, q0.x), seg) - seg * 0.5);
    q0 = vec2(cos(ang), sin(ang)) * length(q0);
  }

  vec2 q = q0 * 1.9;
  float n1 = ${nz}_fbm(q + vec2(t * 0.34, -t * 0.22), base, 4);
  vec2 w = vec2(
    ${nz}_fbm(q * 1.13 + vec2(n1 * 2.1 + 3.7, t * 0.17), base, 4),
    ${nz}_fbm(q * 1.13 + vec2(-t * 0.14, n1 * 2.1 + 8.2), base, 4));
  float m = ${nz}_fbm(q + (w - 0.5) * (2.1 + flow * 2.4), base, 5);

  float veins = 0.5 + 0.5 * sin(m * veinsF + n1 * 5.0 + t * 0.8);
  veins = pow(veins, 1.7);
  veins += ${nz}_vnoise(q * 6.0 + vec2(0.0, -t * 1.3), base) * shimmer * 0.4;

  float ink = smoothstep(0.3, 0.85, m) * (0.2 + veins * 1.0);

  if (lay == 1) {
    vec2 uvc = p / vec2(0.5 * aspect, 0.5);
    float edge = length(uvc);
    ink *= 0.35 + smoothstep(0.2, 1.0, edge) * 0.9;
  } else if (lay == 3) {
    float band = sin(p.x * 1.2 + t * 0.5) * 0.2 + (n1 - 0.5) * 0.3;
    float yb = p.y - band;
    ink *= 0.25 + exp(-yb * yb / 0.04);
  }

  return clamp(ink * (0.45 + dens * 0.75), 0.0, 0.94);
}
`.trim();
  },
};
