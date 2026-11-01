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
    });
    expect(out).not.toHaveProperty('sceneId');
    expect(out).not.toHaveProperty('autoCycle');
  });
});
