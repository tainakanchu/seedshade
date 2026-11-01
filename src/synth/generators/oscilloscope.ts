import type { GeneratorDefinition } from '../types';
import type { EmitContext, InlineGenerator } from './types';

/**
 * Oscilloscope (オシロスコープ) — the legacy `waveform` scene: the live
 * time-domain signal as a thin glowing trace, read from the wave texture.
 *
 * The trace is a true distance field to the sample polyline: for the pixel's
 * column only the ±{@link SEGMENT_REACH} neighbouring segments are measured
 * (a steep transient is still found, because a segment that reaches the pixel
 * vertically has to start within a few columns of it), then a fwidth-AA'd core
 * plus a gaussian glow is drawn around it. So the line keeps a constant pixel
 * width at any slope and never aliases into stair steps.
 *
 * Layouts (legacy variants): line (one trace across the frame) · stacked
 * (`lines` lanes, each with its own trace) · circle (the trace wrapped around
 * a ring, mirrored so the seam is invisible).
 *
 * Silence reads as a flat line (classic idle scope), dimmed to ~55%.
 */
const SEGMENT_REACH = 5;

export const oscilloscopeDef: GeneratorDefinition = {
  id: 'oscilloscope',
  version: 1,
  category: 'source',
  costClass: 'light',
  impl: 'inline',
  output: 'field',
  tags: {
    material: ['oscilloscope', 'line', 'phosphor'],
    motion: ['wave', 'audio-reactive'],
    affect: ['technical', 'electric', 'retro-tech'],
  },
  parameters: [
    {
      id: 'amplitude',
      label: 'Amplitude',
      kind: 'number',
      min: 0.08,
      max: 0.45,
      default: 0.28,
      modulatable: true,
    },
    {
      id: 'thickness',
      label: 'Thickness',
      kind: 'number',
      min: 0.002,
      max: 0.014,
      default: 0.0045,
      modulatable: true,
    },
    { id: 'glow', label: 'Glow', kind: 'number', min: 0, max: 1, default: 0.55, modulatable: true },
    {
      id: 'layout',
      label: 'Layout',
      kind: 'enum',
      options: ['line', 'stacked', 'circle'],
      default: 'line',
      modulatable: false,
    },
    { id: 'lines', label: 'Lanes', kind: 'int', min: 2, max: 4, default: 3, modulatable: false },
    {
      id: 'radius',
      label: 'Radius',
      kind: 'number',
      min: 0.12,
      max: 0.36,
      default: 0.24,
      modulatable: true,
    },
  ],
  cost: { passes: 0, relativeFill: 0.35, stateful: false },
  audio: ['wave'],
};

export const oscilloscopeGenerator: InlineGenerator = {
  def: oscilloscopeDef,
  emit(ctx: EmitContext): string {
    const { fnName, uniform } = ctx;
    const uAmp = uniform('amplitude');
    const uThick = uniform('thickness');
    const uGlow = uniform('glow');
    const uLayout = uniform('layout');
    const uLines = uniform('lines');
    const uRadius = uniform('radius');
    const seg = `${fnName}_seg`;
    const trace = `${fnName}_trace`;
    const line = `${fnName}_line`;
    return /* glsl */ `
// oscilloscope helpers
float ${seg}(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float t = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-10), 0.0, 1.0);
  return length(pa - ba * t);
}
// distance from p to the trace y = cy + amp * wave(x) spanning x in [-halfW, halfW]
float ${trace}(vec2 p, float halfW, float cy, float amp) {
  float last = float(SYNTH_WAVE_SAMPLES - 1);
  float fi = clamp((p.x / (2.0 * halfW) + 0.5) * last, 0.0, last);
  int i0 = int(floor(fi));
  float dx = 2.0 * halfW / last;
  float d = 1e5;
  vec2 prev = vec2(-halfW + float(i0 - ${SEGMENT_REACH}) * dx, cy + amp * waveSample(i0 - ${SEGMENT_REACH}));
  for (int k = -${SEGMENT_REACH - 1}; k <= ${SEGMENT_REACH}; k++) {
    int i = i0 + k;
    vec2 cur = vec2(-halfW + float(i) * dx, cy + amp * waveSample(i));
    // segments past either end of the buffer would extrapolate a fake tail
    if (i > 0 && i - 1 < SYNTH_WAVE_SAMPLES - 1) d = min(d, ${seg}(p, prev, cur));
    prev = cur;
  }
  return d;
}
// AA core + glow around a distance d
float ${line}(float d, float th, float glow, float px) {
  float w = max(0.5 * th, 0.6 * px);
  float core = 1.0 - smoothstep(w, w + px, d);
  float halo = exp(-d * d / (w * w * 16.0)) * 0.45 * glow;
  return max(core, halo);
}
// oscilloscope source
float ${fnName}(vec2 p) {
  float amp = clamp(${uAmp}, 0.08, 0.45);
  float th = clamp(${uThick}, 0.002, 0.014);
  float glow = clamp(${uGlow}, 0.0, 1.0);
  int lay = clamp(${uLayout}, 0, 2);
  float aspect = max(uRes.x / max(uRes.y, 1.0), 0.1);
  float px = clamp(max(fwidth(p.x), fwidth(p.y)), 1e-4, 0.05);
  // a flat (silent) line is the idle look: keep it, but dimmer
  float live = 0.55 + 0.45 * smoothstep(0.0, 0.15, uLevel);
  float halfW = 0.5 * aspect;

  if (lay == 2) {
    // circle: r = R + amp * wave(x(th)), mirrored about the x axis (no seam)
    float rot = uTime * 0.12;
    float R = clamp(${uRadius}, 0.12, 0.36) * (1.0 + 0.18 * clamp(uBass, 0.0, 1.0));
    float ampC = amp * 0.45;
    float r = length(p);
    float ang = atan(p.y, p.x) - rot;
    float x = abs(fract(ang / 6.28318530718 + 0.5) * 2.0 - 1.0);
    float e = 0.004;
    float w0 = waveAt(x);
    float wp = waveAt(x + e);
    float wm = waveAt(x - e);
    // dR/dth: dx/dth = 1/pi in magnitude
    float g = ampC * (wp - wm) / (2.0 * e) / 3.14159265;
    float Rt = R + ampC * w0;
    float d = abs(r - Rt) / sqrt(1.0 + (g * g) / max(r * r, 0.0025));
    return clamp(${line}(d, th, glow, px) * live, 0.0, 1.0);
  }

  if (lay == 1) {
    float lanes = float(clamp(${uLines}, 2, 4));
    float lane = clamp(floor((p.y + 0.5) * lanes), 0.0, lanes - 1.0);
    float cy = -0.5 + (lane + 0.5) / lanes;
    float d = ${trace}(p, halfW, cy, amp / lanes);
    // outer lanes a touch dimmer, so the stack reads as depth rather than a grid
    float depth = 1.0 - 0.25 * abs((lane + 0.5) / lanes - 0.5) * 2.0;
    return clamp(${line}(d, th, glow, px) * live * depth, 0.0, 1.0);
  }

  float d = ${trace}(p, halfW, 0.0, amp);
  return clamp(${line}(d, th, glow, px) * live, 0.0, 1.0);
}
`.trim();
  },
};
