import type { GeneratorDefinition } from '../types';
import type { EmitContext, InlineGenerator } from './types';

/**
 * Beat rings (ビートリング) — the legacy `rings` scene, made stateless.
 *
 * The legacy scene kept a CPU list of rings spawned on detected beats. Here a
 * ring is born every `period` of the shader clock and `count` of them are alive
 * at once: ring k's age is `(fract(uTime / period) + k) / count`, its identity
 * (spin, origin, reach) is hashed from its spawn index, so nothing has to be
 * remembered between frames. `uTime` is the energy-driven motion clock, so the
 * spawn rate follows the music's energy and freezes in silence; on top of that
 * `uPunch` / `uBeat` thicken and brighten the youngest ring, which is where the
 * legacy "spawned on a beat" emphasis went.
 *
 * Shapes (legacy variants): circle · polygon (regular `sides`-gon, each ring
 * slowly turning) · arcs (`sides` arc segments). `scatter` moves each ring's
 * origin to a hashed spot (legacy variant 3). Rings fade as (1 - age)², and the
 * fade is exactly 0 at age 1, so the spawn-index hand-over is invisible.
 * Not `shockwave`: that one is a displacement field, this draws the rings.
 */
export const beatRingsDef: GeneratorDefinition = {
  id: 'beatRings',
  version: 1,
  category: 'source',
  costClass: 'light',
  impl: 'inline',
  output: 'field',
  tags: {
    material: ['ring', 'line', 'geometric'],
    motion: ['radial', 'pulse', 'burst'],
    affect: ['rhythmic', 'hypnotic', 'propulsive'],
    environment: ['club'],
  },
  parameters: [
    {
      id: 'shape',
      label: 'Shape',
      kind: 'enum',
      options: ['circle', 'polygon', 'arcs'],
      default: 'polygon',
      modulatable: false,
    },
    { id: 'sides', label: 'Sides', kind: 'int', min: 3, max: 8, default: 6, modulatable: false },
    { id: 'count', label: 'Rings', kind: 'int', min: 2, max: 6, default: 4, modulatable: false },
    // uTime / period is the spawn clock: modulating it would jump every ring
    {
      id: 'period',
      label: 'Period',
      kind: 'number',
      min: 0.5,
      max: 3,
      default: 1.2,
      modulatable: false,
    },
    {
      id: 'thickness',
      label: 'Thickness',
      kind: 'number',
      min: 0.002,
      max: 0.02,
      default: 0.006,
      modulatable: true,
    },
    { id: 'scatter', label: 'Scatter', kind: 'bool', default: false, modulatable: false },
  ],
  cost: { passes: 0, relativeFill: 0.35, stateful: false },
};

export const beatRingsGenerator: InlineGenerator = {
  def: beatRingsDef,
  emit(ctx: EmitContext): string {
    const { fnName, uniform, nsUniform, seedUniform } = ctx;
    const uShape = uniform('shape');
    const uSides = uniform('sides');
    const uCount = uniform('count');
    const uPeriod = uniform('period');
    const uThick = uniform('thickness');
    const uScatter = uniform('scatter');
    const poly = `${fnName}_poly`;
    return /* glsl */ `
// beatRings helpers
// signed distance to a regular n-gon of circumradius r (iq)
float ${poly}(vec2 p, float r, float n) {
  float an = 3.14159265 / n;
  vec2 acs = vec2(cos(an), sin(an));
  float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
  p = length(p) * vec2(cos(bn), abs(sin(bn)));
  p -= r * acs;
  p.y += clamp(-p.y, 0.0, r * acs.y);
  return length(p) * sign(p.x);
}
// beatRings source: stateless spawn-clock rings
float ${fnName}(vec2 p) {
  int shape = clamp(${uShape}, 0, 2);
  float sides = float(clamp(${uSides}, 3, 8));
  int nR = clamp(${uCount}, 2, 6);
  float period = clamp(${uPeriod}, 0.5, 3.0);
  float th = clamp(${uThick}, 0.002, 0.02);
  bool scatter = ${uScatter} != 0;
  float aspect = clamp(uRes.x / max(uRes.y, 1.0), 0.5, 4.0);
  float px = clamp(max(fwidth(p.x), fwidth(p.y)), 1e-4, 0.05);
  float punch = clamp(uPunch, 0.0, 1.0);
  float beat = clamp(uBeat, 0.0, 1.0);

  float tt = uTime / period;
  float base = floor(tt);
  float fr = tt - base;
  float nF = float(nR);
  float dens = 0.0;
  for (int k = 0; k < 6; k++) {
    if (k >= nR) break;
    float age = (fr + float(k)) / nF;
    uint key = synthHashCombine(uint(int(base) - k), 0x9au);
    float h0 = synthRand(${seedUniform}, ${nsUniform}, key);
    float h1 = synthRand(${seedUniform}, ${nsUniform}, synthHashCombine(key, 1u));
    float h2 = synthRand(${seedUniform}, ${nsUniform}, synthHashCombine(key, 2u));
    float h3 = synthRand(${seedUniform}, ${nsUniform}, synthHashCombine(key, 3u));
    vec2 origin = scatter ? vec2((h1 - 0.5) * 0.8 * aspect, (h2 - 0.5) * 0.7) : vec2(0.0);
    // reach the far corner (from the origin) with a hashed overshoot
    float corner = length(vec2(0.5 * aspect, 0.5) + abs(origin));
    float maxR = corner * (1.05 + 0.35 * h0);
    float R = maxR * pow(age, 0.8) + 0.01;
    float fade = (1.0 - age) * (1.0 - age) * smoothstep(0.0, 0.05, age);
    float young = pow(1.0 - age, 4.0);
    float w = max(th * (0.35 + 0.65 * (1.0 - age)) * (1.0 + 1.8 * punch * young), 0.6 * px);

    vec2 q = p - origin;
    float spinA = (h3 - 0.5) * 6.28318 + uTime * (0.3 + 0.5 * h1) * (h2 < 0.5 ? 1.0 : -1.0) / period * 0.2;
    float cs = cos(spinA);
    float sn = sin(spinA);
    q = mat2(cs, sn, -sn, cs) * q;
    float d;
    if (shape == 1) {
      d = abs(${poly}(q, R, sides));
    } else if (shape == 2) {
      float r = length(q);
      float local = fract(atan(q.y, q.x) / 6.28318530718 * sides) - 0.5;
      float arcGap = (abs(local) - 0.3) * 6.28318530718 / sides * r;
      d = max(abs(r - R), arcGap);
    } else {
      d = abs(length(q) - R);
    }
    float core = 1.0 - smoothstep(w, w + px, d);
    float glow = exp(-d * d / (w * w * 18.0)) * 0.4;
    float v = max(core, glow) * fade * (1.0 + 0.6 * beat * young);
    dens = 1.0 - (1.0 - dens) * (1.0 - clamp(v, 0.0, 1.0));
  }
  return clamp(dens, 0.0, 1.0);
}
`.trim();
  },
};
