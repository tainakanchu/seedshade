import type { GeneratorDefinition } from '../types';
import {
  TYPE_FIT_PARAM,
  TYPE_SCALE_PARAM,
  TYPE_SOFTNESS_PARAM,
  TYPE_TEXT_SLOT,
  TYPE_WEIGHT_PARAM,
} from './type';
import type { EmitContext, InlineGenerator } from './types';

/**
 * Type mask — cut whatever is already on screen with the shape of a string.
 *
 * A value modifier (`v = fn(v, p)`): knockout punches the letters out of the
 * picture, keep leaves only the letters, xor flips the picture inside them.
 * The text itself is never drawn — only the existing density is reshaped — so
 * it reads as lettering carved out of the generative layer.
 *
 * With no text assigned the mask is the identity in every mode (the dummy's
 * alpha 0 gates the effect), so an empty slot never blanks the frame.
 */
export const typeMaskDef: GeneratorDefinition = {
  id: 'typeMask',
  version: 1,
  category: 'modifier',
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
    {
      id: 'mode',
      label: 'Mode',
      kind: 'enum',
      options: ['knockout', 'keep', 'xor'],
      default: 'knockout',
      modulatable: false,
    },
    {
      id: 'amount',
      label: 'Amount',
      kind: 'number',
      min: 0,
      max: 1,
      default: 1,
      modulatable: true,
    },
    TYPE_WEIGHT_PARAM,
    TYPE_SOFTNESS_PARAM,
    TYPE_FIT_PARAM,
    TYPE_SCALE_PARAM,
  ],
  cost: { passes: 0, relativeFill: 0.3, stateful: false },
};

export const typeMaskGenerator: InlineGenerator = {
  def: typeMaskDef,
  preludes: ['typeLayout'],
  emit(ctx: EmitContext): string {
    const { fnName, uniform, texUniform, texSizeUniform } = ctx;
    const tex = texUniform(TYPE_TEXT_SLOT);
    const texSize = texSizeUniform(TYPE_TEXT_SLOT);
    return /* glsl */ `
// typeMask value modifier: mode 0=knockout, 1=keep, 2=xor
float ${fnName}(float v, vec2 p) {
  float mask;
  vec2 extent;
  vec2 uv = typePlace(p, ${texSize}, ${uniform('fit')}, ${uniform('scale')}, mask, extent);
  vec4 texel = texture(${tex}, uv);
  // present = 0 for the unassigned dummy → identity in every mode.
  float present = texel.a;
  float m = typeCoverage(texel.r, ${uniform('weight')}, ${uniform('softness')}, 0.0) * mask;
  float k = clamp(${uniform('amount')}, 0.0, 1.0) * present;
  int mode = ${uniform('mode')};
  float target;
  if (mode == 0) {
    target = v * (1.0 - m);
  } else if (mode == 1) {
    target = v * m;
  } else {
    target = v + m - 2.0 * v * m;
  }
  return clamp(mix(v, target, k), 0.0, 1.0);
}
`.trim();
  },
};
