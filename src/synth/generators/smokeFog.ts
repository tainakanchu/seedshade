import type { GeneratorDefinition } from '../types';
import type { EmitContext, InlineGenerator } from './types';
import { valueNoiseGlsl } from './valueNoise';

/**
 * Smoke fog (煙) — the legacy `smoke` scene: volumetric-looking fog from
 * domain-warped FBM, already a single fragment pass there, ported onto seeded
 * noise.
 *
 * The density is a two-pass warp (FBM offsets the lookup of an FBM, whose own
 * value warps a second lookup) plus a fine shimmer octave, then soft-alpha'd
 * with `smoothstep(0.32, 0.92, d)^1.35`, so thin smoke is truly transparent
 * and only the dense cores approach opacity — wisps, never a filled rectangle.
 *
 * Layouts (legacy variants): rise (wisps scrolling up, denser low) · banks
 * (horizontal drifting bands) · vortex (slow swirl around the centre) ·
 * incense (a few narrow wavering columns). The legacy scene drove drift /
 * swirl / density / shimmer from slowly smoothed bass / level / treble; here
 * they are modulatable parameters, so derive's audio routes (with their own
 * smoothing) take that job.
 */
export const smokeFogDef: GeneratorDefinition = {
  id: 'smokeFog',
  version: 1,
  category: 'source',
  costClass: 'medium',
  impl: 'inline',
  output: 'field',
  tags: {
    material: ['smoke', 'fluid'],
    motion: ['drift', 'turbulent', 'swirl'],
    affect: ['hazy', 'soft', 'eerie', 'cinematic'],
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
    {
      id: 'swirl',
      label: 'Swirl',
      kind: 'number',
      min: 0,
      max: 1,
      default: 0.55,
      modulatable: true,
    },
    {
      id: 'drift',
      label: 'Drift',
      kind: 'number',
      min: 0,
      max: 1,
      default: 0.3,
      modulatable: true,
    },
    {
      id: 'shimmer',
      label: 'Shimmer',
      kind: 'number',
      min: 0,
      max: 1,
      default: 0.25,
      modulatable: true,
    },
    {
      id: 'density',
      label: 'Density',
      kind: 'number',
      min: 0.3,
      max: 1,
      default: 0.75,
      modulatable: true,
    },
    {
      id: 'layout',
      label: 'Layout',
      kind: 'enum',
      options: ['rise', 'banks', 'vortex', 'incense'],
      default: 'rise',
      modulatable: false,
    },
  ],
  cost: { passes: 0, relativeFill: 0.6, stateful: false },
};

export const smokeFogGenerator: InlineGenerator = {
  def: smokeFogDef,
  emit(ctx: EmitContext): string {
    const { fnName, uniform, nsUniform, seedUniform } = ctx;
    const uScale = uniform('scale');
    const uSwirl = uniform('swirl');
    const uDrift = uniform('drift');
    const uShimmer = uniform('shimmer');
    const uDensity = uniform('density');
    const uLayout = uniform('layout');
    const nz = `${fnName}_n`;
    return /* glsl */ `
// smokeFog noise
${valueNoiseGlsl(nz, seedUniform, nsUniform)}
// smokeFog source: two-pass domain-warped FBM fog (port of the smoke scene)
float ${fnName}(vec2 p) {
  float sc = clamp(${uScale}, 0.6, 2.0);
  float swirl = clamp(${uSwirl}, 0.0, 1.0);
  float drift = clamp(${uDrift}, 0.0, 1.0);
  float shimmer = clamp(${uShimmer}, 0.0, 1.0);
  float dens = clamp(${uDensity}, 0.3, 1.0);
  int lay = clamp(${uLayout}, 0, 3);
  uint base = ${nz}_base();
  float t = uTime;

  vec2 q = p * (2.4 * sc);
  vec2 flow = vec2(0.0);
  float vignette = 1.0;
  if (lay == 0) {
    flow = vec2(0.12 * sin(t * 0.2 + p.x * 1.5), -t * (0.35 + drift));
    vignette = smoothstep(-0.95, 0.55, -p.y) * 0.85 + 0.15;
  } else if (lay == 1) {
    flow = vec2(t * (0.4 + drift), 0.08 * sin(t * 0.18 + p.y * 2.0));
    q.y *= 1.6;
    vignette = 0.9;
  } else if (lay == 2) {
    float r = length(p);
    float a = atan(p.y, p.x) + (0.5 + drift) * (0.6 / (r + 0.25)) + t * 0.15;
    q = vec2(cos(a), sin(a)) * (r * 3.0 * sc);
    flow = vec2(0.0, -t * 0.1);
    vignette = smoothstep(1.15, 0.1, r);
  } else {
    flow = vec2(0.0, -t * (0.5 + drift));
    q.x *= 3.0;
    q += vec2(0.4 * sin(t * 0.5 + p.y * 4.0), 0.0);
    vignette = smoothstep(-0.95, 0.4, -p.y);
  }

  vec2 warp = vec2(
    ${nz}_fbm(q * 0.6 + flow + vec2(0.0, t * 0.05), base, 4),
    ${nz}_fbm(q * 0.6 + flow + vec2(5.2, 1.3 - t * 0.05), base, 4));
  vec2 sp = q + flow + (warp - 0.5) * (2.6 * swirl);
  float d = ${nz}_fbm(sp, base, 5);
  d = ${nz}_fbm(sp + (vec2(d) - 0.5) * 1.6 * swirl + flow * 0.5, base, 5);
  d += ${nz}_vnoise(sp * 7.0 + vec2(0.0, -t * 1.6), base) * shimmer * 0.35;

  if (lay == 3) {
    float col = abs(fract(p.x * 1.6 + 0.5) - 0.5) * 2.0;
    d *= smoothstep(0.75, 0.0, col);
  }
  d = clamp(d * vignette, 0.0, 1.0);

  float alpha = pow(smoothstep(0.26, 0.82, d), 1.25);
  alpha *= dens * (1.0 + 0.15 * clamp(uPunch, 0.0, 1.0));
  return clamp(alpha, 0.0, 0.96);
}
`.trim();
  },
};
