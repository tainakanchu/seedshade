import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCatalog } from './catalog';
import { DEFAULT_BUDGETS, estimateCost, fitsBudget } from './cost';
import { derivePatch } from './derive';
import { allGeneratorDefinitions, inlineCatalog, typeDef } from './generators';
import {
  applyPinnedText,
  getPinnedText,
  MAX_PINNED_NODES,
  pinIndexForOp,
  pinnedNodeFromPatch,
  sanitizePinnedText,
  setPinnedText,
  subscribePinnedText,
  withoutPinnedNode,
  withPinnedNode,
  withPinnedTexts,
  type PinnedText,
  type PinnedTextNode,
} from './pinnedText';
import { serializePatch } from './schema';
import type { VisualPatch } from './types';
import { validatePatch } from './validate';

const catalog = createCatalog(allGeneratorDefinitions());
const derive = (seed: string): VisualPatch => derivePatch(seed, { catalog: inlineCatalog });

const typeNode = (over: Partial<PinnedTextNode> = {}): PinnedTextNode => ({
  opId: 'type0',
  generatorId: 'type',
  parameters: {},
  text: { text: 'SEEDSHADE', font: 'serif', weight: 700 },
  ...over,
});
const maskNode = (over: Partial<PinnedTextNode> = {}): PinnedTextNode => ({
  opId: 'typeMask0',
  generatorId: 'typeMask',
  parameters: {},
  text: { text: 'MASK', font: 'serif', weight: 900 },
  ...over,
});
const warpNode = (over: Partial<PinnedTextNode> = {}): PinnedTextNode => ({
  opId: 'typeWarp0',
  generatorId: 'typeWarp',
  parameters: {},
  text: { text: 'WARP', font: 'serif', weight: 400 },
  ...over,
});

function inBudget(p: VisualPatch): boolean {
  return fitsBudget(estimateCost(p, catalog), DEFAULT_BUDGETS[p.qualityTier]).length === 0;
}

const catOf = (p: VisualPatch, cat: string): string[] =>
  p.operators.filter((o) => catalog.get(o.generatorId)?.category === cat).map((o) => o.id);

/** First seed (seed-0, seed-1, …) whose derived patch satisfies pred. */
function findSeed(pred: (p: VisualPatch) => boolean): string {
  for (let i = 0; i < 2000; i++) {
    const seed = `pin-seed-${i}`;
    if (pred(derive(seed))) return seed;
  }
  throw new Error('no seed found');
}

afterEach(() => {
  setPinnedText(null);
  vi.restoreAllMocks();
});

describe('applyPinnedText', () => {
  it('returns the input object itself when nothing is pinned', () => {
    const p = derive('no-pins');
    const bytes = serializePatch(p);
    expect(applyPinnedText(p, null, catalog)).toBe(p);
    expect(applyPinnedText(p, { nodes: [] }, catalog)).toBe(p);
    expect(serializePatch(p)).toBe(bytes);
  });

  it('grafts each kind with its text, keeping the opId and stage order', () => {
    const p = derive('graft-1');
    const pinned: PinnedText = { nodes: [typeNode(), maskNode(), warpNode()] };
    const out = applyPinnedText(p, pinned, catalog);
    expect(validatePatch(out, catalog)).toEqual([]);
    expect(inBudget(out)).toBe(true);
    expect(out.operators[0]!.id).toBe('type0'); // pinned source first
    expect(catOf(out, 'modifier')).toContain('typeMask0');
    expect(catOf(out, 'field')).toContain('typeWarp0');
    expect(out.texts).toEqual({
      'type0.text': pinned.nodes[0]!.text,
      'typeMask0.text': pinned.nodes[1]!.text,
      'typeWarp0.text': pinned.nodes[2]!.text,
    });
    // seed / palette / composition untouched; the input is not mutated.
    expect(out.seed).toBe(p.seed);
    expect(out.palette).toEqual(p.palette);
    expect('texts' in p).toBe(false);
  });

  it('is deterministic: same pins + same seed → same patch bytes', () => {
    const pinned: PinnedText = { nodes: [typeNode(), maskNode()] };
    for (const seed of ['d-1', 'd-2', 'd-3']) {
      const a = serializePatch(applyPinnedText(derive(seed), pinned, catalog));
      const b = serializePatch(applyPinnedText(derive(seed), pinned, catalog));
      expect(a).toBe(b);
    }
  });

  it('overlays pinned parameters on defaults and drops unknown ones', () => {
    const out = applyPinnedText(
      derive('params'),
      { nodes: [typeNode({ parameters: { scale: 0.5, bogus: 3, fit: 7 } })] },
      catalog,
    );
    const op = out.operators.find((o) => o.id === 'type0')!;
    expect(op.parameters.scale).toBe(0.5);
    expect('bogus' in op.parameters).toBe(false);
    // Wrong type for an enum falls back to the default.
    expect(op.parameters.fit).toBe(typeDef.parameters.find((p) => p.id === 'fit')!.default);
    expect(op.generatorVersion).toBe(typeDef.version);
  });

  it('makes room by evicting the last gacha operator of the same role, with its routes', () => {
    const seed = findSeed((p) => catOf(p, 'modifier').length === 3);
    const p = derive(seed);
    const lastMod = catOf(p, 'modifier')[2]!;
    const out = applyPinnedText(p, { nodes: [maskNode()] }, catalog);
    expect(validatePatch(out, catalog)).toEqual([]);
    expect(catOf(out, 'modifier')).toHaveLength(3);
    expect(catOf(out, 'modifier')).toContain('typeMask0');
    expect(out.operators.some((o) => o.id === lastMod)).toBe(false);
    expect(
      out.routes.some(
        (r) => r.target.startsWith(`${lastMod}.`) || r.source === `operator:${lastMod}`,
      ),
    ).toBe(false);
    // Other roles are left alone.
    expect(catOf(out, 'source')).toEqual(catOf(p, 'source'));
  });

  it('evicts a gacha source when a pinned type would be the third source', () => {
    const seed = findSeed((p) => catOf(p, 'source').length === 2);
    const p = derive(seed);
    const out = applyPinnedText(p, { nodes: [typeNode()] }, catalog);
    expect(validatePatch(out, catalog)).toEqual([]);
    expect(catOf(out, 'source')).toEqual(['type0', catOf(p, 'source')[0]]);
  });

  it('always yields a valid in-budget patch across many seeds', () => {
    const pinned: PinnedText = { nodes: [typeNode(), maskNode(), warpNode()] };
    let grafted = 0;
    for (let i = 0; i < 150; i++) {
      const p = derive(`many-${i}`);
      const out = applyPinnedText(p, pinned, catalog);
      expect(validatePatch(out, catalog)).toEqual([]);
      expect(inBudget(out)).toBe(true);
      if (out !== p) grafted++;
    }
    expect(grafted).toBe(150);
  });

  it('avoids an opId collision deterministically', () => {
    const p = derive('collide');
    const taken = p.operators[0]!.id;
    const out = applyPinnedText(p, { nodes: [typeNode({ opId: taken })] }, catalog);
    expect(out.operators.some((o) => o.id === `${taken}_pin`)).toBe(true);
    expect(out.texts?.[`${taken}_pin.text`]).toBeDefined();
    expect(validatePatch(out, catalog)).toEqual([]);
    expect(pinIndexForOp({ nodes: [typeNode({ opId: taken })] }, `${taken}_pin`)).toBe(0);
  });

  it('gives up (original patch + warn) when the pins can never fit', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const hugeType = { ...typeDef, cost: { ...typeDef.cost, passes: 99 } };
    const tight = createCatalog([
      ...allGeneratorDefinitions().filter((d) => d.id !== 'type'),
      hugeType,
    ]);
    const p = derive('give-up');
    expect(applyPinnedText(p, { nodes: [typeNode()] }, tight)).toBe(p);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('pinned text helpers', () => {
  it('pinnedNodeFromPatch snapshots a text node and refuses others', () => {
    const p = applyPinnedText(derive('snap'), { nodes: [maskNode()] }, catalog);
    const node = pinnedNodeFromPatch(p, 'typeMask0', catalog);
    expect(node).toMatchObject({
      opId: 'typeMask0',
      generatorId: 'typeMask',
      text: { text: 'MASK' },
    });
    expect(typeof pinnedNodeFromPatch(p, p.operators.at(-1)!.id, catalog)).toBe('string');
    expect(typeof pinnedNodeFromPatch(p, 'missing', catalog)).toBe('string');
  });

  it('withPinnedNode adds, replaces by opId, and caps the count', () => {
    let pins: PinnedText | null = null;
    for (let i = 0; i < MAX_PINNED_NODES; i++) {
      const next = withPinnedNode(pins, typeNode({ opId: `t${i}` }));
      expect(typeof next).toBe('object');
      pins = next as PinnedText;
    }
    expect(typeof withPinnedNode(pins, typeNode({ opId: 'over' }))).toBe('string');
    const replaced = withPinnedNode(pins, typeNode({ opId: 't1', parameters: { scale: 2 } }));
    expect((replaced as PinnedText).nodes[1]!.parameters).toEqual({ scale: 2 });
    expect((replaced as PinnedText).nodes).toHaveLength(MAX_PINNED_NODES);
  });

  it('withoutPinnedNode / withPinnedTexts', () => {
    const pins: PinnedText = { nodes: [typeNode(), maskNode()] };
    expect(withoutPinnedNode(pins)).toBeNull();
    expect(withoutPinnedNode(pins, 'type0')?.nodes.map((n) => n.opId)).toEqual(['typeMask0']);
    expect(withoutPinnedNode({ nodes: [typeNode()] }, 'type0')).toBeNull();
    const spec = { text: 'NEW', font: 'serif', weight: 500 };
    expect(withPinnedTexts(pins, spec, [1])?.nodes.map((n) => n.text.text)).toEqual([
      'SEEDSHADE',
      'NEW',
    ]);
    expect(withPinnedTexts(pins, pins.nodes[0]!.text, [0])).toBe(pins);
  });

  it('sanitizePinnedText drops bad nodes and duplicates, clamps text', () => {
    expect(sanitizePinnedText(null)).toBeNull();
    expect(sanitizePinnedText({ nodes: 'x' })).toBeNull();
    const out = sanitizePinnedText({
      nodes: [
        {
          opId: 'a',
          generatorId: 'type',
          parameters: { s: 1, bad: {} },
          text: { text: 'A', weight: 5000 },
        },
        { opId: 'a', generatorId: 'typeMask', parameters: {}, text: { text: 'dup' } },
        { opId: 'b', generatorId: 'noise', parameters: {}, text: { text: 'B' } },
      ],
    });
    expect(out?.nodes).toHaveLength(1);
    expect(out?.nodes[0]!.parameters).toEqual({ s: 1 });
    expect(out?.nodes[0]!.text.weight).toBe(900);
  });
});

describe('pinned text store', () => {
  it('notifies only on change', () => {
    const listener = vi.fn();
    const off = subscribePinnedText(listener);
    setPinnedText({ nodes: [typeNode()] });
    setPinnedText({ nodes: [typeNode()] });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getPinnedText()?.nodes[0]!.opId).toBe('type0');
    setPinnedText(null);
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    setPinnedText({ nodes: [maskNode()] });
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
