/**
 * GL side of the per-frame audio textures (data layout: ../audioTextures).
 *
 * One small Nx1 RGBA8 texture per kind, owned by whoever owns the context (the
 * scene, a thumbnail renderer). Textures are created lazily on the first
 * upload, so a session that never shows an audio-reading patch allocates
 * nothing.
 *
 * Filtering is LINEAR + CLAMP_TO_EDGE: `spectrumAt` / `waveAt` interpolate
 * between bins, while `waveSample` / `waveXYSample` use `texelFetch` and are
 * unaffected by the filter.
 */
import { AUDIO_TEXTURE_KINDS, AUDIO_TEXTURE_WIDTH, type AudioTextureKind } from '../audioTextures';
import { audioTextureUnit, type AssembledShader } from './assemble';

/** The one uniform setter this module needs (matches render/glutil's `Uniforms`). */
export interface SamplerUniformSetter {
  i1(name: string, v: number): void;
}

export interface AudioTextureSet {
  /** Replace one kind's texels (`AUDIO_TEXTURE_WIDTH[kind] * 4` bytes). */
  upload(kind: AudioTextureKind, texels: Uint8Array): void;
  /**
   * Bind every audio texture `assembled` reads to its unit and point the
   * sampler at it. A kind that was never uploaded gets a zero texture (silent
   * spectrum; for the wave that reads as a full-scale -1 line, so callers
   * should upload before the first draw). Leaves TEXTURE0 active.
   */
  bind(uni: SamplerUniformSetter, assembled: AssembledShader): void;
  /** Delete the textures (context still alive). */
  dispose(): void;
  /** Drop the handles without deleting (the context they belonged to is gone). */
  forget(): void;
}

export function createAudioTextureSet(gl: WebGL2RenderingContext): AudioTextureSet {
  const tex: Partial<Record<AudioTextureKind, WebGLTexture>> = {};

  function ensure(kind: AudioTextureKind): WebGLTexture | null {
    const existing = tex[kind];
    if (existing) return existing;
    const t = gl.createTexture();
    if (!t) return null;
    const width = AUDIO_TEXTURE_WIDTH[kind];
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      width,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array(width * 4),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    tex[kind] = t;
    return t;
  }

  return {
    upload(kind, texels) {
      const width = AUDIO_TEXTURE_WIDTH[kind];
      if (texels.length !== width * 4) {
        throw new Error(
          `audio texture "${kind}": expected ${width * 4} bytes, got ${texels.length}`,
        );
      }
      const t = ensure(kind);
      if (!t) return;
      gl.bindTexture(gl.TEXTURE_2D, t);
      // Texel bytes are data, not colour: never let the driver premultiply them.
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, 1, gl.RGBA, gl.UNSIGNED_BYTE, texels);
      gl.bindTexture(gl.TEXTURE_2D, null);
    },
    bind(uni, assembled) {
      if (assembled.audioTextures.length === 0) return;
      assembled.audioTextures.forEach((a, i) => {
        const unit = audioTextureUnit(assembled, i);
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, ensure(a.kind));
        uni.i1(a.name, unit);
      });
      gl.activeTexture(gl.TEXTURE0);
    },
    dispose() {
      for (const kind of AUDIO_TEXTURE_KINDS) {
        const t = tex[kind];
        if (t) gl.deleteTexture(t);
        delete tex[kind];
      }
    },
    forget() {
      for (const kind of AUDIO_TEXTURE_KINDS) delete tex[kind];
    },
  };
}
