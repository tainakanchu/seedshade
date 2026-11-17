import { describe, expect, it } from 'vitest';
import { sanitizeSettings, type Settings } from './useSettings';

describe('sanitizeSettings', () => {
  it('ignores retired scene / auto-cycle fields from old stored settings', () => {
    const stored = {
      sceneId: 'bars',
      autoCycle: true,
      cycleSeconds: 12,
      cycleMode: 'bars',
      cycleBars: 8,
      gain: 2,
      hueMode: 'fixed',
      fixedHue: 90,
      background: 'transparent',
      autoGacha: true,
      gachaBars: 16,
      deviceId: 'dev-1',
      seed: 'my-seed',
    };
    const out = sanitizeSettings(stored as unknown as Settings);
    expect(out).toEqual({
      gain: 2,
      hueMode: 'fixed',
      fixedHue: 90,
      background: 'transparent',
      autoGacha: true,
      gachaBars: 16,
      deviceId: 'dev-1',
      seed: 'my-seed',
      textLink: true,
      pinnedText: null,
    });
    expect(out).not.toHaveProperty('sceneId');
    expect(out).not.toHaveProperty('autoCycle');
  });

  it('keeps textLink and a well-formed pinnedText through a JSON round trip', () => {
    const base = sanitizeSettings({} as Settings);
    const pinnedText = {
      nodes: [
        {
          opId: 'type0',
          generatorId: 'type' as const,
          parameters: { scale: 0.8, fit: 'width' },
          text: { text: 'SEED', font: 'serif', weight: 900 },
        },
      ],
    };
    const stored = JSON.parse(
      JSON.stringify(sanitizeSettings({ ...base, textLink: false, pinnedText })),
    ) as Settings;
    const out = sanitizeSettings(stored);
    expect(out.textLink).toBe(false);
    expect(out.pinnedText).toEqual(pinnedText);
  });

  it('defaults textLink on and drops malformed pinnedText', () => {
    const base = sanitizeSettings({} as Settings);
    expect(base.textLink).toBe(true);
    expect(base.pinnedText).toBeNull();
    const bad = sanitizeSettings({
      ...base,
      textLink: 'yes' as unknown as boolean,
      pinnedText: {
        nodes: [
          { opId: 'x', generatorId: 'grid', parameters: {}, text: { text: 'A' } },
          { opId: 'a.b', generatorId: 'type', parameters: {}, text: { text: 'A' } },
        ],
      } as unknown as Settings['pinnedText'],
    });
    expect(bad.textLink).toBe(true);
    expect(bad.pinnedText).toBeNull();
  });
});
