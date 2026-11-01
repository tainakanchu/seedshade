/**
 * Audio textures — per-frame spectrum / waveform data for generators that opt in.
 *
 * The scalar audio uniforms (`uBass`, `uLevel`, …) are enough for most
 * generators, but a spectrum analyser or an oscilloscope needs the *shape* of
 * the sound. A generator asks for it by declaring `audio: ['spectrum']` and/or
 * `audio: ['wave']` on its definition; the assembler then declares
 * `uSpectrum` / `uWave` samplers plus small GLSL helpers (see
 * {@link AUDIO_TEXTURE_GLSL}), and the scene uploads one tiny Nx1 RGBA8
 * texture per kind each frame. Patches with no such generator never see any of
 * this — their shader source is byte-identical to a build without the feature.
 *
 * This module is pure (no GL): binning, smoothing and texel packing live here
 * so they can be unit-tested, and the GPU harness / measurement tooling can
 * build the exact same texels the app would.
 *
 * ## Texel layout (RGBA8, height 1)
 *
 * `uSpectrum` — {@link SPECTRUM_BINS} texels, low → high frequency, log-spaced:
 *   - R: smoothed magnitude 0..1 (fast attack, slower release)
 *   - G: peak-hold 0..1 (holds, then falls at a constant rate; never below R)
 *   - B: raw (unsmoothed) binned magnitude 0..1
 *   - A: 255
 *
 * `uWave` — {@link WAVE_SAMPLES} texels:
 *   - R: oscilloscope sample across the whole analyser buffer, 0..1 (0.5 = silence)
 *   - G: Lissajous X sample (first ¾ of the buffer)
 *   - B: Lissajous Y sample — the G sample delayed by a quarter of the buffer
 *   - A: 255
 *
 * ## Idle / headless contract
 *
 * - App, audio stopped (`AudioFrame.running === false`): the spectrum releases
 *   to all-zero (R/G/B = 0) through the normal smoothing, the wave is flat
 *   silence (R/G/B = 128 ≈ 0.5). Generators must therefore render (near-)empty
 *   with an idle spectrum and a flat line / dot with an idle wave.
 * - Headless (GPU tests, `pnpm measure:coverage`, `pnpm vj:preview`): the
 *   harness binds the fixed, time-independent synthetic signal from
 *   {@link syntheticSpectrumTexels} / {@link syntheticWaveTexels}. It is the
 *   texture-side counterpart of the harness's "every audio uniform = 0.5"
 *   frame, so the measurements stay deterministic and still show the look.
 */

export type AudioTextureKind = 'spectrum' | 'wave';

/** Canonical declaration / binding order. Never reorder: units follow it. */
export const AUDIO_TEXTURE_KINDS: readonly AudioTextureKind[] = ['spectrum', 'wave'];

/** sampler2D uniform name per kind. */
export const AUDIO_TEXTURE_UNIFORM: Readonly<Record<AudioTextureKind, string>> = {
  spectrum: 'uSpectrum',
  wave: 'uWave',
};

/** Texel count of the spectrum texture. */
export const SPECTRUM_BINS = 128;
/** Texel count of the wave texture. */
export const WAVE_SAMPLES = 256;

/** Texel count per kind. */
export const AUDIO_TEXTURE_WIDTH: Readonly<Record<AudioTextureKind, number>> = {
  spectrum: SPECTRUM_BINS,
  wave: WAVE_SAMPLES,
};

/**
 * Highest analyser bin used, as a fraction of the bin count. Above ~60% of
 * Nyquist music carries almost nothing and the bars at the right edge would sit
 * dead — the legacy Bars scene made the same cut.
 */
export const SPECTRUM_MAX_FRACTION = 0.6;

/** Smoothing time constants, seconds. */
export const SPECTRUM_ATTACK_S = 0.03;
export const SPECTRUM_RELEASE_S = 0.16;
/** How long a peak cap holds before it starts to fall, seconds. */
export const SPECTRUM_PEAK_HOLD_S = 0.3;
/** Fall rate of a released peak cap, units (0..1) per second. */
export const SPECTRUM_PEAK_FALL_PER_S = 0.45;
/** Frame steps longer than this are clamped (stalled tab / first frame). */
export const SPECTRUM_MAX_DT_S = 0.1;

/** Sort and dedupe a generator's requested kinds into canonical order. */
export function canonicalAudioKinds(kinds: Iterable<AudioTextureKind>): AudioTextureKind[] {
  const want = new Set(kinds);
  return AUDIO_TEXTURE_KINDS.filter((k) => want.has(k));
}

// ---------------------------------------------------------------------------
// binning
// ---------------------------------------------------------------------------

/**
 * Log-spaced band edges over `[1, freqLen * maxFraction)` — `bins + 1` integers,
 * strictly increasing, so every band covers at least one analyser bin (the
 * low end is narrower than one bin per band at 1024 bins / 128 bands, so a
 * plain log spacing would leave empty bands there).
 */
export function logBandEdges(
  freqLen: number,
  bins: number = SPECTRUM_BINS,
  maxFraction: number = SPECTRUM_MAX_FRACTION,
): Int32Array {
  const edges = new Int32Array(bins + 1);
  if (freqLen <= 0 || bins <= 0) return edges;
  const lo = 1;
  const hi = Math.max(lo + bins, Math.floor(freqLen * maxFraction));
  const top = Math.min(hi, freqLen);
  if (top - lo < bins) {
    // Fewer analyser bins than bands (tiny FFT): bands share bins, linearly.
    for (let i = 0; i <= bins; i++) edges[i] = Math.floor((i * (freqLen - 1)) / bins);
    return edges;
  }
  edges[0] = lo;
  for (let i = 1; i <= bins; i++) {
    const t = i / bins;
    const ideal = Math.floor(lo * Math.pow(hi / lo, t));
    // at least one bin per band, and never past the end of the data
    const prev = edges[i - 1]!;
    edges[i] = Math.min(top - (bins - i), Math.max(prev + 1, ideal));
  }
  return edges;
}

/**
 * Bin analyser magnitudes (0..255) into `out` (0..1), taking the max of each
 * log band — a peak meter reads better than an average for music.
 */
export function binSpectrum(
  freq: ArrayLike<number>,
  out: Float32Array,
  edges: Int32Array = logBandEdges(freq.length, out.length),
): Float32Array {
  const bins = out.length;
  for (let i = 0; i < bins; i++) {
    const a = edges[i]!;
    const b = Math.max(a + 1, edges[i + 1]!);
    let m = 0;
    for (let k = a; k < b && k < freq.length; k++) {
      const v = freq[k]!;
      if (v > m) m = v;
    }
    out[i] = m / 255;
  }
  return out;
}

// ---------------------------------------------------------------------------
// spectrum smoother
// ---------------------------------------------------------------------------

/** The part of `AudioFrame` the spectrum needs (keeps this module audio-agnostic). */
export interface SpectrumInput {
  freq: ArrayLike<number>;
  /** Gained loudness 0..1 — scales the bars like the legacy scene did. */
  level: number;
  running: boolean;
}

export interface SpectrumSmoother {
  /** Advance by `dt` seconds. Call once per rendered frame, decks or not. */
  update(input: SpectrumInput, dt: number): void;
  /** Smoothed magnitudes (R). */
  readonly smoothed: Float32Array;
  /** Peak-hold values (G). */
  readonly peaks: Float32Array;
  /** Raw binned magnitudes of the last update (B). */
  readonly raw: Float32Array;
  /** Pack into RGBA8 texels (reuses `out` when it is the right size). */
  pack(out?: Uint8Array): Uint8Array;
  /** Back to silence (zeros, no held peaks). */
  reset(): void;
}

function toByte(v: number): number {
  return Math.round(Math.min(1, Math.max(0, v)) * 255);
}

/**
 * CPU-side attack/release smoothing + peak hold for the spectrum texture.
 *
 * Time-constant based (not "lerp 0.25 per frame") so the look does not depend
 * on the display's refresh rate. The raw band value is scaled by
 * `0.5 + level * 1.5`, mirroring the legacy Bars scene, so the gain slider
 * still drives the bar heights.
 */
export function createSpectrumSmoother(bins: number = SPECTRUM_BINS): SpectrumSmoother {
  const smoothed = new Float32Array(bins);
  const peaks = new Float32Array(bins);
  const raw = new Float32Array(bins);
  /** Seconds each peak has been held. */
  const holdAge = new Float32Array(bins);
  let edges: Int32Array = new Int32Array(0);
  let edgesFor = -1;

  return {
    smoothed,
    peaks,
    raw,
    update(input, dtIn) {
      const dt = Math.min(SPECTRUM_MAX_DT_S, Math.max(0, Number.isFinite(dtIn) ? dtIn : 0));
      if (input.running && input.freq.length > 0) {
        if (edgesFor !== input.freq.length) {
          edges = logBandEdges(input.freq.length, bins);
          edgesFor = input.freq.length;
        }
        binSpectrum(input.freq, raw, edges);
        const gain = 0.5 + Math.min(1, Math.max(0, input.level)) * 1.5;
        for (let i = 0; i < bins; i++) raw[i] = Math.min(1, raw[i]! * gain);
      } else {
        raw.fill(0);
      }
      if (dt === 0) return;
      const kAttack = 1 - Math.exp(-dt / SPECTRUM_ATTACK_S);
      const kRelease = 1 - Math.exp(-dt / SPECTRUM_RELEASE_S);
      for (let i = 0; i < bins; i++) {
        const target = raw[i]!;
        const cur = smoothed[i]!;
        const s = cur + (target - cur) * (target > cur ? kAttack : kRelease);
        smoothed[i] = s;
        const pk = peaks[i]!;
        if (s >= pk) {
          peaks[i] = s;
          holdAge[i] = 0;
        } else {
          const age = holdAge[i]! + dt;
          holdAge[i] = age;
          if (age > SPECTRUM_PEAK_HOLD_S) {
            peaks[i] = Math.max(s, pk - SPECTRUM_PEAK_FALL_PER_S * dt);
          }
        }
      }
    },
    pack(out) {
      const buf = out && out.length === bins * 4 ? out : new Uint8Array(bins * 4);
      for (let i = 0; i < bins; i++) {
        const o = i * 4;
        buf[o] = toByte(smoothed[i]!);
        buf[o + 1] = toByte(peaks[i]!);
        buf[o + 2] = toByte(raw[i]!);
        buf[o + 3] = 255;
      }
      return buf;
    },
    reset() {
      smoothed.fill(0);
      peaks.fill(0);
      raw.fill(0);
      holdAge.fill(0);
    },
  };
}

// ---------------------------------------------------------------------------
// wave
// ---------------------------------------------------------------------------

/**
 * Pack analyser time-domain bytes (128 = silence) into the wave texels.
 *
 * R spans the whole buffer (oscilloscope). G/B are the Lissajous pair: X from
 * the first three quarters, Y the same sample a quarter-buffer later — so Y
 * never runs off the end (the legacy scene clamped there, which flattened the
 * last quarter of the figure into a straight line).
 */
export function packWave(
  wave: ArrayLike<number>,
  running: boolean,
  out?: Uint8Array,
  samples: number = WAVE_SAMPLES,
): Uint8Array {
  const buf = out && out.length === samples * 4 ? out : new Uint8Array(samples * 4);
  const len = wave.length;
  if (!running || len === 0) {
    for (let i = 0; i < samples; i++) {
      const o = i * 4;
      buf[o] = 128;
      buf[o + 1] = 128;
      buf[o + 2] = 128;
      buf[o + 3] = 255;
    }
    return buf;
  }
  const quarter = Math.floor(len / 4);
  const scopeSpan = len - 1;
  const xySpan = Math.max(0, len - quarter - 1);
  for (let i = 0; i < samples; i++) {
    const t = samples > 1 ? i / (samples - 1) : 0;
    const iScope = Math.round(t * scopeSpan);
    const iX = Math.round(t * xySpan);
    const o = i * 4;
    buf[o] = wave[iScope]! & 255;
    buf[o + 1] = wave[iX]! & 255;
    buf[o + 2] = wave[Math.min(len - 1, iX + quarter)]! & 255;
    buf[o + 3] = 255;
  }
  return buf;
}

// ---------------------------------------------------------------------------
// fixed signals
// ---------------------------------------------------------------------------

/** All-silent spectrum texels (what the app shows once the release has run out). */
export function idleSpectrumTexels(bins: number = SPECTRUM_BINS): Uint8Array {
  const buf = new Uint8Array(bins * 4);
  for (let i = 0; i < bins; i++) buf[i * 4 + 3] = 255;
  return buf;
}

/** Flat-silence wave texels. */
export function idleWaveTexels(samples: number = WAVE_SAMPLES): Uint8Array {
  return packWave([], false, undefined, samples);
}

/**
 * Deterministic synthetic spectrum for headless rendering: a bass-heavy
 * downward slope with a few formant-like bumps, peaks a little above the body.
 * Pure function of the bin index — no time, no RNG.
 */
export function syntheticSpectrumTexels(bins: number = SPECTRUM_BINS): Uint8Array {
  const buf = new Uint8Array(bins * 4);
  for (let i = 0; i < bins; i++) {
    const x = bins > 1 ? i / (bins - 1) : 0;
    const slope = 0.82 * Math.exp(-1.6 * x);
    const bumps =
      0.22 * Math.exp(-(((x - 0.18) / 0.05) ** 2)) +
      0.16 * Math.exp(-(((x - 0.47) / 0.07) ** 2)) +
      0.1 * Math.exp(-(((x - 0.76) / 0.06) ** 2));
    const ripple = 0.07 * (0.5 + 0.5 * Math.sin(i * 1.37) * Math.cos(i * 0.61));
    const body = Math.min(0.95, slope + bumps + ripple);
    const o = i * 4;
    buf[o] = toByte(body);
    buf[o + 1] = toByte(Math.min(1, body + 0.06 + 0.04 * (0.5 + 0.5 * Math.sin(i * 0.9))));
    buf[o + 2] = toByte(body);
    buf[o + 3] = 255;
  }
  return buf;
}

/** Synthetic time-domain signal, -1..1, at buffer position u (0..1). */
function syntheticWaveAt(u: number): number {
  const tau = Math.PI * 2;
  return (
    0.5 * Math.sin(tau * 3 * u) +
    0.22 * Math.sin(tau * 7 * u + 1.1) +
    0.12 * Math.sin(tau * 13 * u + 0.4) +
    0.06 * Math.sin(tau * 29 * u + 2.3)
  );
}

/**
 * Deterministic synthetic wave texels, laid out exactly like {@link packWave}
 * would lay out a real buffer carrying {@link syntheticWaveAt}.
 */
export function syntheticWaveTexels(samples: number = WAVE_SAMPLES): Uint8Array {
  const len = 2048;
  const wave = new Uint8Array(len);
  for (let k = 0; k < len; k++) {
    wave[k] = Math.round(128 + 110 * syntheticWaveAt(k / len));
  }
  return packWave(wave, true, undefined, samples);
}

/** Texels for one kind in a headless render. */
export function headlessAudioTexels(
  kind: AudioTextureKind,
  signal: 'synthetic' | 'idle' = 'synthetic',
): Uint8Array {
  if (kind === 'spectrum') {
    return signal === 'idle' ? idleSpectrumTexels() : syntheticSpectrumTexels();
  }
  return signal === 'idle' ? idleWaveTexels() : syntheticWaveTexels();
}

// ---------------------------------------------------------------------------
// GLSL
// ---------------------------------------------------------------------------

/**
 * Declarations + helpers per kind, emitted by the assembler only when some
 * operator in the patch opts in. Every coordinate argument is 0..1 along the
 * texture; out-of-range values clamp to the edge texel.
 */
export const AUDIO_TEXTURE_GLSL: Readonly<Record<AudioTextureKind, string>> = {
  spectrum: /* glsl */ `
// ---- audio texture: spectrum (${SPECTRUM_BINS} log bins; r=smoothed g=peak b=raw) ----
uniform sampler2D ${AUDIO_TEXTURE_UNIFORM.spectrum};
const int SYNTH_SPECTRUM_BINS = ${SPECTRUM_BINS};
// smoothed magnitude 0..1, x = 0 lowest band .. 1 highest (linear-filtered)
float spectrumAt(float x) {
  return texture(${AUDIO_TEXTURE_UNIFORM.spectrum}, vec2(clamp(x, 0.0, 1.0), 0.5)).r;
}
// peak-hold 0..1 (>= spectrumAt)
float spectrumPeakAt(float x) {
  return texture(${AUDIO_TEXTURE_UNIFORM.spectrum}, vec2(clamp(x, 0.0, 1.0), 0.5)).g;
}
// raw (unsmoothed) magnitude 0..1
float spectrumRawAt(float x) {
  return texture(${AUDIO_TEXTURE_UNIFORM.spectrum}, vec2(clamp(x, 0.0, 1.0), 0.5)).b;
}
`.trim(),
  wave: /* glsl */ `
// ---- audio texture: wave (${WAVE_SAMPLES} samples; r=scope g,b=lissajous x,y) ----
uniform sampler2D ${AUDIO_TEXTURE_UNIFORM.wave};
const int SYNTH_WAVE_SAMPLES = ${WAVE_SAMPLES};
// oscilloscope sample -1..1 at x = 0..1 across the buffer (linear-filtered)
float waveAt(float x) {
  return texture(${AUDIO_TEXTURE_UNIFORM.wave}, vec2(clamp(x, 0.0, 1.0), 0.5)).r * 2.0 - 1.0;
}
// oscilloscope sample -1..1, exact texel i (0..SYNTH_WAVE_SAMPLES-1)
float waveSample(int i) {
  return texelFetch(${AUDIO_TEXTURE_UNIFORM.wave}, ivec2(clamp(i, 0, SYNTH_WAVE_SAMPLES - 1), 0), 0).r * 2.0 - 1.0;
}
// Lissajous X/Y pair -1..1, exact texel i
vec2 waveXYSample(int i) {
  return texelFetch(${AUDIO_TEXTURE_UNIFORM.wave}, ivec2(clamp(i, 0, SYNTH_WAVE_SAMPLES - 1), 0), 0).gb * 2.0 - 1.0;
}
`.trim(),
};
