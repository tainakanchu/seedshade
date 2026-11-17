/**
 * Pinned text nodes — lettering that survives the seed gacha.
 *
 * derivePatch never picks a text node (an empty slot draws nothing, and the
 * gacha must not invent words), so every seed change wipes the type / typeMask
 * / typeWarp nodes the operator added by hand. A pin is a snapshot of such a
 * node (generator + parameters + text) that {@link applyPinnedText} grafts back
 * onto every *derived* Patch:
 *
 * - only on the seed paths (va.seed / timeline seed-only events / proposeSeed).
 *   A bank recall, a Patch-carrying timeline event or a proposePatch arrives as
 *   the operator built it and is never touched.
 * - derivePatch itself and what a seed means are unchanged: the graft runs
 *   after it, as a pure function of (derived patch, pins).
 * - the result always passes validatePatch + the tier budget. When it would
 *   not, gacha operators of the same category (role) as a pin step aside, last
 *   first, together with the routes / images / texts aimed at them. If that
 *   still is not enough the pins are skipped for this patch (console.warn).
 *
 * The pin keeps the opId it was pinned from, and grafts the node back under
 * that id (derived ids are src* / fld* / mod* / mat*, so they do not collide in
 * practice; a collision falls back to `<opId>_pin`, `<opId>_pin2`, …). Keeping
 * the id is what lets "is this node pinned?" and "a text edit follows into the
 * pin" work by id alone, before and after a seed change.
 *
 * The runtime store lives here (the scene reads it at derive time and the
 * control facade writes it); Settings only persists it (App mirrors the store
 * into `Settings.pinnedText`).
 */
import type { GeneratorCatalog } from './catalog';
import { DEFAULT_BUDGETS, estimateCost, fitsBudget } from './cost';
import { FONT_MAX_LENGTH, FONT_WEIGHT_MAX, FONT_WEIGHT_MIN, TEXT_MAX_LENGTH } from './schema';
import { DEFAULT_TEXT_FONT, DEFAULT_TEXT_WEIGHT } from './texts';
import type { GeneratorCategory, TextSpec, VisualOperator, VisualPatch } from './types';
import { CATEGORY_RANK, validatePatch } from './validate';

/** Generators a pin may hold — the ones with a text slot. */
export const PINNABLE_GENERATORS = ['type', 'typeMask', 'typeWarp'] as const;
export type PinnableGeneratorId = (typeof PINNABLE_GENERATORS)[number];

/** Most nodes kept pinned at once (a source + a field + a modifier + one spare). */
export const MAX_PINNED_NODES = 4;
/** opId の長さ上限（保存値の健全化用）。 */
const OP_ID_MAX_LENGTH = 64;

export interface PinnedTextNode {
  /** The opId the node was pinned from; grafted back under this id. */
  opId: string;
  generatorId: PinnableGeneratorId;
  parameters: Record<string, number | string | boolean>;
  text: TextSpec;
}

export interface PinnedText {
  nodes: PinnedTextNode[];
}

export function isPinnableGenerator(id: unknown): id is PinnableGeneratorId {
  return typeof id === 'string' && (PINNABLE_GENERATORS as readonly string[]).includes(id);
}

function sanitizeTextSpec(v: unknown): TextSpec {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const text = typeof o.text === 'string' ? o.text.slice(0, TEXT_MAX_LENGTH) : '';
  const font =
    typeof o.font === 'string' && o.font.trim() !== ''
      ? o.font.slice(0, FONT_MAX_LENGTH)
      : DEFAULT_TEXT_FONT;
  const w = typeof o.weight === 'number' && Number.isFinite(o.weight) ? o.weight : NaN;
  const weight = Number.isFinite(w)
    ? Math.min(FONT_WEIGHT_MAX, Math.max(FONT_WEIGHT_MIN, Math.round(w)))
    : DEFAULT_TEXT_WEIGHT;
  return { text, font, weight };
}

/**
 * Settings / Bridge input → a well-formed PinnedText, or null for "no pins".
 * Unknown generators, malformed nodes and duplicate opIds are dropped; the
 * parameter values are only shape-checked here (applyPinnedText filters them
 * against the catalog).
 */
export function sanitizePinnedText(v: unknown): PinnedText | null {
  if (!v || typeof v !== 'object') return null;
  const raw = (v as { nodes?: unknown }).nodes;
  if (!Array.isArray(raw)) return null;
  const nodes: PinnedTextNode[] = [];
  const seen = new Set<string>();
  for (const n of raw) {
    if (nodes.length >= MAX_PINNED_NODES) break;
    if (!n || typeof n !== 'object') continue;
    const o = n as Record<string, unknown>;
    if (!isPinnableGenerator(o.generatorId)) continue;
    const opId = typeof o.opId === 'string' ? o.opId.trim().slice(0, OP_ID_MAX_LENGTH) : '';
    if (opId === '' || opId.includes('.') || seen.has(opId)) continue;
    const parameters: Record<string, number | string | boolean> = {};
    if (o.parameters && typeof o.parameters === 'object') {
      for (const [k, val] of Object.entries(o.parameters as Record<string, unknown>)) {
        if (
          (typeof val === 'number' && Number.isFinite(val)) ||
          typeof val === 'string' ||
          typeof val === 'boolean'
        ) {
          parameters[k] = val;
        }
      }
    }
    seen.add(opId);
    nodes.push({ opId, generatorId: o.generatorId, parameters, text: sanitizeTextSpec(o.text) });
  }
  return nodes.length > 0 ? { nodes } : null;
}

// ---------------------------------------------------------------------------
// Pure helpers over PinnedText
// ---------------------------------------------------------------------------

/**
 * Index of the pin an operator id belongs to: the pin's own opId, or the
 * collision fallback `<opId>_pin` / `<opId>_pin<n>` applyPinnedText may use.
 */
export function pinIndexForOp(pinned: PinnedText | null, opId: string): number {
  if (!pinned) return -1;
  return pinned.nodes.findIndex(
    (n) => n.opId === opId || new RegExp(`^${escapeRe(n.opId)}_pin\\d*$`).test(opId),
  );
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** First text slot of a pinnable generator (all three declare exactly one). */
function textSlotOf(catalog: GeneratorCatalog, generatorId: string): string | undefined {
  return catalog.get(generatorId)?.textSlots?.[0];
}

/**
 * Snapshot an operator of `patch` as a pin node, or an error message. The text
 * is the slot's current assignment (an empty slot pins an empty string).
 */
export function pinnedNodeFromPatch(
  patch: VisualPatch,
  opId: string,
  catalog: GeneratorCatalog,
): PinnedTextNode | string {
  const op = patch.operators.find((o) => o.id === opId);
  if (!op) return `operator "${opId}" is not in the current patch`;
  if (!isPinnableGenerator(op.generatorId)) {
    return `operator "${opId}" (${op.generatorId}) is not a text node (type / typeMask / typeWarp)`;
  }
  const slot = textSlotOf(catalog, op.generatorId) ?? 'text';
  const spec = patch.texts?.[`${opId}.${slot}`];
  return {
    opId,
    generatorId: op.generatorId,
    parameters: { ...op.parameters },
    text: spec ? { ...spec } : { text: '', font: DEFAULT_TEXT_FONT, weight: DEFAULT_TEXT_WEIGHT },
  };
}

/**
 * Add or replace (same opId) a pin. Re-pinning an already pinned opId refreshes
 * its snapshot in place, keeping its position. Returns null-free result or an
 * error when the pin list is full.
 */
export function withPinnedNode(
  pinned: PinnedText | null,
  node: PinnedTextNode,
): PinnedText | string {
  const nodes = pinned ? [...pinned.nodes] : [];
  const at = nodes.findIndex((n) => n.opId === node.opId);
  if (at >= 0) {
    nodes[at] = node;
  } else {
    if (nodes.length >= MAX_PINNED_NODES) {
      return `at most ${MAX_PINNED_NODES} text nodes can be pinned`;
    }
    nodes.push(node);
  }
  return { nodes };
}

/** Remove one pin (by opId, collision suffix allowed) or all of them (opId omitted). */
export function withoutPinnedNode(pinned: PinnedText | null, opId?: string): PinnedText | null {
  if (!pinned || opId === undefined) return null;
  const at = pinIndexForOp(pinned, opId);
  if (at < 0) return pinned;
  const nodes = pinned.nodes.filter((_, i) => i !== at);
  return nodes.length > 0 ? { nodes } : null;
}

/** Replace the text of the given pins (indices), or of all of them. */
export function withPinnedTexts(
  pinned: PinnedText | null,
  text: TextSpec,
  indices?: number[],
): PinnedText | null {
  if (!pinned) return pinned;
  let changed = false;
  const nodes = pinned.nodes.map((n, i) => {
    if (indices && !indices.includes(i)) return n;
    if (n.text.text === text.text && n.text.font === text.font && n.text.weight === text.weight) {
      return n;
    }
    changed = true;
    return { ...n, text: { ...text } };
  });
  return changed ? { nodes } : pinned;
}

/** Smallest free `pin<n>` id, for a pin defined directly (not taken from a patch). */
export function freshPinOpId(pinned: PinnedText | null, patch?: VisualPatch | null): string {
  const taken = new Set([
    ...(pinned?.nodes.map((n) => n.opId) ?? []),
    ...(patch?.operators.map((o) => o.id) ?? []),
  ]);
  for (let i = 0; ; i++) {
    if (!taken.has(`pin${i}`)) return `pin${i}`;
  }
}

// ---------------------------------------------------------------------------
// The graft
// ---------------------------------------------------------------------------

function categoryOf(catalog: GeneratorCatalog, op: VisualOperator): GeneratorCategory {
  return catalog.get(op.generatorId)?.category ?? 'source';
}

function passes(patch: VisualPatch, catalog: GeneratorCatalog): boolean {
  if (validatePatch(patch, catalog).length > 0) return false;
  return fitsBudget(estimateCost(patch, catalog), DEFAULT_BUDGETS[patch.qualityTier]).length === 0;
}

/** Drop operators and everything aimed at them (routes either end, images, texts). */
function withoutOperators(patch: VisualPatch, ids: Set<string>): VisualPatch {
  if (ids.size === 0) return patch;
  const opOf = (key: string): string => key.split('.')[0] ?? '';
  const keep = <T>(rec: Record<string, T> | undefined): Record<string, T> | undefined => {
    if (!rec) return undefined;
    const next = Object.fromEntries(Object.entries(rec).filter(([k]) => !ids.has(opOf(k))));
    return Object.keys(next).length > 0 ? next : undefined;
  };
  const images = keep(patch.images);
  const texts = keep(patch.texts);
  const { images: _i, texts: _t, ...rest } = patch;
  void _i;
  void _t;
  return {
    ...rest,
    operators: patch.operators.filter((o) => !ids.has(o.id)),
    routes: patch.routes.filter(
      (r) => !ids.has(opOf(r.target)) && !ids.has(r.source.replace(/^operator:/, '')),
    ),
    ...(images ? { images } : {}),
    ...(texts ? { texts } : {}),
  };
}

/**
 * Graft the pinned text nodes onto a derived Patch (pure, deterministic).
 *
 * - No pins → the input object itself.
 * - Pinned sources go in front of the gacha sources; pinned fields / modifiers
 *   after the gacha ones of their stage (same placement as the Texts panel's
 *   "+ type / + mask / + warp").
 * - Parameters are the generator defaults overlaid with the pin's values
 *   (unknown parameter ids dropped); the version is the catalog's.
 * - If the result fails validatePatch or the tier budget, gacha operators in a
 *   category that holds a pin are removed one at a time, last first. When none
 *   are left to remove, the pins are skipped: the input patch comes back and a
 *   console.warn says why.
 */
export function applyPinnedText(
  patch: VisualPatch,
  pinned: PinnedText | null,
  catalog: GeneratorCatalog,
): VisualPatch {
  if (!pinned || pinned.nodes.length === 0) return patch;

  const taken = new Set(patch.operators.map((o) => o.id));
  const pinOps: {
    op: VisualOperator;
    category: GeneratorCategory;
    slot: string;
    text: TextSpec;
  }[] = [];
  for (const node of pinned.nodes) {
    const def = catalog.get(node.generatorId);
    const slot = def?.textSlots?.[0];
    if (!def || !slot) continue;
    let id = node.opId;
    for (let k = 1; taken.has(id); k++) id = k === 1 ? `${node.opId}_pin` : `${node.opId}_pin${k}`;
    taken.add(id);
    const parameters: Record<string, number | string | boolean> = {};
    for (const p of def.parameters) {
      const v = node.parameters[p.id];
      parameters[p.id] = v !== undefined && typeof v === typeof p.default ? v : p.default;
    }
    pinOps.push({
      op: { id, generatorId: def.id, generatorVersion: def.version, parameters },
      category: def.category,
      slot,
      text: node.text,
    });
  }
  if (pinOps.length === 0) return patch;

  const pinIds = new Set(pinOps.map((p) => p.op.id));
  const pinCategories = new Set(pinOps.map((p) => p.category));

  const build = (base: VisualPatch): VisualPatch => {
    const operators: VisualOperator[] = [];
    const cats = (Object.keys(CATEGORY_RANK) as GeneratorCategory[]).sort(
      (a, b) => CATEGORY_RANK[a] - CATEGORY_RANK[b],
    );
    for (const cat of cats) {
      const gacha = base.operators.filter((o) => categoryOf(catalog, o) === cat);
      const pins = pinOps.filter((p) => p.category === cat).map((p) => p.op);
      operators.push(...(cat === 'source' ? [...pins, ...gacha] : [...gacha, ...pins]));
    }
    const texts: Record<string, TextSpec> = { ...base.texts };
    for (const p of pinOps) texts[`${p.op.id}.${p.slot}`] = { ...p.text };
    return { ...base, operators, texts };
  };

  let base = patch;
  for (;;) {
    const next = build(base);
    if (passes(next, catalog)) return next;
    // Make room: the last gacha operator in a category that holds a pin.
    const victim = [...base.operators]
      .reverse()
      .find((o) => !pinIds.has(o.id) && pinCategories.has(categoryOf(catalog, o)));
    if (!victim) break;
    base = withoutOperators(base, new Set([victim.id]));
  }

  const issues = validatePatch(build(base), catalog).map((i) => i.code);
  console.warn(
    `[pinned-text] could not fit the pinned text nodes into the patch for seed ` +
      `${JSON.stringify(patch.seed)}; showing it without them` +
      (issues.length > 0 ? ` (${issues.join(', ')})` : ' (over budget)'),
  );
  return patch;
}

// ---------------------------------------------------------------------------
// Runtime store
// ---------------------------------------------------------------------------

let current: PinnedText | null = null;
const listeners = new Set<() => void>();

export function getPinnedText(): PinnedText | null {
  return current;
}

/** Replace the pins (sanitized). Listeners fire only on an actual change. */
export function setPinnedText(next: PinnedText | null): void {
  const clean = sanitizePinnedText(next);
  if (JSON.stringify(clean) === JSON.stringify(current)) return;
  current = clean;
  for (const l of Array.from(listeners)) {
    try {
      l();
    } catch (e) {
      console.error('[pinned-text] listener threw:', e);
    }
  }
}

export function subscribePinnedText(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
