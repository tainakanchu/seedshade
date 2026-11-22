import type { GeneratorDefinition, ParameterDefinition } from '../types';
import type { EmitContext, InlineGenerator } from './types';

/**
 * Text-slot parameters shared by the three type nodes (type / typeMask /
 * typeWarp). Defined once so the placement behaves identically everywhere and
 * a docs table can list them together.
 */
export const TYPE_FIT_PARAM: ParameterDefinition = {
  id: 'fit',
  label: 'Fit',
  kind: 'enum',
  options: ['contain', 'cover', 'tile'],
  default: 'contain',
  modulatable: false,
};

export const TYPE_SCALE_PARAM: ParameterDefinition = {
  id: 'scale',
  label: 'Scale',
  kind: 'number',
  min: 0.2,
  max: 4,
  default: 0.9,
  modulatable: true,
};

export const TYPE_WEIGHT_PARAM: ParameterDefinition = {
  id: 'weight',
  label: 'Weight',
  kind: 'number',
  min: -1,
  max: 1,
  default: 0,
  modulatable: true,
};

export const TYPE_SOFTNESS_PARAM: ParameterDefinition = {
  id: 'softness',
  label: 'Softness',
  kind: 'number',
  min: 0,
  max: 1,
  default: 0.05,
  modulatable: true,
};

/** The one text slot every type node declares. */
export const TYPE_TEXT_SLOT = 'text';

/**
 * Type source — a string as the density field.
 *
 * The slot holds a signed distance field rasterized on the CPU (../texts.ts),
 * so the glyphs stay crisp at any scale and can be thickened, thinned,
 * outlined or blurred from the shader without re-rasterizing. Everything
 * downstream (modifiers, materials, fields) treats it like any other source.
 *
 * stagger uses the per-glyph index channel: each character bobs and pulses on
 * its own phase, so a word ripples letter by letter (harder on the beat).
 *
 * With no text assigned the scene binds the transparent dummy: the SDF reads
 * 0 (= far outside) and alpha 0, so v collapses to 0 — an empty frame.
 */
export const typeDef: GeneratorDefinition = {
  id: 'type',
  version: 1,
  category: 'source',
  costClass: 'light',
  impl: 'inline',
  output: 'field',
  textSlots: [TYPE_TEXT_SLOT],
  tags: {
    material: ['print', 'graphic', 'hard-edge'],
    culturalTexture: ['typography', 'signage'],
    affect: ['literal'],
  },
  parameters: [
    TYPE_FIT_PARAM,
    TYPE_SCALE_PARAM,
    TYPE_WEIGHT_PARAM,
    TYPE_SOFTNESS_PARAM,
    {
      id: 'outline',
      label: 'Outline',
      kind: 'number',
      min: 0,
      max: 1,
      default: 0,
      modulatable: true,
    },
    {
      id: 'stagger',
      label: 'Stagger',
      kind: 'number',
      min: 0,
      max: 1,
      default: 0,
      modulatable: true,
    },
    {
      id: 'invert',
      label: 'Invert',
      kind: 'bool',
      default: false,
      modulatable: false,
    },
  ],
  cost: { passes: 0, relativeFill: 0.35, stateful: false },
};

export const typeGenerator: InlineGenerator = {
  def: typeDef,
  preludes: ['typeLayout'],
  emit(ctx: EmitContext): string {
    const { fnName, uniform, texUniform, texSizeUniform } = ctx;
    const tex = texUniform(TYPE_TEXT_SLOT);
    const texSize = texSizeUniform(TYPE_TEXT_SLOT);
    return /* glsl */ `
// type source: text SDF as density (R = SDF, G = glyph index, A = present)
float ${fnName}(vec2 p) {
  float mask;
  vec2 extent;
  vec2 uv = typePlace(p, ${texSize}, ${uniform('fit')}, ${uniform('scale')}, mask, extent);
  float stagger = clamp(${uniform('stagger')}, 0.0, 1.0);

  // Per-glyph phase from the index channel; each letter bobs on its own beat.
  float glyph = texture(${tex}, uv).g;
  float phase = uTime * 3.0 - glyph * 6.28318530718 * 2.0;
  float kick = 0.6 + 0.4 * uPunch;
  float wave = sin(phase);
  uv.y -= stagger * 0.06 * wave * kick;
  if (${uniform('fit')} == 2) uv = fract(uv);

  vec4 texel = texture(${tex}, uv);
  float weight = ${uniform('weight')} + stagger * 0.35 * wave * kick;
  float cov = typeCoverage(texel.r, weight, ${uniform('softness')}, ${uniform('outline')});
  cov *= 1.0 - stagger * 0.35 * (0.5 - 0.5 * wave);
  float density = (${uniform('invert')} != 0) ? (1.0 - cov) : cov;
  // Alpha gates everything: no text bound → transparent dummy → v = 0.
  return clamp(density * texel.a * mask, 0.0, 1.0);
}
`.trim();
  },
};
