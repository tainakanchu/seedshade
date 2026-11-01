import { describe, expect, it } from 'vitest';
import { DEFAULT_SCENE_ID, defaultScene, scenes } from './index';

describe('scenes registry', () => {
  it('Semantic Synth is the only scene and the default', () => {
    expect(scenes).toHaveLength(1);
    expect(DEFAULT_SCENE_ID).toBe('semantic-synth');
    expect(scenes[0]!.id).toBe(DEFAULT_SCENE_ID);
    expect(defaultScene).toBe(scenes[0]);
  });
});
