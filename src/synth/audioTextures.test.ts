import { describe, expect, it } from 'vitest';
import {
  AUDIO_TEXTURE_KINDS,
  AUDIO_TEXTURE_WIDTH,
  binSpectrum,
  canonicalAudioKinds,
  createSpectrumSmoother,
  headlessAudioTexels,
  idleSpectrumTexels,
  idleWaveTexels,
  logBandEdges,
  packWave,
  SPECTRUM_ATTACK_S,
  SPECTRUM_BINS,
  SPECTRUM_PEAK_FALL_PER_S,
  SPECTRUM_PEAK_HOLD_S,
  syntheticSpectrumTexels,
  syntheticWaveTexels,
  WAVE_SAMPLES,
} from './audioTextures';

const FRAME = 1 / 60;

function freqWith(len: number, fill: (i: number) => number): Uint8Array {
  const f = new Uint8Array(len);
  for (let i = 0; i < len; i++) f[i] = fill(i);
  return f;
}

describe('audioTextures: log binning', () => {
  it('edges are strictly increasing, start at bin 1 and end at 60% of the bins', () => {
    const e = logBandEdges(1024, SPECTRUM_BINS);
    expect(e.length).toBe(SPECTRUM_BINS + 1);
    expect(e[0]).toBe(1);
    expect(e[SPECTRUM_BINS]).toBe(Math.floor(1024 * 0.6));
    for (let i = 1; i < e.length; i++) expect(e[i]!).toBeGreaterThan(e[i - 1]!);
  });

  it('is log-spaced: high bands are much wider than low bands', () => {
    const e = logBandEdges(1024, SPECTRUM_BINS);
    const low = e[1]! - e[0]!;
    const high = e[SPECTRUM_BINS]! - e[SPECTRUM_BINS - 1]!;
    expect(high).toBeGreaterThan(low * 10);
  });

  it('degrades to shared linear bands when the FFT is tiny', () => {
    const e = logBandEdges(32, SPECTRUM_BINS);
    for (let i = 1; i < e.length; i++) expect(e[i]!).toBeGreaterThanOrEqual(e[i - 1]!);
    expect(e[SPECTRUM_BINS]!).toBeLessThan(32);
    const out = binSpectrum(
      freqWith(32, () => 255),
      new Float32Array(SPECTRUM_BINS),
      e,
    );
    expect(Array.from(out).every((v) => v === 1)).toBe(true);
  });

  it('takes the max of each band, normalised to 0..1', () => {
    const freq = new Uint8Array(1024);
    const e = logBandEdges(1024, SPECTRUM_BINS);
    // one loud bin inside the last band
    freq[e[SPECTRUM_BINS - 1]! + 1] = 204;
    const out = binSpectrum(freq, new Float32Array(SPECTRUM_BINS), e);
    expect(out[SPECTRUM_BINS - 1]).toBeCloseTo(0.8, 6);
    expect(out.slice(0, SPECTRUM_BINS - 1).every((v) => v === 0)).toBe(true);
  });
});

describe('audioTextures: spectrum smoother', () => {
  const loud = { freq: freqWith(1024, () => 255), level: 1, running: true };
  const silent = { freq: new Uint8Array(1024), level: 0, running: true };

  it('attacks fast and releases slower', () => {
    const s = createSpectrumSmoother();
    s.update(loud, SPECTRUM_ATTACK_S);
    // one attack time constant → 1 - 1/e of the way
    expect(s.smoothed[0]).toBeCloseTo(1 - Math.exp(-1), 5);
    for (let i = 0; i < 60; i++) s.update(loud, FRAME);
    expect(s.smoothed[0]).toBeGreaterThan(0.99);
    s.update(silent, FRAME);
    const afterOne = s.smoothed[0]!;
    // release is slower than attack: one frame of silence drops less than one frame of sound rose
    expect(1 - afterOne).toBeLessThan(1 - Math.exp(-FRAME / SPECTRUM_ATTACK_S));
    expect(afterOne).toBeLessThan(1);
  });

  it('holds the peak, then lets it fall at a constant rate, never below the body', () => {
    const s = createSpectrumSmoother();
    for (let i = 0; i < 60; i++) s.update(loud, FRAME);
    const top = s.peaks[0]!;
    expect(top).toBeGreaterThan(0.99);
    // still holding just before the hold time runs out
    let t = 0;
    while (t + FRAME < SPECTRUM_PEAK_HOLD_S - 1e-6) {
      s.update(silent, FRAME);
      t += FRAME;
    }
    expect(s.peaks[0]).toBe(top);
    expect(s.smoothed[0]!).toBeLessThan(top);
    // then it falls at SPECTRUM_PEAK_FALL_PER_S
    s.update(silent, FRAME);
    s.update(silent, FRAME);
    const a = s.peaks[0]!;
    s.update(silent, FRAME);
    const b = s.peaks[0]!;
    expect(a - b).toBeCloseTo(SPECTRUM_PEAK_FALL_PER_S * FRAME, 5);
    for (let i = 0; i < 600; i++) {
      s.update(silent, FRAME);
      expect(s.peaks[0]!).toBeGreaterThanOrEqual(s.smoothed[0]!);
    }
  });

  it('releases to all-zero texels once audio stops', () => {
    const s = createSpectrumSmoother();
    for (let i = 0; i < 30; i++) s.update(loud, FRAME);
    for (let i = 0; i < 600; i++)
      s.update({ freq: new Uint8Array(0), level: 0, running: false }, FRAME);
    expect(Array.from(s.pack())).toEqual(Array.from(idleSpectrumTexels()));
  });

  it('scales the bands by the gained level, like the legacy Bars scene', () => {
    const half = { freq: freqWith(1024, () => 102), level: 0, running: true };
    const s = createSpectrumSmoother();
    s.update(half, FRAME);
    expect(s.raw[10]).toBeCloseTo((102 / 255) * 0.5, 6);
    s.update({ ...half, level: 1 }, FRAME);
    expect(s.raw[10]).toBeCloseTo(Math.min(1, (102 / 255) * 2), 6);
  });

  it('clamps a stalled frame and ignores dt <= 0 / NaN', () => {
    const a = createSpectrumSmoother();
    const b = createSpectrumSmoother();
    a.update(loud, 5);
    b.update(loud, 0.1);
    expect(Array.from(a.smoothed)).toEqual(Array.from(b.smoothed));
    const c = createSpectrumSmoother();
    c.update(loud, 0);
    c.update(loud, Number.NaN);
    c.update(loud, -1);
    expect(c.smoothed.every((v) => v === 0)).toBe(true);
  });

  it('packs RGBA8 = smoothed / peak / raw / 255, reusing the output buffer', () => {
    const s = createSpectrumSmoother();
    for (let i = 0; i < 10; i++) s.update(loud, FRAME);
    const buf = new Uint8Array(SPECTRUM_BINS * 4);
    const out = s.pack(buf);
    expect(out).toBe(buf);
    expect(out[0]).toBe(Math.round(s.smoothed[0]! * 255));
    expect(out[1]).toBe(Math.round(s.peaks[0]! * 255));
    expect(out[2]).toBe(255);
    expect(out[3]).toBe(255);
    s.reset();
    expect(Array.from(s.pack())).toEqual(Array.from(idleSpectrumTexels()));
  });

  it('is deterministic for the same input sequence', () => {
    const run = () => {
      const s = createSpectrumSmoother();
      for (let k = 0; k < 90; k++) {
        s.update(
          { freq: freqWith(1024, (i) => (i * 7 + k * 13) % 256), level: 0.6, running: true },
          FRAME,
        );
      }
      return Array.from(s.pack());
    };
    expect(run()).toEqual(run());
  });
});

describe('audioTextures: wave packing', () => {
  it('idle / empty wave is flat silence (128)', () => {
    const idle = idleWaveTexels();
    expect(idle.length).toBe(WAVE_SAMPLES * 4);
    for (let i = 0; i < WAVE_SAMPLES; i++) {
      expect([idle[i * 4], idle[i * 4 + 1], idle[i * 4 + 2], idle[i * 4 + 3]]).toEqual([
        128, 128, 128, 255,
      ]);
    }
    expect(Array.from(packWave(new Uint8Array(2048).fill(200), false))).toEqual(Array.from(idle));
  });

  it('R spans the whole buffer; B is G delayed by a quarter buffer', () => {
    const len = 2048;
    const ramp = freqWith(len, (i) => Math.floor((i / len) * 256));
    const out = packWave(ramp, true);
    // R: first and last sample of the buffer
    expect(out[0]).toBe(ramp[0]);
    expect(out[(WAVE_SAMPLES - 1) * 4]).toBe(ramp[len - 1]);
    // G/B: the quarter-buffer pair, B never clamped to the end of the buffer
    for (const i of [0, 37, 128, WAVE_SAMPLES - 1]) {
      const t = i / (WAVE_SAMPLES - 1);
      const iX = Math.round(t * (len - len / 4 - 1));
      expect(out[i * 4 + 1]).toBe(ramp[iX]);
      expect(out[i * 4 + 2]).toBe(ramp[iX + len / 4]);
    }
  });
});

describe('audioTextures: headless signals', () => {
  it('synthetic texels have the right size, are opaque and non-trivial', () => {
    for (const kind of AUDIO_TEXTURE_KINDS) {
      const tx = headlessAudioTexels(kind, 'synthetic');
      expect(tx.length).toBe(AUDIO_TEXTURE_WIDTH[kind] * 4);
      const r = new Set<number>();
      for (let i = 0; i < AUDIO_TEXTURE_WIDTH[kind]; i++) {
        expect(tx[i * 4 + 3]).toBe(255);
        r.add(tx[i * 4]!);
      }
      expect(r.size).toBeGreaterThan(20);
    }
  });

  it('synthetic spectrum peaks never sit below the body', () => {
    const tx = syntheticSpectrumTexels();
    for (let i = 0; i < SPECTRUM_BINS; i++)
      expect(tx[i * 4 + 1]!).toBeGreaterThanOrEqual(tx[i * 4]!);
  });

  it('synthetic signals are pure (byte-identical on every call)', () => {
    expect(Array.from(syntheticSpectrumTexels())).toEqual(Array.from(syntheticSpectrumTexels()));
    expect(Array.from(syntheticWaveTexels())).toEqual(Array.from(syntheticWaveTexels()));
  });

  it('idle signals are the app-side idle contract', () => {
    expect(Array.from(headlessAudioTexels('spectrum', 'idle'))).toEqual(
      Array.from(idleSpectrumTexels()),
    );
    expect(Array.from(headlessAudioTexels('wave', 'idle'))).toEqual(Array.from(idleWaveTexels()));
  });

  it('canonicalAudioKinds dedupes and orders spectrum before wave', () => {
    expect(canonicalAudioKinds(['wave', 'spectrum', 'wave'])).toEqual(['spectrum', 'wave']);
    expect(canonicalAudioKinds([])).toEqual([]);
  });
});
