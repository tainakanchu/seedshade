/**
 * Seeded value-noise + FBM GLSL, shared by the ported fog / ink / aurora
 * generators. Not a generator itself (index.ts does not register it).
 *
 * The lattice hash is the Patch's integer RNG (`synthHashCombine` /
 * `synthHashU32`), not the usual `fract(sin(...))` trick: integer hashes are
 * bit-exact across GPUs, so the same Patch draws the same smoke everywhere.
 * The seed/namespace pair is folded once per call into `base`.
 *
 * Emits, prefixed with `prefix` so several generators can coexist in a patch:
 *   float <prefix>_vnoise(vec2 q, uint base)
 *   float <prefix>_fbm(vec2 q, uint base, int octaves)   // ~0..1, octaves <= 6
 *   uint  <prefix>_base()                                // seed ⊕ namespace
 */
export function valueNoiseGlsl(prefix: string, seedUniform: string, nsUniform: string): string {
  return /* glsl */ `
uint ${prefix}_base() {
  return synthHashCombine(${seedUniform}, ${nsUniform});
}
float ${prefix}_h(uint base, ivec2 c) {
  uint h = synthHashCombine(base, synthHashCombine(uint(c.x), uint(c.y)));
  return float(h >> 8u) / 16777216.0;
}
float ${prefix}_vnoise(vec2 q, uint base) {
  vec2 i = floor(q);
  vec2 f = q - i;
  vec2 u = f * f * (3.0 - 2.0 * f);
  ivec2 c = ivec2(i);
  float a = ${prefix}_h(base, c);
  float b = ${prefix}_h(base, c + ivec2(1, 0));
  float d = ${prefix}_h(base, c + ivec2(0, 1));
  float e = ${prefix}_h(base, c + ivec2(1, 1));
  return mix(mix(a, b, u.x), mix(d, e, u.x), u.y);
}
float ${prefix}_fbm(vec2 q, uint base, int octaves) {
  float sum = 0.0;
  float amp = 0.5;
  float norm = 0.0;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    sum += amp * ${prefix}_vnoise(q, base + uint(i) * 0x9e3779b9u);
    norm += amp;
    q = q * 2.03 + vec2(5.2, 1.3);
    amp *= 0.5;
  }
  return sum / max(norm, 1e-4);
}
`.trim();
}
