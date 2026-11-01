import type { Scene } from './types';
import { semanticSynthScene } from './semanticSynth';

/** The one scene Seedshade renders (single-scene app: Semantic Synth only). */
export const defaultScene: Scene = semanticSynthScene;

/** Scene registry. Always exactly one entry. */
export const scenes: Scene[] = [defaultScene];

export const DEFAULT_SCENE_ID = defaultScene.id;
