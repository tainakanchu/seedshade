import type { PerformanceTimeline, TimelineOp } from './timeline';
import { DEFAULT_TEXT_FONT, DEFAULT_TEXT_WEIGHT } from './texts';
import type { TextSpec, VisualPatch } from './types';

/**
 * External Control Interface — the first implementation of the RFC's control
 * surface.
 *
 * A scene is a module singleton driven by the renderer; the UI is React. Wiring
 * them to each other directly would tie every panel to one scene's internals
 * and make the scene impossible to drive from anywhere else. This module is the
 * seam between them: the active scene registers a backend, callers talk to a
 * stable facade, and neither side holds a reference to the other.
 *
 * The UI is only the first caller. An AI Director, a PRO DJ LINK bridge and a
 * MIDI adapter all connect here later and drive the same ops — the surface is
 * deliberately transport-agnostic.
 *
 * The registry owns no synth state of its own: it is a backend slot plus a
 * listener set. With no scene registered every backend call is a safe no-op,
 * so callers never have to check whether a synth scene happens to be on screen.
 */

export interface SynthControlState {
  currentPatch: VisualPatch | null;
  /** 読み取り専用として扱うこと（呼び出し側は変更しない）。 */
  timeline: PerformanceTimeline;
  transitionActive: boolean;
  qualityScale: number;
  recordingActive: boolean;
  /** getState() を呼んだ瞬間のシーン時計（秒）。UI が相対 anchor を絶対値に直すのに使う。 */
  nowSec: number;
  /** 直近フレームの barCount。bar anchor の計算用。 */
  barCount: number;
  /** テンポグリッドがロックされているか（false だと bar anchor は発火しない）。 */
  tempoLocked: boolean;
  /** 発火済みイベント id（UI 表示用）。 */
  firedIds: readonly string[];
  /**
   * 今の Patch に載っているオーディオ・リアクションの id（座標段 → 色段）。
   *
   * Patch には持たず topology から決まるので、`currentPatch` を見ても分からない。
   * 「今どのグリッチが鳴っているか」は演出を組み立てる側が知りたい情報なので
   * state で出す。シーンが居ないときは空。
   */
  reactions: readonly string[];
  /**
   * レンダラの現在 hue（0..360、variation.hueOffset 込み）。
   * シーン非アクティブ時は 0。
   */
  hue: number;
}

/** setImage の結果。ok のとき hash は Patch の images 参照にそのまま使える。 */
export interface SetImageResult {
  ok: boolean;
  issues: string[];
  /** SHA-256 hex（成功時のみ）。 */
  hash?: string;
  /** 実際に登録された名前（成功時のみ）。 */
  name?: string;
}

/** setText の入力。font / weight を省くと既存の割り当て（無ければ既定値）を引き継ぐ。 */
export interface SetTextInput {
  text: string;
  font?: string;
  weight?: number;
}

/** スロット名を省いたキー（`"type0"`）に補うスロット。type 系 Generator の唯一のスロット。 */
export const DEFAULT_TEXT_SLOT = 'text';

/** `"<opId>"` だけなら既定スロットを補って `"<opId>.text"` にする。 */
export function normalizeTextKey(key: string): string {
  const trimmed = key.trim();
  return trimmed.includes('.') ? trimmed : `${trimmed}.${DEFAULT_TEXT_SLOT}`;
}

/**
 * Patch の texts を 1 エントリだけ差し替えた新しい Patch を返す（純関数）。
 *
 * - input が null ならそのキーを消す。最後の 1 つが消えたら texts ごと省く
 *   （文字を使わない Patch は従来どおりの JSON に戻る）。
 * - font / weight を省いた入力は、既存エントリ → 既定値の順で埋める。
 *
 * スロットが実在するかはここでは見ない（proposePatch の検証ゲートが判定する）。
 */
export function patchWithText(
  patch: VisualPatch,
  key: string,
  input: SetTextInput | null,
): VisualPatch {
  const k = normalizeTextKey(key);
  const texts: Record<string, TextSpec> = { ...patch.texts };
  if (input === null) {
    delete texts[k];
  } else {
    const prev = texts[k];
    texts[k] = {
      text: input.text,
      font: input.font ?? prev?.font ?? DEFAULT_TEXT_FONT,
      weight: input.weight ?? prev?.weight ?? DEFAULT_TEXT_WEIGHT,
    };
  }
  const { texts: _drop, ...rest } = patch;
  void _drop;
  return Object.keys(texts).length > 0 ? { ...rest, texts } : rest;
}

export interface SynthControl {
  getState(): SynthControlState;
  /** gatePatchProposal を通してから適用する。issues が空なら遷移が始まる。 */
  proposePatch(input: unknown): { ok: boolean; issues: string[] };
  /** seed から派生した Patch へ遷移する（ガチャの Timeline 版）。 */
  proposeSeed(seed: string): void;
  /**
   * 画像を登録する（Bridge 経由の `vj-ctl image` の受け口）。
   *
   * 登録するだけで、どの Operator に割り当てるかは決めない。返った hash を
   * Patch の `images["<opId>.<slot>"]` に入れて proposePatch する、という順で使う。
   * ハッシュ計算と decode が非同期なので、control のなかでここだけ Promise を返す。
   */
  setImage(name: string, bytesBase64: string, mime: string): Promise<SetImageResult>;
  /**
   * 今の Patch のテキストスロット（`"<opId>.<slot>"`、スロット省略時は `.text`）に
   * 文字列を割り当てる（null で割り当て解除）。Bridge 経由の `vj-ctl text` の受け口。
   *
   * 中身は「texts だけ差し替えた Patch を proposePatch する」のと同じで、検証
   * ゲートも同じものを通る。operators は変えないのでトポロジ変更にはならず、
   * シェーダは再コンパイルされない（テクスチャの再アップロードだけ）。
   */
  setText(key: string, input: SetTextInput | null): { ok: boolean; issues: string[] };
  applyTimelineOp(op: TimelineOp): { ok: boolean; issue?: string };
  fireExternal(id: string): void;
  startRecording(): void;
  /** serializeRecording の JSON（未開始なら null）。 */
  stopRecording(): string | null;
  /** replay 用に Timeline を再構成して適用する。 */
  loadRecording(json: string): { ok: boolean; issues: string[] };
  /** 状態変化の購読（UI 再描画用）。unsubscribe を返す。 */
  subscribe(listener: () => void): () => void;
}

/**
 * シーンが登録する実体。subscribe はレジストリ（facade）側が持つ。setText も
 * getState + proposePatch だけで組めるので facade 側が持つ（シーンは実装不要）。
 */
export type SynthControlBackend = Omit<SynthControl, 'subscribe' | 'setText'> & {
  /**
   * 今いちばん新しい遷移先（キュー済みの提案 → ロード中 / クロスフェード中の
   * 行き先 → 画面の Patch の順）。setText はこれを土台にする。currentPatch を
   * 土台にすると、切り替え途中に文字を打った瞬間に古い Patch へ巻き戻るため。
   * 省略時は getState().currentPatch。
   */
  targetPatch?(): VisualPatch | null;
};

const NO_SCENE = 'no synth scene is active';

let active: SynthControlBackend | null = null;
const listeners = new Set<() => void>();

/** What the facade reports while nothing is registered. */
function idleState(): SynthControlState {
  return {
    currentPatch: null,
    timeline: { lockedUntilSec: 0, events: [] },
    transitionActive: false,
    qualityScale: 1,
    recordingActive: false,
    nowSec: 0,
    barCount: 0,
    tempoLocked: false,
    firedIds: [],
    reactions: [],
    hue: 0,
  };
}

/** シーンから呼ぶ。unregister 関数を返す。登録/解除時に listener へ通知する。 */
export function registerSynthControl(backend: SynthControlBackend): () => void {
  active = backend;
  notifySynthControlChanged();
  return () => {
    // Registration is last-wins, so a scene that was already superseded must not
    // tear down its successor — only clear the slot if it is still ours.
    if (active !== backend) return;
    active = null;
    notifySynthControlChanged();
  };
}

/** シーン側の状態が変わったときに呼ぶ。購読者へ通知する。 */
export function notifySynthControlChanged(): void {
  // Iterate a copy: a listener may unsubscribe (or subscribe) from inside its
  // own callback, and one that throws must not stop the rest.
  for (const listener of Array.from(listeners)) {
    try {
      listener();
    } catch (e) {
      console.error('[synth-control] listener threw:', e);
    }
  }
}

/**
 * Stable facade. Every method resolves the backend at call time, so the object
 * stays valid across scene switches and can be captured once by the UI.
 */
const facade: SynthControl = {
  getState(): SynthControlState {
    return active ? active.getState() : idleState();
  },

  proposePatch(input: unknown): { ok: boolean; issues: string[] } {
    return active ? active.proposePatch(input) : { ok: false, issues: [NO_SCENE] };
  },

  proposeSeed(seed: string): void {
    active?.proposeSeed(seed);
  },

  setImage(name: string, bytesBase64: string, mime: string): Promise<SetImageResult> {
    return active
      ? active.setImage(name, bytesBase64, mime)
      : Promise.resolve({ ok: false, issues: [NO_SCENE] });
  },

  setText(key: string, input: SetTextInput | null): { ok: boolean; issues: string[] } {
    if (!active) return { ok: false, issues: [NO_SCENE] };
    if (normalizeTextKey(key).startsWith('.')) {
      return { ok: false, issues: ['text key must be "<opId>" or "<opId>.<slot>"'] };
    }
    const current = active.targetPatch?.() ?? active.getState().currentPatch;
    if (!current) return { ok: false, issues: ['no patch is on screen yet'] };
    return active.proposePatch(patchWithText(current, key, input));
  },

  applyTimelineOp(op: TimelineOp): { ok: boolean; issue?: string } {
    return active ? active.applyTimelineOp(op) : { ok: false, issue: NO_SCENE };
  },

  fireExternal(id: string): void {
    active?.fireExternal(id);
  },

  startRecording(): void {
    active?.startRecording();
  },

  stopRecording(): string | null {
    return active ? active.stopRecording() : null;
  },

  loadRecording(json: string): { ok: boolean; issues: string[] } {
    return active ? active.loadRecording(json) : { ok: false, issues: [NO_SCENE] };
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** UI から使う窓口。返り値は登録状態に関わらず安定した同一オブジェクトでよい。 */
export function getSynthControl(): SynthControl {
  return facade;
}
