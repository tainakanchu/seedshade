import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getSynthControl,
  normalizeTextKey,
  patchWithText,
  patchWithTextAll,
  registerSynthControl,
  type SynthControlBackend,
  type SynthControlState,
} from './control';
import { getPinnedText, setPinnedText } from './pinnedText';
import { DEFAULT_TEXT_FONT, DEFAULT_TEXT_WEIGHT } from './texts';
import type { VisualPatch } from './types';

function patch(overrides: Partial<VisualPatch> = {}): VisualPatch {
  return {
    schemaVersion: 1,
    seed: 's',
    operators: [
      { id: 'type0', generatorId: 'type', generatorVersion: 1, parameters: {} },
      { id: 'mat', generatorId: 'neon', generatorVersion: 1, parameters: {} },
    ],
    routes: [],
    palette: { mode: 'mono', hueOffset: 0, saturation: 50, lightness: 50 },
    composition: { symmetry: 1, scale: 1, speed: 1 },
    qualityTier: 'medium',
    ...overrides,
  };
}

function backend(current: VisualPatch | null, target?: VisualPatch | null) {
  const proposePatch = vi.fn((_: unknown) => ({ ok: true, issues: [] as string[] }));
  const b: SynthControlBackend = {
    getState: () => ({ currentPatch: current }) as SynthControlState,
    proposePatch,
    proposeSeed: () => {},
    setImage: async () => ({ ok: true, issues: [] }),
    applyTimelineOp: () => ({ ok: true }),
    fireExternal: () => {},
    startRecording: () => {},
    stopRecording: () => null,
    loadRecording: () => ({ ok: true, issues: [] }),
    ...(target !== undefined ? { targetPatch: () => target } : {}),
  };
  return { b, proposePatch };
}

let unregister: (() => void) | null = null;
afterEach(() => {
  unregister?.();
  unregister = null;
  setPinnedText(null);
});

describe('synth/control text helpers', () => {
  it('normalizeTextKey fills in the default slot', () => {
    expect(normalizeTextKey('type0')).toBe('type0.text');
    expect(normalizeTextKey(' type0.text ')).toBe('type0.text');
    expect(normalizeTextKey('a.title')).toBe('a.title');
  });

  it('patchWithText sets, inherits font / weight, and clears', () => {
    const first = patchWithText(patch(), 'type0', { text: 'HI' });
    expect(first.texts).toEqual({
      'type0.text': { text: 'HI', font: DEFAULT_TEXT_FONT, weight: DEFAULT_TEXT_WEIGHT },
    });
    const styled = patchWithText(first, 'type0.text', { text: 'HI', font: 'serif', weight: 300 });
    const retyped = patchWithText(styled, 'type0', { text: 'BYE' });
    expect(retyped.texts?.['type0.text']).toEqual({ text: 'BYE', font: 'serif', weight: 300 });

    const cleared = patchWithText(retyped, 'type0', null);
    // The last entry gone → the field is gone, so the JSON is the pre-text shape.
    expect('texts' in cleared).toBe(false);
    expect(cleared.operators).toBe(retyped.operators);
  });

  it('patchWithText does not touch the input patch', () => {
    const p = patch({ texts: { 'type0.text': { text: 'A', font: 'serif', weight: 400 } } });
    const snapshot = JSON.stringify(p);
    patchWithText(p, 'type0', { text: 'B' });
    patchWithText(p, 'type0', null);
    expect(JSON.stringify(p)).toBe(snapshot);
  });
});

describe('synth/control setText', () => {
  it('reports no scene when nothing is registered', () => {
    const res = getSynthControl().setText('type0', { text: 'A' });
    expect(res.ok).toBe(false);
    expect(res.issues[0]).toMatch(/no synth scene/);
  });

  it('proposes the current patch with only texts replaced', () => {
    const current = patch();
    const { b, proposePatch } = backend(current);
    unregister = registerSynthControl(b);

    const res = getSynthControl().setText('type0', { text: 'SEED', font: 'serif', weight: 900 });
    expect(res.ok).toBe(true);
    expect(proposePatch).toHaveBeenCalledTimes(1);
    const proposed = proposePatch.mock.calls[0]![0] as VisualPatch;
    expect(proposed.texts).toEqual({ 'type0.text': { text: 'SEED', font: 'serif', weight: 900 } });
    // Operators untouched → same topology → no shader recompile downstream.
    expect(proposed.operators).toEqual(current.operators);
    expect({ ...proposed, texts: undefined }).toEqual({ ...current, texts: undefined });
  });

  it('builds on the newest target, not the patch still on screen', () => {
    const onScreen = patch({ seed: 'old' });
    const target = patch({ seed: 'new' });
    const { b, proposePatch } = backend(onScreen, target);
    unregister = registerSynthControl(b);

    getSynthControl().setText('type0', { text: 'X' });
    expect((proposePatch.mock.calls[0]![0] as VisualPatch).seed).toBe('new');
  });

  it('passes the gate result through, and refuses without a patch', () => {
    const { b, proposePatch } = backend(patch());
    proposePatch.mockReturnValueOnce({ ok: false, issues: ['unknown_text_slot'] });
    unregister = registerSynthControl(b);
    expect(getSynthControl().setText('mat', { text: 'X' })).toEqual({
      ok: false,
      issues: ['unknown_text_slot'],
    });
    unregister();

    const empty = backend(null);
    unregister = registerSynthControl(empty.b);
    expect(getSynthControl().setText('type0', { text: 'X' }).ok).toBe(false);
    expect(empty.proposePatch).not.toHaveBeenCalled();
  });

  it('null clears the slot', () => {
    const { b, proposePatch } = backend(
      patch({ texts: { 'type0.text': { text: 'A', font: 'serif', weight: 400 } } }),
    );
    unregister = registerSynthControl(b);
    getSynthControl().setText('type0.text', null);
    expect('texts' in (proposePatch.mock.calls[0]![0] as VisualPatch)).toBe(false);
  });
});

/** type0 + typeMask0 + typeWarp0 + a material — three text slots. */
function linkedPatch(overrides: Partial<VisualPatch> = {}): VisualPatch {
  return patch({
    operators: [
      { id: 'type0', generatorId: 'type', generatorVersion: 1, parameters: {} },
      { id: 'tw', generatorId: 'typeWarp', generatorVersion: 1, parameters: {} },
      { id: 'tm', generatorId: 'typeMask', generatorVersion: 1, parameters: {} },
      { id: 'mat', generatorId: 'neon', generatorVersion: 1, parameters: {} },
    ],
    ...overrides,
  });
}
const slotsOf = (id: string): string[] | undefined =>
  ['type', 'typeMask', 'typeWarp'].includes(id) ? ['text'] : undefined;

describe('synth/control patchWithTextAll (text link)', () => {
  it('writes one spec to every text slot, inheriting font / weight from the first assigned', () => {
    const p = linkedPatch({ texts: { 'tw.text': { text: 'old', font: 'serif', weight: 300 } } });
    const out = patchWithTextAll(p, { text: 'SAME' }, slotsOf);
    const spec = { text: 'SAME', font: 'serif', weight: 300 };
    expect(out.texts).toEqual({ 'type0.text': spec, 'tw.text': spec, 'tm.text': spec });
    expect(out.operators).toBe(p.operators);
  });

  it('null clears every slot; no slots returns the input itself', () => {
    const p = linkedPatch({
      texts: {
        'type0.text': { text: 'A', font: 'serif', weight: 400 },
        'tm.text': { text: 'B', font: 'serif', weight: 400 },
      },
    });
    expect('texts' in patchWithTextAll(p, null, slotsOf)).toBe(false);
    const none = patch({
      operators: [{ id: 'mat', generatorId: 'neon', generatorVersion: 1, parameters: {} }],
    });
    expect(patchWithTextAll(none, { text: 'X' }, slotsOf)).toBe(none);
  });

  it('does not touch the input patch', () => {
    const p = linkedPatch({ texts: { 'tw.text': { text: 'old', font: 'serif', weight: 300 } } });
    const snapshot = JSON.stringify(p);
    patchWithTextAll(p, { text: 'N', weight: 900 }, slotsOf);
    expect(JSON.stringify(p)).toBe(snapshot);
  });
});

describe('synth/control setText("*") and pins', () => {
  it('setText("*") proposes once with every slot set', () => {
    const { b, proposePatch } = backend(linkedPatch());
    unregister = registerSynthControl(b);
    expect(getSynthControl().setText('*', { text: 'ALL', weight: 500 }).ok).toBe(true);
    expect(proposePatch).toHaveBeenCalledTimes(1);
    const texts = (proposePatch.mock.calls[0]![0] as VisualPatch).texts!;
    expect(Object.keys(texts).sort()).toEqual(['tm.text', 'tw.text', 'type0.text']);
    expect(new Set(Object.values(texts).map((t) => JSON.stringify(t))).size).toBe(1);
  });

  it('setText("*") with no text slots is refused without proposing', () => {
    const { b, proposePatch } = backend(
      patch({
        operators: [{ id: 'mat', generatorId: 'neon', generatorVersion: 1, parameters: {} }],
      }),
    );
    unregister = registerSynthControl(b);
    expect(getSynthControl().setText('*', { text: 'X' }).ok).toBe(false);
    expect(proposePatch).not.toHaveBeenCalled();
  });

  it('pinText(opId) snapshots the node without proposing a patch', () => {
    const current = linkedPatch({
      operators: [
        { id: 'type0', generatorId: 'type', generatorVersion: 1, parameters: { scale: 0.7 } },
        { id: 'mat', generatorId: 'neon', generatorVersion: 1, parameters: {} },
      ],
      texts: { 'type0.text': { text: 'PIN', font: 'serif', weight: 800 } },
    });
    const { b, proposePatch } = backend(current);
    unregister = registerSynthControl(b);
    const res = getSynthControl().pinText('type0');
    expect(res).toMatchObject({ ok: true, opId: 'type0' });
    expect(getPinnedText()).toEqual({
      nodes: [
        {
          opId: 'type0',
          generatorId: 'type',
          parameters: { scale: 0.7 },
          text: { text: 'PIN', font: 'serif', weight: 800 },
        },
      ],
    });
    expect(proposePatch).not.toHaveBeenCalled();

    // Pinning a non-text node or an unknown id is refused.
    expect(getSynthControl().pinText('mat').ok).toBe(false);
    expect(getSynthControl().pinText('nope').ok).toBe(false);
    expect(getPinnedText()?.nodes).toHaveLength(1);
  });

  it('pinText(node) pins a definition directly with a fresh pin<n> id', () => {
    const res = getSynthControl().pinText({ generatorId: 'typeMask', text: 'HI' });
    expect(res.ok).toBe(true);
    expect(res.opId).toBe('pin0');
    expect(getPinnedText()?.nodes[0]).toMatchObject({
      opId: 'pin0',
      generatorId: 'typeMask',
      text: { text: 'HI', font: DEFAULT_TEXT_FONT, weight: DEFAULT_TEXT_WEIGHT },
    });
    expect(getSynthControl().pinText({ generatorId: 'grid', text: 'X' }).ok).toBe(false);
    expect(getSynthControl().pinText({ generatorId: 'type', text: 'B' }).opId).toBe('pin1');
  });

  it('unpinText removes one or all, and reports unknown ids', () => {
    getSynthControl().pinText({ generatorId: 'type', text: 'A' });
    getSynthControl().pinText({ generatorId: 'typeWarp', text: 'B' });
    expect(getSynthControl().unpinText('nope').ok).toBe(false);
    expect(
      getSynthControl()
        .unpinText('pin0')
        .pinned?.nodes.map((n) => n.opId),
    ).toEqual(['pin1']);
    expect(getSynthControl().unpinText().pinned).toBeNull();
    expect(getSynthControl().getPinnedText()).toBeNull();
  });

  it('a text edit on a pinned node follows into the pin; "*" updates every pin', () => {
    const current = linkedPatch({
      texts: { 'type0.text': { text: 'A', font: 'serif', weight: 400 } },
    });
    const { b } = backend(current);
    unregister = registerSynthControl(b);
    getSynthControl().pinText('type0');
    getSynthControl().pinText({ generatorId: 'typeWarp', text: 'other' });

    getSynthControl().setText('type0', { text: 'EDIT' });
    expect(getPinnedText()?.nodes.map((n) => n.text.text)).toEqual(['EDIT', 'other']);

    // Editing an unpinned slot leaves the pins alone.
    getSynthControl().setText('tm', { text: 'zzz' });
    expect(getPinnedText()?.nodes.map((n) => n.text.text)).toEqual(['EDIT', 'other']);

    getSynthControl().setText('*', { text: 'LINK', weight: 900 });
    expect(getPinnedText()?.nodes.map((n) => [n.text.text, n.text.weight])).toEqual([
      ['LINK', 900],
      ['LINK', 900],
    ]);
  });

  it('a rejected setText does not touch the pins', () => {
    const { b, proposePatch } = backend(linkedPatch());
    unregister = registerSynthControl(b);
    getSynthControl().pinText({ generatorId: 'type', text: 'KEEP', opId: 'type0' });
    proposePatch.mockReturnValueOnce({ ok: false, issues: ['nope'] });
    getSynthControl().setText('type0', { text: 'LOST' });
    expect(getPinnedText()?.nodes[0]?.text.text).toBe('KEEP');
  });
});
