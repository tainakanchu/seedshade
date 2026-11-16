import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getSynthControl,
  normalizeTextKey,
  patchWithText,
  registerSynthControl,
  type SynthControlBackend,
  type SynthControlState,
} from './control';
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
