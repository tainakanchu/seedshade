import type { GeneratorDefinition } from '../types';
import { TYPE_FIT_PARAM, TYPE_SCALE_PARAM, TYPE_TEXT_SLOT } from './type';
import type { EmitContext, InlineGenerator } from './types';

/**
 * Type warp — the shape of a string bends space, but is never drawn.
 *
 * A displacement field (`p += fn(p) * amount`) along the gradient of the text
 * SDF: push moves sample points out of the letters, pull draws them in, swirl
 * slides them along the outlines. Whatever source sits below picks up a ghost
 * of the lettering — readable as a lens, not as ink.
 *
 * The SDF is clamped to a band around the outlines (see ../texts.ts), so the
 * gradient — and the warp — fades to 0 away from the glyphs. With no text
 * assigned the dummy reads flat 0 everywhere: no gradient, no displacement.
 */
export const typeWarpDef: GeneratorDefinition = {
  id: 'typeWarp',
  version: 1,
  category: 'field',
  costClass: 'light',
  impl: 'inline',
  output: 'vector',
  textSlots: [TYPE_TEXT_SLOT],
  tags: {
    material: ['graphic'],
    culturalTexture: ['typography', 'signage'],
    motion: ['warp'],
    affect: ['literal', 'optical'],
  },
  parameters: [
    {
      id: 'amount',
      label: 'Amount',
      kind: 'number',
      min: 0,
      max: 1,
      default: 0.3,
      modulatable: true,
    },
    {
      id: 'radius',
      label: 'Radius',
      kind: 'number',
      min: 0.05,
      max: 1,
      default: 0.5,
      modulatable: true,
    },
    {
      id: 'mode',
      label: 'Mode',
      kind: 'enum',
      options: ['push', 'pull', 'swirl'],
      default: 'push',
      modulatable: false,
    },
    TYPE_FIT_PARAM,
    TYPE_SCALE_PARAM,
  ],
  cost: { passes: 0, relativeFill: 0.4, stateful: false },
};

export const typeWarpGenerator: InlineGenerator = {
  def: typeWarpDef,
  preludes: ['typeLayout'],
  emit(ctx: EmitContext): string {
    const { fnName, uniform, texUniform, texSizeUniform } = ctx;
    const tex = texUniform(TYPE_TEXT_SLOT);
    const texSize = texSizeUniform(TYPE_TEXT_SLOT);
    return /* glsl */ `
// typeWarp field: displacement along the text SDF gradient (amount applied in main)
// mode 0=push (out of the letters), 1=pull (into them), 2=swirl (along outlines)
vec2 ${fnName}(vec2 p) {
  float mask;
  vec2 extent;
  vec2 uv = typePlace(p, ${texSize}, ${uniform('fit')}, ${uniform('scale')}, mask, extent);
  vec2 e = 1.5 / max(${texSize}, vec2(1.0));
  float c = texture(${tex}, uv).r;
  float gx = texture(${tex}, uv + vec2(e.x, 0.0)).r - texture(${tex}, uv - vec2(e.x, 0.0)).r;
  float gy = texture(${tex}, uv + vec2(0.0, e.y)).r - texture(${tex}, uv - vec2(0.0, e.y)).r;
  // uv-space gradient → p-space direction (uv = p / extent + 0.5).
  vec2 g = vec2(gx, gy) / extent;
  float glen = length(g);
  if (glen < 1e-5) return vec2(0.0);
  vec2 n = g / glen; // points into the glyphs

  // Strongest on the outline (sdf = 0.5), fading over radius (in SDF units).
  float r = clamp(${uniform('radius')}, 0.05, 1.0) * 0.5;
  float influence = 1.0 - smoothstep(0.0, r, abs(c - 0.5));
  // Don't fold the flat, clamped region outside the band into a cliff.
  influence *= smoothstep(0.0, 0.02, c) * mask;

  int mode = ${uniform('mode')};
  vec2 dir = (mode == 0) ? -n : (mode == 1) ? n : vec2(-n.y, n.x);
  return dir * influence * 0.08;
}
`.trim();
  },
};
