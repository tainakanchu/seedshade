import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioEngine } from './audio/AudioEngine';
import { initDeckHost, type DeckHostHandlers } from './deck/host';
import { openSceneDeck } from './deck/openDeck';
import type { DeckAppState, DeckCommand } from './deck/protocol';
import { Renderer } from './render/Renderer';
import { defaultScene } from './scenes';
import { initBridgeClient } from './synth/bridgeClient';
import { getSynthControl } from './synth/control';
import { rerollPatch } from './synth/derive';
import { inlineCatalog } from './synth/generators';
import { serializePatch } from './synth/schema';
import { ControlPanel } from './ui/ControlPanel';
import { TimelinePanel } from './ui/TimelinePanel';
import { sanitizeSettings, useSettings, type Settings } from './ui/useSettings';
import { generateVariation, randomSeed } from './variation/generate';

/** Milliseconds of mouse inactivity before the panel + cursor fade out. */
const IDLE_TIMEOUT_MS = 3000;

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || el.isContentEditable;
}

async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    // Fullscreen may be blocked; ignore.
  }
}

export function App(): React.ReactElement {
  const { settings, update, initialUiHidden } = useSettings();

  const variation = useMemo(() => generateVariation(settings.seed), [settings.seed]);

  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<AudioEngine | null>(null);
  const rendererRef = useRef<Renderer | null>(null);

  // Whether WebGL2 is usable. Seedshade requires it; false shows an explicit message.
  const [glAvailable, setGlAvailable] = useState(true);

  // Latest settings, readable from the rAF/engine callbacks without re-binding.
  const settingsRef = useRef<Settings>(settings);
  settingsRef.current = settings;

  // Host snapshots settingsRef on the same tick as runCommand. Write the ref
  // before React's setState so deck:state after a command is not stale.
  const applyUpdate = useCallback(
    (patch: Partial<Settings>) => {
      const next: Partial<Settings> = { ...patch };
      if (next.fixedHue !== undefined) {
        const hue = next.fixedHue;
        next.fixedHue = Number.isFinite(hue)
          ? Math.min(360, Math.max(0, hue))
          : settingsRef.current.fixedHue;
      }
      settingsRef.current = sanitizeSettings({ ...settingsRef.current, ...next });
      update(next);
    },
    [update],
  );

  // Latest variation, readable at Renderer-construction time.
  const variationRef = useRef(variation);
  variationRef.current = variation;

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  // Panel lock-hidden (H key / ui=hide) vs. transient idle fade.
  const [panelHidden, setPanelHidden] = useState(initialUiHidden);
  const [idle, setIdle] = useState(false);

  // ---- Engine + Renderer lifecycle (once) ----
  useEffect(() => {
    const glCanvas = glCanvasRef.current;
    if (!glCanvas) return;

    const engine = new AudioEngine();
    const renderer = new Renderer({
      glCanvas,
      scene: defaultScene,
      engine,
      getGain: () => settingsRef.current.gain,
      getFixedHue: () =>
        settingsRef.current.hueMode === 'fixed' ? settingsRef.current.fixedHue : null,
      variation: variationRef.current,
    });
    renderer.start();

    engineRef.current = engine;
    rendererRef.current = renderer;
    setGlAvailable(renderer.glAvailable);

    return () => {
      renderer.dispose();
      engine.stop();
      engineRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  // ---- Audio control ----
  const refreshDevices = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    const list = await engine.listDevices();
    setDevices(list);
  }, []);

  const startAudio = useCallback(
    async (deviceId?: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      const id = deviceId !== undefined ? deviceId : settingsRef.current.deviceId;
      const ok = await engine.start(id || undefined);
      setRunning(ok);
      setError(ok ? null : engine.error);
      if (ok) await refreshDevices();
    },
    [refreshDevices],
  );

  const stopAudio = useCallback(() => {
    engineRef.current?.stop();
    setRunning(false);
  }, []);

  const toggleAudio = useCallback(() => {
    if (running) stopAudio();
    else void startAudio();
  }, [running, startAudio, stopAudio]);

  // Select an input device; hot-swap the capture if it is currently live.
  // The explicit deviceId argument matters: settingsRef only reflects the
  // update() on the next render, which would be too late for this start().
  const selectDevice = useCallback(
    (deviceId: string) => {
      update({ deviceId });
      if (engineRef.current?.running) void startAudio(deviceId);
    },
    [update, startAudio],
  );

  // Populate the device list immediately (labels stay generic until permission
  // is granted) and track OS-level plug/unplug events.
  useEffect(() => {
    void refreshDevices();
    const md = navigator.mediaDevices;
    if (!md?.addEventListener) return;
    const onChange = (): void => void refreshDevices();
    md.addEventListener('devicechange', onChange);
    return () => md.removeEventListener('devicechange', onChange);
  }, [refreshDevices]);

  // Attempt one auto-start on load (browsers usually block until a gesture).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const engine = engineRef.current;
      if (!engine) return;
      const ok = await engine.start(settingsRef.current.deviceId || undefined);
      if (cancelled) return;
      setRunning(ok);
      if (ok) {
        setError(null);
        await refreshDevices();
      } else {
        // Don't surface a scary error for the expected autoplay block; the
        // panel will show the "Click to start audio" state via `running`.
        setError(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshDevices]);

  // ---- Look gacha: reroll the seed ----
  const reroll = useCallback(() => {
    applyUpdate({ seed: randomSeed() });
  }, [applyUpdate]);

  // ---- Reroll details, same topology: keep the exact operators (id/generatorId/
  // generatorVersion/order) that Semantic Synth currently has — and with them the
  // audio-reactive glitch set gl/reactions.ts picked for that topology — but redraw
  // everything else (parameters/routes/palette/composition) from a fresh seed. This
  // is deliberately a separate action from `reroll` above (which swaps the whole
  // topology via the `seed` setting): `reroll` is the "new shape" gacha, this is the
  // "same shape, new details" one.
  const rerollDetails = useCallback((seed?: string) => {
    const control = getSynthControl();
    const current = control.getState().currentPatch;
    // The scene hasn't derived a patch yet (before the first frame) — nothing to reroll.
    if (!current) return;
    const next = rerollPatch(current, seed ?? randomSeed(), { catalog: inlineCatalog });
    control.proposePatch(JSON.parse(serializePatch(next)) as unknown);
  }, []);

  // ---- Tempo controls (delegate to the engine's TempoTracker) ----
  const onTap = useCallback(() => {
    engineRef.current?.tapTempo();
  }, []);
  const onTempoMultiply = useCallback((f: 2 | 0.5) => {
    engineRef.current?.tempoMultiply(f);
  }, []);
  const onTempoAuto = useCallback(() => {
    engineRef.current?.tempoAuto();
  }, []);

  const getAppState = useCallback((): DeckAppState => {
    const s = settingsRef.current;
    const engine = engineRef.current;
    const tempo = engine?.getTempoState();
    return {
      hueMode: s.hueMode,
      fixedHue: s.fixedHue,
      baseHue: rendererRef.current?.currentHue ?? s.fixedHue,
      background: s.background,
      seed: s.seed,
      bpm: tempo?.bpm ?? 0,
      tempoLocked: tempo?.tempoLocked ?? false,
      audioRunning: engine?.running ?? false,
    };
  }, []);

  const runCommand = useCallback(
    (command: DeckCommand): { ok: boolean; issues: string[] } => {
      switch (command.kind) {
        case 'seed:gacha':
          reroll();
          return { ok: true, issues: [] };
        case 'seed:set':
          applyUpdate({ seed: command.seed });
          return { ok: true, issues: [] };
        case 'patch:rerollDetails':
          rerollDetails(command.seed);
          return { ok: true, issues: [] };
        case 'hue:mode':
          applyUpdate({ hueMode: command.mode });
          return { ok: true, issues: [] };
        case 'hue:fixed':
          applyUpdate({ hueMode: 'fixed', fixedHue: command.hue });
          return { ok: true, issues: [] };
        case 'background:set':
          applyUpdate({ background: command.background });
          return { ok: true, issues: [] };
        case 'tempo:tap':
          onTap();
          return { ok: true, issues: [] };
        case 'tempo:multiply':
          onTempoMultiply(command.factor);
          return { ok: true, issues: [] };
        case 'tempo:auto':
          onTempoAuto();
          return { ok: true, issues: [] };
        case 'timeline:lock':
          return { ok: false, issues: ['timeline:lock is handled by host'] };
      }
    },
    [reroll, applyUpdate, rerollDetails, onTap, onTempoMultiply, onTempoAuto],
  );

  const getAppStateRef = useRef(getAppState);
  getAppStateRef.current = getAppState;
  const runCommandRef = useRef(runCommand);
  runCommandRef.current = runCommand;

  // Push variation changes (seed reroll / edit) to the renderer.
  useEffect(() => {
    rendererRef.current?.setVariation(variation);
  }, [variation]);

  // ---- Background class on <html> ----
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('bg-black', settings.background === 'black');
    root.classList.toggle('bg-transparent', settings.background === 'transparent');
  }, [settings.background]);

  // ---- Auto-gacha: reroll the look every N bars off the tempo grid ----
  const lastGachaBarRef = useRef(0);
  useEffect(() => {
    if (!settings.autoGacha) return;
    const peek = engineRef.current?.peekFrame();
    lastGachaBarRef.current = peek?.barCount ?? 0;
    const id = window.setInterval(() => {
      const f = engineRef.current?.peekFrame();
      if (!f || f.bpm <= 0) return;
      if (f.barCount - lastGachaBarRef.current >= settings.gachaBars) {
        lastGachaBarRef.current = f.barCount;
        reroll();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [settings.autoGacha, settings.gachaBars, reroll]);

  // ---- Idle / cursor auto-hide ----
  useEffect(() => {
    let timer = 0;
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), IDLE_TIMEOUT_MS);
    };
    wake();
    window.addEventListener('mousemove', wake);
    window.addEventListener('mousedown', wake);
    window.addEventListener('keydown', wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('mousedown', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('cursor-hidden', idle);
  }, [idle]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      switch (key) {
        case 'h':
        case 'H':
          setPanelHidden((v) => !v);
          break;
        case 'f':
        case 'F':
          void toggleFullscreen();
          break;
        case 'b':
        case 'B':
          update({
            background: settingsRef.current.background === 'black' ? 'transparent' : 'black',
          });
          break;
        case 'r':
        case 'R':
          reroll();
          break;
        case 'd':
        case 'D':
          rerollDetails();
          break;
        case 's':
        case 'S':
          // D は rerollDetails（PR #49）が使っている。デッキ窓は S。
          if (!e.repeat) openSceneDeck();
          break;
        case 't':
        case 'T':
          onTap();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [update, reroll, rerollDetails, onTap]);

  // ---- 外部 CLI からの Bridge（?bridge=1 のときだけ有効） ----
  // デッキ host は BroadcastChannel のみなので常時起動する（ネットワーク副作用なし）。
  useEffect(() => {
    const handle = initBridgeClient();
    const handlers: DeckHostHandlers = {
      getAppState: () => getAppStateRef.current(),
      runCommand: (command) => runCommandRef.current(command),
    };
    const deck = initDeckHost(handlers);
    // StrictMode では effect が2回走るので、必ず畳んで多重接続を防ぐ。
    return () => {
      handle?.close();
      deck?.close();
    };
  }, []);

  return (
    <>
      <canvas id="vj-canvas-gl" ref={glCanvasRef} />
      <ControlPanel
        hidden={panelHidden}
        faded={idle && !panelHidden}
        settings={settings}
        update={update}
        running={running}
        error={error}
        devices={devices}
        engine={engineRef.current}
        onToggleAudio={toggleAudio}
        onRefreshDevices={() => void refreshDevices()}
        onSelectDevice={selectDevice}
        onToggleFullscreen={() => void toggleFullscreen()}
        onReroll={reroll}
        onRerollDetails={rerollDetails}
        onTap={onTap}
        onTempoMultiply={onTempoMultiply}
        onTempoAuto={onTempoAuto}
      />
      <TimelinePanel hidden={panelHidden} />
      {!glAvailable && (
        <div className="gl-required" role="alert">
          WebGL2 が必要です
        </div>
      )}
    </>
  );
}
