import { inlineCatalog } from '../synth/generators';
import { DEFAULT_TEXT_FONT, DEFAULT_TEXT_WEIGHT } from '../synth/texts';
import type { GeneratorDefinition, TextSpec, VisualOperator, VisualPatch } from '../synth/types';
import { CATEGORY_RANK, COUNT_LIMITS } from '../synth/validate';

/** One text slot of one operator in the running patch. */
export interface TextSlotEntry {
  /** `<opId>.<slot>` — the Patch.texts key. */
  key: string;
  opId: string;
  slot: string;
  generatorId: string;
  /** Current assignment, or null when the slot is empty. */
  spec: TextSpec | null;
}

/** Every declared text slot in operator order, with what is assigned to it. */
export function listTextSlots(patch: VisualPatch | null): TextSlotEntry[] {
  if (!patch) return [];
  const out: TextSlotEntry[] = [];
  for (const op of patch.operators) {
    const def = inlineCatalog.get(op.generatorId)?.def;
    for (const slot of def?.textSlots ?? []) {
      const key = `${op.id}.${slot}`;
      out.push({
        key,
        opId: op.id,
        slot,
        generatorId: op.generatorId,
        spec: patch.texts?.[key] ?? null,
      });
    }
  }
  return out;
}

/** Text the panel puts into a freshly added node so it is visible at once. */
export const DEFAULT_NEW_TEXT = 'SEEDSHADE';

function freshOpId(patch: VisualPatch, base: string): string {
  const taken = new Set(patch.operators.map((op) => op.id));
  for (let i = 0; ; i++) {
    const id = `${base}${i}`;
    if (!taken.has(id)) return id;
  }
}

function defaultOperator(def: GeneratorDefinition, id: string): VisualOperator {
  const parameters: Record<string, number | string | boolean> = {};
  for (const p of def.parameters) parameters[p.id] = p.default;
  return { id, generatorId: def.id, generatorVersion: def.version, parameters };
}

/**
 * Add a text node (type / typeMask / typeWarp) to the patch with a default
 * string in its slot.
 *
 * A source goes first, everything else last (stages are ordered by role, so
 * only the order inside a role matters). When the category is already at its
 * validate.ts limit, the last operator of that category steps aside, together
 * with any route, image or text aimed at it — a dangling reference would sink
 * the whole proposal.
 */
export function patchWithTextNode(
  patch: VisualPatch,
  def: GeneratorDefinition,
  text: string = DEFAULT_NEW_TEXT,
): { patch: VisualPatch; key: string } {
  const opId = freshOpId(patch, def.id);
  const op = defaultOperator(def, opId);
  const sameCategory = patch.operators.filter(
    (o) => inlineCatalog.get(o.generatorId)?.def.category === def.category,
  );
  const evicted =
    sameCategory.length >= COUNT_LIMITS[def.category].max
      ? sameCategory[sameCategory.length - 1]
      : undefined;
  const kept = patch.operators.filter((o) => o.id !== evicted?.id);
  // Operators must stay in stage order (validate.ts CATEGORY_RANK): a source
  // goes first, anything else right after the last operator of its own (or an
  // earlier) stage.
  const rank = (o: VisualOperator): number => {
    const cat = inlineCatalog.get(o.generatorId)?.def.category;
    return cat === undefined ? 0 : CATEGORY_RANK[cat];
  };
  let at = 0;
  if (def.category !== 'source') {
    kept.forEach((o, i) => {
      if (rank(o) <= CATEGORY_RANK[def.category]) at = i + 1;
    });
  }
  const operators = [...kept.slice(0, at), op, ...kept.slice(at)];

  const dropped = evicted?.id;
  const routes =
    dropped === undefined
      ? patch.routes
      : patch.routes.filter(
          (r) =>
            (r.target.split('.')[0] ?? '') !== dropped &&
            r.source.replace(/^operator:/, '') !== dropped,
        );
  const dropKeys = <T>(rec: Record<string, T> | undefined): Record<string, T> | undefined => {
    if (!rec || dropped === undefined) return rec;
    const next = Object.fromEntries(
      Object.entries(rec).filter(([k]) => !k.startsWith(`${dropped}.`)),
    );
    return Object.keys(next).length > 0 ? next : undefined;
  };

  const slot = def.textSlots?.[0] ?? 'text';
  const key = `${opId}.${slot}`;
  const images = dropKeys(patch.images);
  const texts = {
    ...dropKeys(patch.texts),
    [key]: { text, font: DEFAULT_TEXT_FONT, weight: DEFAULT_TEXT_WEIGHT },
  };
  const { images: _i, texts: _t, ...rest } = patch;
  void _i;
  void _t;
  return {
    patch: { ...rest, operators, routes, ...(images ? { images } : {}), texts },
    key,
  };
}
