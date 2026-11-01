import type { GeneratorDefinition } from '../types';
import type { EmitContext, InlineGenerator } from './types';

/**
 * Particle field (パーティクル) — the legacy `particles` scene, re-formulated
 * without a particle pool.
 *
 * Every style lays particles on a lattice that moves with the shader clock, so
 * a particle's position is a pure function of (cell, uTime): the cell hash
 * (Patch seed + namespace) decides whether the cell holds a particle and where
 * inside it, the same trick as `points` / `fireworks`. Each pixel evaluates
 * only its own cell and the neighbours a streak can reach from, so the cost is
 * bounded no matter how dense the field looks.
 *
 * Styles (legacy variants):
 * - rise:      two parallax layers of embers drifting up with a sideways sway
 * - orbit:     particles on concentric bands, each band turning at its own rate
 * - rain:      thin falling streaks with a slight slant
 * - starfield: four depth slices streaming out from the centre (warp on punch)
 *
 * `uBeat` / `uPunch` brighten and stretch the streaks (legacy beat bursts).
 */
export const particleFieldDef: GeneratorDefinition = {
  id: 'particleField',
  version: 1,
  category: 'source',
  costClass: 'medium',
  impl: 'inline',
  output: 'field',
  tags: {
    material: ['particle', 'spark', 'dot'],
    motion: ['drift', 'flythrough', 'rotate'],
    affect: ['cosmic', 'dreamy', 'kinetic'],
    environment: ['space'],
  },
  parameters: [
    {
      id: 'style',
      label: 'Style',
      kind: 'enum',
      options: ['rise', 'orbit', 'rain', 'starfield'],
      default: 'rise',
      modulatable: false,
    },
    {
      id: 'density',
      label: 'Density',
      kind: 'number',
      min: 0.2,
      max: 1,
      default: 0.6,
      modulatable: true,
    },
    {
      id: 'size',
      label: 'Size',
      kind: 'number',
      min: 0.002,
      max: 0.01,
      default: 0.0045,
      modulatable: true,
    },
    // the lattice offset is uTime * speed: modulating it would teleport the field
    {
      id: 'speed',
      label: 'Speed',
      kind: 'number',
      min: 0.2,
      max: 2,
      default: 0.8,
      modulatable: false,
    },
    {
      id: 'streak',
      label: 'Streak',
      kind: 'number',
      min: 0,
      max: 1,
      default: 0.4,
      modulatable: true,
    },
  ],
  cost: { passes: 0, relativeFill: 0.5, stateful: false },
};

export const particleFieldGenerator: InlineGenerator = {
  def: particleFieldDef,
  emit(ctx: EmitContext): string {
    const { fnName, uniform, nsUniform, seedUniform } = ctx;
    const uStyle = uniform('style');
    const uDensity = uniform('density');
    const uSize = uniform('size');
    const uSpeed = uniform('speed');
    const uStreak = uniform('streak');
    const rnd = `${fnName}_rnd`;
    const dot = `${fnName}_dot`;
    const lattice = `${fnName}_lattice`;
    return /* glsl */ `
// particleField helpers
float ${rnd}(ivec2 c, uint salt) {
  return synthRand(${seedUniform}, ${nsUniform}, synthHashCombine(synthHashCombine(uint(c.x), uint(c.y)), salt));
}
// a particle at c with a tail of length tail pointing along -dir; returns density
float ${dot}(vec2 p, vec2 c, vec2 dir, float tail, float rad, float px) {
  vec2 b = c - dir * tail;
  vec2 pa = p - c;
  vec2 ba = b - c;
  float t = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-10), 0.0, 1.0);
  float d = length(pa - ba * t);
  float w = max(rad * mix(1.0, 0.35, t), 0.6 * px);
  float core = 1.0 - smoothstep(w * 0.5, w * 0.5 + px, d);
  float glow = exp(-d * d / (w * w * 6.0)) * 0.45;
  return max(core, glow) * mix(1.0, 0.25, t);
}
// rising / falling lattice layer: q is the scrolled coordinate, cs the cell size
float ${lattice}(vec2 p, vec2 scroll, float cs, uint salt, float dens, vec2 dir, float tail, float rad, float sway, float px) {
  vec2 q = p - scroll;
  ivec2 c0 = ivec2(floor(q / cs));
  float v = 0.0;
  for (int j = -1; j <= 1; j++) {
    ivec2 c = c0 + ivec2(0, j);
    if (${rnd}(c, salt) > dens) continue;
    float rx = ${rnd}(c, salt + 1u);
    float ry = ${rnd}(c, salt + 2u);
    float rf = ${rnd}(c, salt + 3u);
    vec2 local = vec2(0.2 + 0.6 * rx, 0.15 + 0.7 * ry) * cs;
    local.x += sin(uTime * (0.8 + 1.4 * rf) + rf * 6.28318) * cs * 0.18 * sway;
    vec2 cp = (vec2(c) * cs + local) + scroll;
    float tw = 0.55 + 0.45 * sin(uTime * (1.5 + 3.0 * rx) + ry * 6.28318);
    v = max(v, ${dot}(p, cp, dir, tail, rad * (0.6 + 0.8 * rf), px) * tw);
  }
  return v;
}
// particleField source
float ${fnName}(vec2 p) {
  int style = clamp(${uStyle}, 0, 3);
  float dens = clamp(${uDensity}, 0.2, 1.0);
  float rad = clamp(${uSize}, 0.002, 0.01);
  float speed = clamp(${uSpeed}, 0.2, 2.0);
  float streak = clamp(${uStreak}, 0.0, 1.0);
  float px = clamp(max(fwidth(p.x), fwidth(p.y)), 1e-4, 0.05);
  float kick = 1.0 + 1.2 * clamp(uPunch, 0.0, 1.0) + 0.3 * clamp(uBeat, 0.0, 1.0);
  float t = uTime * speed;

  if (style == 0) {
    // rise: two parallax layers, faded in at the bottom and out at the top
    float v = 0.0;
    for (int l = 0; l < 2; l++) {
      float fl = float(l);
      float cs = 0.075 * (1.0 + 0.7 * fl);
      vec2 scroll = vec2(0.0, t * (0.09 + 0.06 * fl));
      float tail = cs * 0.6 * streak * kick;
      v = max(v, ${lattice}(p, scroll, cs, 0x100u + uint(l) * 16u, dens, vec2(0.0, 1.0), tail, rad * (1.0 + 0.4 * fl), 1.0, px) * (0.7 + 0.3 * fl));
    }
    float vert = smoothstep(-0.62, -0.25, p.y) * (1.0 - smoothstep(0.25, 0.6, p.y));
    return clamp(v * (0.35 + 0.65 * vert) * min(kick, 1.6), 0.0, 1.0);
  }

  if (style == 2) {
    // rain: thin fast streaks falling with a slight slant
    vec2 dir = normalize(vec2(0.18, -1.0));
    float cs = 0.06;
    vec2 scroll = dir * t * 0.55;
    float tail = cs * (0.5 + 1.0 * streak) * kick;
    float v = ${lattice}(p, scroll, cs, 0x200u, dens * 0.8, dir, tail, rad * 0.6, 0.0, px);
    return clamp(v * 0.9, 0.0, 1.0);
  }

  if (style == 1) {
    // orbit: concentric bands, each turning at its own hashed rate
    float bw = 0.055;
    float r = length(p);
    float band = floor(r / bw);
    ivec2 bandKey = ivec2(int(band), 0);
    float rate = (0.25 + 0.75 * ${rnd}(bandKey, 0x300u)) * (${rnd}(bandKey, 0x301u) < 0.5 ? 1.0 : -1.0);
    float rMid = (band + 0.5) * bw;
    float m = max(6.0, floor(6.28318 * rMid / 0.06));
    float rot = t * rate * 0.35;
    float a = atan(p.y, p.x) - rot;
    float cell = floor(a / 6.28318530718 * m);
    float v = 0.0;
    for (int j = -1; j <= 1; j++) {
      float cj = cell + float(j);
      float ci = mod(cj, m);
      ivec2 c = ivec2(int(band), int(ci));
      if (${rnd}(c, 0x310u) > dens) continue;
      float ra = ${rnd}(c, 0x311u);
      float rr = ${rnd}(c, 0x312u);
      float ang = (cj + 0.2 + 0.6 * ra) / m * 6.28318530718 + rot;
      float rad0 = (band + 0.25 + 0.5 * rr) * bw * (1.0 + 0.05 * clamp(uPunch, 0.0, 1.0));
      vec2 cp = vec2(cos(ang), sin(ang)) * rad0;
      vec2 tangent = vec2(-sin(ang), cos(ang)) * sign(rate);
      float tail = 6.28318 * rad0 / m * 0.8 * streak * kick;
      v = max(v, ${dot}(p, cp, tangent, tail, rad, px));
    }
    // keep the very centre and the far edge clear
    float ring = smoothstep(0.04, 0.1, r) * (1.0 - smoothstep(0.62, 0.8, r));
    return clamp(v * ring, 0.0, 1.0);
  }

  // starfield: depth slices streaming outward
  float v = 0.0;
  for (int l = 0; l < 4; l++) {
    float z = fract(float(l) * 0.25 + t * 0.12);
    float depth = mix(2.2, 0.08, z);
    float fade = smoothstep(0.0, 0.35, z) * (1.0 - smoothstep(0.88, 1.0, z));
    vec2 sp = p * depth;
    float cs = 0.24;
    ivec2 c0 = ivec2(floor(sp / cs));
    // the lattice is re-hashed every time a slice wraps, so stars never repeat
    uint salt = 0x400u + uint(l) * 16u + uint(int(floor(float(l) * 0.25 + t * 0.12))) * 64u;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        ivec2 c = c0 + ivec2(i, j);
        if (${rnd}(c, salt) > dens * 0.7) continue;
        vec2 local = vec2(${rnd}(c, salt + 1u), ${rnd}(c, salt + 2u)) * cs;
        vec2 sc = (vec2(c) * cs + local) / depth;
        float len = length(sc);
        vec2 dir = len > 1e-4 ? sc / len : vec2(0.0, 1.0);
        float tail = len * 0.35 * z * (0.2 + streak) * kick;
        v = max(v, ${dot}(p, sc, dir, tail, rad * (0.4 + 1.4 * z), px) * fade);
      }
    }
  }
  return clamp(v, 0.0, 1.0);
}
`.trim();
  },
};
