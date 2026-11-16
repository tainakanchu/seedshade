import { describe, expect, it } from 'vitest';
import { createCatalog } from '../synth/catalog';
import { allGeneratorDefinitions, typeDef, typeMaskDef, typeWarpDef } from '../synth/generators';
import type { VisualPatch } from '../synth/types';
import { validatePatch } from '../synth/validate';
import { DEFAULT_NEW_TEXT, listTextSlots, patchWithTextNode } from './textSlots';

const catalog = createCatalog(allGeneratorDefinitions());

function basePatch(): VisualPatch {
  return {
    schemaVersion: 1,
    seed: 's',
    operators: [
      { id: 'src0', generatorId: 'grid', generatorVersion: 1, parameters: {} },
      { id: 'src1', generatorId: 'stripes', generatorVersion: 1, parameters: {} },
      { id: 'mod0', generatorId: 'mirror', generatorVersion: 1, parameters: {} },
      { id: 'mat0', generatorId: 'neon', generatorVersion: 1, parameters: {} },
    ],
    routes: [
      {
        source: 'audio:bass',
        target: 'src1.count',
        amount: 0.2,
        polarity: 'unipolar',
        smoothing: 0.1,
      },
    ],
    palette: { mode: 'mono', hueOffset: 0, saturation: 50, lightness: 50 },
    composition: { symmetry: 1, scale: 1, speed: 1 },
    qualityTier: 'medium',
  };
}

describe('ui/textSlots', () => {
  it('adds each text node as a valid patch with the default string', () => {
    for (const def of [typeDef, typeMaskDef, typeWarpDef]) {
      const { patch, key } = patchWithTextNode(basePatch(), def);
      expect(validatePatch(patch, catalog), def.id).toEqual([]);
      expect(patch.texts?.[key]?.text).toBe(DEFAULT_NEW_TEXT);
      expect(listTextSlots(patch).map((s) => s.key)).toEqual([key]);
    }
  });

  it('a third source evicts the last one along with routes aimed at it', () => {
    const { patch } = patchWithTextNode(basePatch(), typeDef);
    expect(patch.operators[0]!.generatorId).toBe('type');
    expect(patch.operators.some((o) => o.id === 'src1')).toBe(false);
    expect(patch.routes).toEqual([]);
  });

  it('picks a fresh op id when one is taken', () => {
    const first = patchWithTextNode(basePatch(), typeMaskDef).patch;
    const second = patchWithTextNode(first, typeMaskDef);
    expect(second.key).toBe('typeMask1.text');
  });

  it('lists empty slots too', () => {
    const p = basePatch();
    p.operators.push({ id: 'w', generatorId: 'typeWarp', generatorVersion: 1, parameters: {} });
    expect(listTextSlots(p)).toEqual([
      { key: 'w.text', opId: 'w', slot: 'text', generatorId: 'typeWarp', spec: null },
    ]);
  });
});
