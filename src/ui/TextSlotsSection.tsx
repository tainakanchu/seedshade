import { useEffect, useRef, useState } from 'react';
import type { SynthControl } from '../synth/control';
import { typeDef, typeMaskDef, typeWarpDef } from '../synth/generators';
import { FONT_WEIGHT_MAX, FONT_WEIGHT_MIN, TEXT_MAX_LENGTH } from '../synth/schema';
import { DEFAULT_TEXT_FONT, DEFAULT_TEXT_WEIGHT } from '../synth/texts';
import type { VisualPatch } from '../synth/types';
import { listTextSlots, patchWithTextNode, type TextSlotEntry } from './textSlots';

/** Typing pause after which a draft is applied without waiting for blur / Enter. */
const COMMIT_DEBOUNCE_MS = 450;

const ADDABLE = [
  { def: typeDef, label: '+ type', title: '文字を描く source を追加' },
  { def: typeMaskDef, label: '+ mask', title: '今の映像を文字で抜く modifier を追加' },
  { def: typeWarpDef, label: '+ warp', title: '文字の形で座標を歪める field を追加' },
] as const;

interface SlotEditorProps {
  control: SynthControl;
  entry: TextSlotEntry;
  onIssues: (issues: string[]) => void;
}

/**
 * One text slot. Drafts stay local until committed — on blur, on Enter
 * (Shift+Enter inserts a newline) or after a short typing pause — so the
 * patch is not re-proposed on every keystroke.
 */
function SlotEditor(props: SlotEditorProps): React.ReactElement {
  const { control, entry, onIssues } = props;
  const live = entry.spec;
  const [text, setText] = useState(live?.text ?? '');
  const [font, setFont] = useState(live?.font ?? DEFAULT_TEXT_FONT);
  const [weight, setWeight] = useState(live?.weight ?? DEFAULT_TEXT_WEIGHT);
  const dirty = useRef(false);
  const timer = useRef<number | null>(null);

  // Follow the live patch (e.g. a Bridge `text` command) while not editing.
  useEffect(() => {
    if (dirty.current) return;
    setText(live?.text ?? '');
    setFont(live?.font ?? DEFAULT_TEXT_FONT);
    setWeight(live?.weight ?? DEFAULT_TEXT_WEIGHT);
  }, [live?.text, live?.font, live?.weight]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const commit = (next?: { text?: string; font?: string; weight?: number }): void => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    const t = next?.text ?? text;
    const f = (next?.font ?? font).trim() || DEFAULT_TEXT_FONT;
    const w = Math.min(
      FONT_WEIGHT_MAX,
      Math.max(FONT_WEIGHT_MIN, Math.round(next?.weight ?? weight) || DEFAULT_TEXT_WEIGHT),
    );
    dirty.current = false;
    if (live && live.text === t && live.font === f && live.weight === w) return;
    const res = control.setText(entry.key, { text: t, font: f, weight: w });
    onIssues(res.ok ? [] : res.issues.length > 0 ? res.issues : ['text rejected']);
  };

  const schedule = (next: { text?: string; font?: string; weight?: number }): void => {
    dirty.current = true;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => commit(next), COMMIT_DEBOUNCE_MS);
  };

  return (
    <div className="tl-text-slot" data-testid="tl-text-slot">
      <div className="tl-row">
        <span className="tl-intent">{entry.key}</span>
        <span className="tl-anchor">{entry.generatorId}</span>
        <button
          type="button"
          className="btn small"
          data-testid="tl-text-clear"
          title="この文字スロットを空にする"
          onClick={() => {
            dirty.current = false;
            setText('');
            const res = control.setText(entry.key, null);
            onIssues(res.ok ? [] : res.issues);
          }}
        >
          clear
        </button>
      </div>
      <textarea
        className="tl-json tl-text-input"
        data-testid="tl-text-input"
        aria-label={`Text for ${entry.key}`}
        rows={2}
        maxLength={TEXT_MAX_LENGTH}
        spellCheck={false}
        placeholder="文字列（Enter で確定 / Shift+Enter で改行）"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          schedule({ text: e.target.value });
        }}
        onBlur={() => commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            commit();
          }
        }}
      />
      <div className="tl-form-row">
        <input
          type="text"
          className="seed-input"
          data-testid="tl-text-font"
          aria-label={`Font for ${entry.key}`}
          placeholder="font-family"
          spellCheck={false}
          value={font}
          onChange={(e) => {
            setFont(e.target.value);
            dirty.current = true;
          }}
          onBlur={() => commit()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) commit();
          }}
        />
        <input
          type="number"
          data-testid="tl-text-weight"
          aria-label={`Weight for ${entry.key}`}
          min={FONT_WEIGHT_MIN}
          max={FONT_WEIGHT_MAX}
          step={100}
          value={weight}
          onChange={(e) => {
            const w = Number(e.target.value);
            setWeight(w);
            schedule({ weight: w });
          }}
          onBlur={() => commit()}
        />
      </div>
    </div>
  );
}

interface TextSlotsSectionProps {
  control: SynthControl;
  patch: VisualPatch | null;
}

/** Texts section of the Timeline panel: add a type node, edit every text slot. */
export function TextSlotsSection(props: TextSlotsSectionProps): React.ReactElement {
  const { control, patch } = props;
  const [issues, setIssues] = useState<string[]>([]);
  const slots = listTextSlots(patch);

  const addNode = (def: (typeof ADDABLE)[number]['def']): void => {
    const current = control.getState().currentPatch;
    if (!current) {
      setIssues(['synth is not running (WebGL2 required)']);
      return;
    }
    const { patch: next } = patchWithTextNode(current, def);
    const res = control.proposePatch(next);
    setIssues(res.ok ? [] : res.issues.length > 0 ? res.issues : ['patch rejected']);
  };

  return (
    <div className="tl-section" data-testid="tl-texts">
      <div className="row-label">
        <span>Texts</span>
        <span className="row-value">{slots.length}</span>
      </div>
      <div className="tl-form-row">
        {ADDABLE.map((a) => (
          <button
            key={a.def.id}
            type="button"
            className="btn small"
            data-testid={`tl-text-add-${a.def.id}`}
            title={a.title}
            onClick={() => addNode(a.def)}
          >
            {a.label}
          </button>
        ))}
      </div>
      {slots.length === 0 ? (
        <div className="tl-note">
          type（文字を描く）/ mask（映像を文字で抜く）/ warp（文字の形で歪める）を追加すると、
          ここで文字列・フォント・ウェイトを編集できます
        </div>
      ) : (
        <div className="tl-rows">
          {slots.map((entry) => (
            <SlotEditor key={entry.key} control={control} entry={entry} onIssues={setIssues} />
          ))}
        </div>
      )}
      {issues.length > 0 && (
        <ul className="tl-issues" data-testid="tl-text-issues">
          {issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
