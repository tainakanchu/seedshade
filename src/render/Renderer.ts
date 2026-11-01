import type { AudioEngine } from '../audio/AudioEngine';
import type { AudioFrame } from '../audio/types';
import type { GlScene, GlSceneContext } from '../scenes/types';
import type { Variation } from '../variation/types';
import type { Clock } from './clock';
import { realtimeClock } from './clock';

/** Degrees the base hue advances per second when cycling. */
const HUE_CYCLE_PER_SEC = 6;
/** Largest dt handed to the scene, so a stalled tab can't explode physics. */
const MAX_DT = 0.1;
/** Hard DPR cap for the laptop-iGPU GL canvas (procedural fullscreen passes). */
const GL_MAX_DPR = 1.5;

export interface RendererOptions {
  /** The WebGL2 canvas. */
  glCanvas: HTMLCanvasElement;
  /** The (single) scene to render. */
  scene: GlScene;
  engine: AudioEngine;
  /** Returns the live gain multiplier (0.5..4). */
  getGain: () => number;
  /** Returns the fixed hue, or null to cycle. */
  getFixedHue: () => number | null;
  /** Initial seeded variation (the renderer always holds one). */
  variation: Variation;
  /** Time source for the frame loop. Defaults to realtimeClock. */
  clock?: Clock;
}

/**
 * Owns the requestAnimationFrame loop, the WebGL2 canvas, DPR sizing and hue
 * cycling for the single scene. React never touches the canvas per frame.
 *
 * WebGL2 is required: when it is unavailable {@link Renderer.glAvailable} is
 * false and nothing is drawn (the UI shows an explicit message).
 */
export class Renderer {
  private readonly glCanvas: HTMLCanvasElement;
  private readonly scene: GlScene;
  private readonly engine: AudioEngine;
  private readonly getGain: () => number;
  private readonly getFixedHue: () => number | null;
  private readonly clock: Clock;

  private variation: Variation;

  // ---- WebGL2 ----
  private gl: WebGL2RenderingContext | null = null;
  private glSupported = false;
  /** Whether the scene's init() has run against the live context. */
  private sceneInited = false;

  private rafId = 0;
  private startTime = 0;
  private lastTime = 0;
  private hue = 200;

  // CSS-pixel logical size.
  private cssW = 0;
  private cssH = 0;
  // Physical drawing-buffer size of the GL canvas (DPR-capped).
  private glPxW = 0;
  private glPxH = 0;

  private readonly resizeObserver: ResizeObserver;

  constructor(opts: RendererOptions) {
    this.glCanvas = opts.glCanvas;
    this.scene = opts.scene;
    this.engine = opts.engine;
    this.getGain = opts.getGain;
    this.getFixedHue = opts.getFixedHue;
    this.variation = opts.variation;
    this.clock = opts.clock ?? realtimeClock;

    this.glCanvas.addEventListener('webglcontextlost', this.onContextLost);
    this.glCanvas.addEventListener('webglcontextrestored', this.onContextRestored);

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.glCanvas);
    window.addEventListener('resize', this.resize);

    if (this.ensureGl()) this.activateGl();
  }

  /** Whether a WebGL2 context could be obtained. False means nothing is drawn. */
  get glAvailable(): boolean {
    return this.glSupported;
  }

  /** Ensure the scene's resources exist and it is sized for the buffer. */
  private activateGl(): void {
    const gl = this.gl;
    if (!gl) return;
    if (!this.sceneInited) {
      this.scene.init(gl);
      this.sceneInited = true;
    }
    if (this.glPxW > 0 && this.glPxH > 0) {
      this.scene.resize?.(gl, this.glPxW, this.glPxH);
    }
    this.clearGl();
  }

  /**
   * Swap the seeded variation. The scene reads `va` per frame and derives
   * per-element values via va.rand, so a seed change needs no GPU churn — just
   * clear once for a clean snap.
   */
  setVariation(v: Variation): void {
    if (v === this.variation) return;
    this.variation = v;
    if (this.gl) this.clearGl();
  }

  /**
   * Base hue (0..360) before `variation.hueOffset` is folded in.
   * `Settings.fixedHue` writes this value; the scene sees `currentHue + hueOffset`.
   */
  get currentHue(): number {
    return this.hue;
  }

  start(): void {
    if (this.rafId) return;
    this.startTime = this.clock.now();
    this.lastTime = this.startTime;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  dispose(): void {
    this.stop();
    this.resizeObserver.disconnect();
    window.removeEventListener('resize', this.resize);
    this.glCanvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.glCanvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    const gl = this.gl;
    if (gl && this.sceneInited) this.scene.dispose(gl);
    this.sceneInited = false;
  }

  // ---- WebGL2 lifecycle ----------------------------------------------------

  /** Lazily create the WebGL2 context. Returns true if GL is usable. */
  private ensureGl(): boolean {
    if (this.gl) return true;
    const gl = this.glCanvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      this.glSupported = false;
      return false;
    }
    this.gl = gl;
    this.glSupported = true;
    // Premultiplied-alpha straight blend over the transparent page.
    // semanticSynth never touches blend state: it relies on this context-global setup.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.syncGlBufferSize();
    return true;
  }

  private clearGl(): void {
    const gl = this.gl;
    if (!gl) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.glPxW, this.glPxH);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  private readonly onContextLost = (e: Event): void => {
    e.preventDefault();
    // The context object is invalid now; drop it and forget the scene was
    // inited so it re-creates resources after restore.
    this.gl = null;
    this.sceneInited = false;
  };

  private readonly onContextRestored = (): void => {
    if (!this.ensureGl()) return;
    this.activateGl();
  };

  // ---- Sizing --------------------------------------------------------------

  private readonly resize = (): void => {
    this.cssW = this.glCanvas.clientWidth || window.innerWidth;
    this.cssH = this.glCanvas.clientHeight || window.innerHeight;
    this.syncGlBufferSize();
  };

  /** Resize the GL drawing buffer (DPR-capped) and notify the scene. */
  private syncGlBufferSize(): void {
    const dprGl = Math.max(1, Math.min(window.devicePixelRatio || 1, GL_MAX_DPR));
    const pxW = Math.max(1, Math.round(this.cssW * dprGl));
    const pxH = Math.max(1, Math.round(this.cssH * dprGl));
    const changed = pxW !== this.glPxW || pxH !== this.glPxH;
    this.glPxW = pxW;
    this.glPxH = pxH;
    const gl = this.gl;
    if (!gl) return;
    if (this.glCanvas.width !== pxW) this.glCanvas.width = pxW;
    if (this.glCanvas.height !== pxH) this.glCanvas.height = pxH;
    if (changed && this.sceneInited) {
      this.scene.resize?.(gl, pxW, pxH);
    }
  }

  // ---- Frame loop ----------------------------------------------------------

  private readonly tick = (_now: number): void => {
    this.rafId = requestAnimationFrame(this.tick);

    const now = this.clock.now();
    const t = (now - this.startTime) / 1000;
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > MAX_DT) dt = MAX_DT;
    if (dt < 0) dt = 0;

    const va = this.variation;

    // Advance / fix the base hue. Cycle speed scales with the variation.
    const fixed = this.getFixedHue();
    if (fixed != null) {
      this.hue = fixed;
    } else {
      this.hue = (this.hue + HUE_CYCLE_PER_SEC * va.speed * dt) % 360;
    }

    // The scene sees the variation's hueOffset folded into the base hue.
    const hue = (this.hue + va.hueOffset) % 360;

    const audio = this.engine.getFrame(this.getGain());
    this.drawGl(t, dt, audio, hue, va);
  };

  /** Clear the drawing buffer, then draw the scene. */
  private drawGl(t: number, dt: number, audio: AudioFrame, hue: number, va: Variation): void {
    const gl = this.gl;
    if (!gl || !this.sceneInited) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.glPxW, this.glPxH);
    // Clear to transparent each frame so the scene's premultiplied-alpha output
    // composites over a clean buffer (no feedback accumulation, transparency
    // preserved for OBS). Scenes that want feedback own their own FBOs.
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const sceneCtx: GlSceneContext = {
      gl,
      w: this.cssW,
      h: this.cssH,
      pxW: this.glPxW,
      pxH: this.glPxH,
      t,
      dt,
      audio,
      hue,
      va,
    };
    this.scene.draw(sceneCtx);
  }
}
