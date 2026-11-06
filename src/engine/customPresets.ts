/**
 * The performer's own presets: "save current settings as…".
 *
 * A custom preset has the same shape as a built-in one (tempo + toss
 * settings; sound options stay personal), a name the performer typed and a
 * description generated from its settings, so it reads like the built-ins
 * on the settings screen. Saving is offered only when the settings don't
 * already match a preset, so the list never holds two copies of the same
 * setup. Stored data is untrusted: `parseStoredCustomPresets` never throws
 * and skips presets it can't use.
 */

import { TossSettings, validateTossSettings } from './announce';
import { callLabel, isValidCall } from './calls';
import { callSetSummary, callShortcutOf, clampBpm, isCallRange } from './editSettings';
import { PRACTICE_PRESETS, PracticePreset, tossMatchesPreset } from './presets';
import { PracticeSettings } from './storedSettings';
import { MAX_PHRASE_LENGTH, MIN_PHRASE_LENGTH } from './timing';

export const CUSTOM_PRESETS_STORAGE_KEY = 'guardrr.customPresets';
export const CUSTOM_PRESETS_VERSION = 1;
/** More than this and the chip row stops being a quick pick. */
export const MAX_CUSTOM_PRESETS = 12;
export const MAX_PRESET_NAME_LENGTH = 24;
const ID_PREFIX = 'custom-';

export function isCustomPreset(preset: PracticePreset): boolean {
  return preset.id.startsWith(ID_PREFIX);
}

/**
 * "Calls 1–7 · 16 counts · called 4 early" (tempo is shown separately).
 * Odd/even sets are named rather than listed ("Odd calls 1–15").
 */
export function describeToss(toss: TossSettings): string {
  const calls = callSetSummary(toss);
  const shortcut = isCallRange(toss) ? null : callShortcutOf(toss);
  const sorted = [...toss.allowedTossCounts].sort((a, b) => a - b);
  // Odd/even sets name their whole counts; with "and" calls on, each count's
  // "and" is in the set too ("Odd calls 1–15 with ands", not "1–15 and").
  const whole = sorted.filter(Number.isInteger);
  const withAnds = whole.length < sorted.length ? ' with ands' : '';
  const span = `${callLabel(whole[0])}–${callLabel(whole[whole.length - 1])}${withAnds}`;
  const what =
    shortcut === 'odd' || shortcut === 'even'
      ? `${shortcut === 'odd' ? 'Odd' : 'Even'} calls ${span}`
      : calls.startsWith('Only')
        ? calls
        : `Calls ${calls}`;
  return [
    what,
    `${toss.phraseLength} counts`,
    `called ${toss.leadCounts} early`,
    ...(toss.allowRepeats ? [] : ['no repeats']),
  ].join(' · ');
}

/** Trimmed, single-spaced and cut to MAX_PRESET_NAME_LENGTH. */
export function normalizePresetName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_PRESET_NAME_LENGTH).trim();
}

const sameName = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

export type PresetNameProblem = 'empty' | 'taken';

/** Why a name can't be used (built-in names are taken too), or null when it's fine. */
export function presetNameProblem(
  name: string,
  custom: readonly PracticePreset[],
): PresetNameProblem | null {
  const n = normalizePresetName(name);
  if (!n) return 'empty';
  return [...PRACTICE_PRESETS, ...custom].some((p) => sameName(p.name, n)) ? 'taken' : null;
}

export function presetNameMessage(problem: PresetNameProblem): string {
  return problem === 'empty' ? 'Give the preset a name.' : 'A preset already has that name.';
}

/** "My preset 1", or the next number that's free. */
export function suggestPresetName(custom: readonly PracticePreset[]): string {
  for (let i = 1; ; i++) {
    const name = `My preset ${i}`;
    if (!presetNameProblem(name, custom)) return name;
  }
}

/** Every preset, built-in first, then the performer's own in the order they were saved. */
export function allPresets(custom: readonly PracticePreset[]): PracticePreset[] {
  return [...PRACTICE_PRESETS, ...custom];
}

/** The preset (built-in or custom) the settings match, ignoring tempo, if any. */
export function matchingAnyPreset(
  settings: PracticeSettings,
  custom: readonly PracticePreset[],
): PracticePreset | null {
  return allPresets(custom).find((p) => tossMatchesPreset(settings.toss, p)) ?? null;
}

/** Whether "Save as preset" makes sense: the settings are new and there's room. */
export function canSavePreset(
  settings: PracticeSettings,
  custom: readonly PracticePreset[],
): boolean {
  return custom.length < MAX_CUSTOM_PRESETS && matchingAnyPreset(settings, custom) === null;
}

export interface SavePresetResult {
  presets: PracticePreset[];
  /** The new preset, or null when it couldn't be saved (see `problem`). */
  saved: PracticePreset | null;
  problem: PresetNameProblem | 'duplicate' | 'full' | null;
}

/**
 * Add the current tempo and toss settings as a named preset. `nowMs` makes
 * the id (bumped if it's somehow taken), so presets keep their identity
 * across renames and app restarts.
 */
export function saveCustomPreset(
  custom: readonly PracticePreset[],
  settings: PracticeSettings,
  name: string,
  nowMs: number,
): SavePresetResult {
  const fail = (problem: SavePresetResult['problem']): SavePresetResult => ({
    presets: [...custom],
    saved: null,
    problem,
  });
  if (custom.length >= MAX_CUSTOM_PRESETS) return fail('full');
  const nameProblem = presetNameProblem(name, custom);
  if (nameProblem) return fail(nameProblem);
  if (matchingAnyPreset(settings, custom)) return fail('duplicate');
  let stamp = Math.max(0, Math.floor(nowMs));
  while (custom.some((p) => p.id === `${ID_PREFIX}${stamp}`)) stamp++;
  const toss: TossSettings = {
    ...settings.toss,
    allowedTossCounts: [...settings.toss.allowedTossCounts].sort((a, b) => a - b),
  };
  const saved: PracticePreset = {
    id: `${ID_PREFIX}${stamp}`,
    name: normalizePresetName(name),
    description: describeToss(toss),
    bpm: settings.bpm,
    toss,
  };
  return { presets: [...custom, saved], saved, problem: null };
}

/** Why a preset name can't change to `name` (keeping its own name, in any case, is fine). */
export function renameProblem(
  custom: readonly PracticePreset[],
  id: string,
  name: string,
): PresetNameProblem | null {
  return presetNameProblem(
    name,
    custom.filter((p) => p.id !== id),
  );
}

export interface ChangePresetResult {
  presets: PracticePreset[];
  /** The changed preset, or null when nothing changed (see `problem`). */
  changed: PracticePreset | null;
  problem: PresetNameProblem | 'missing' | 'duplicate' | null;
}

/** Give a custom preset a new name; it keeps its id, settings and place in the list. */
export function renameCustomPreset(
  custom: readonly PracticePreset[],
  id: string,
  name: string,
): ChangePresetResult {
  const index = custom.findIndex((p) => p.id === id);
  if (index < 0) return { presets: [...custom], changed: null, problem: 'missing' };
  const problem = renameProblem(custom, id, name);
  if (problem) return { presets: [...custom], changed: null, problem };
  const changed = { ...custom[index], name: normalizePresetName(name) };
  return { presets: custom.map((p, i) => (i === index ? changed : p)), changed, problem: null };
}

/**
 * Overwrite a custom preset with the current tempo and toss settings (same
 * name, id and place). Refused when the settings already match a different
 * preset, so the list never holds two copies of one setup.
 */
export function updateCustomPreset(
  custom: readonly PracticePreset[],
  id: string,
  settings: PracticeSettings,
): ChangePresetResult {
  const index = custom.findIndex((p) => p.id === id);
  if (index < 0) return { presets: [...custom], changed: null, problem: 'missing' };
  const other = matchingAnyPreset(
    settings,
    custom.filter((p) => p.id !== id),
  );
  if (other) return { presets: [...custom], changed: null, problem: 'duplicate' };
  const toss: TossSettings = {
    ...settings.toss,
    allowedTossCounts: [...settings.toss.allowedTossCounts].sort((a, b) => a - b),
  };
  const changed: PracticePreset = {
    ...custom[index],
    description: describeToss(toss),
    bpm: clampBpm(settings.bpm),
    toss,
  };
  return { presets: custom.map((p, i) => (i === index ? changed : p)), changed, problem: null };
}

export type PresetUpdateKind = 'tempo' | 'settings';

export interface PresetUpdateOffer {
  preset: PracticePreset;
  /**
   * 'tempo': the settings still match the preset but the tempo moved
   * ("Save 150 BPM to …"); 'settings': the settings were changed after the
   * preset was applied and now match no preset ("Update … with these").
   */
  kind: PresetUpdateKind;
}

/**
 * Which custom preset the performer could update, if any. `lastCustomId` is
 * the custom preset applied (or saved) most recently on this screen, so a
 * tweaked drill can be written back to the preset it came from.
 */
export function presetUpdateOffer(
  settings: PracticeSettings,
  custom: readonly PracticePreset[],
  lastCustomId: string | null,
): PresetUpdateOffer | null {
  const current = matchingAnyPreset(settings, custom);
  if (current) {
    if (!isCustomPreset(current) || clampBpm(settings.bpm) === current.bpm) return null;
    return { preset: current, kind: 'tempo' };
  }
  const last = custom.find((p) => p.id === lastCustomId);
  return last ? { preset: last, kind: 'settings' } : null;
}

export interface DeletedPreset {
  preset: PracticePreset;
  /** Where it was, so Undo puts it back in the same place. */
  index: number;
}

/** Remove a custom preset; `deleted` is null when there's no such preset. */
export function deleteCustomPreset(
  custom: readonly PracticePreset[],
  id: string,
): { presets: PracticePreset[]; deleted: DeletedPreset | null } {
  const index = custom.findIndex((p) => p.id === id);
  if (index < 0) return { presets: [...custom], deleted: null };
  return {
    presets: custom.filter((_, i) => i !== index),
    deleted: { preset: custom[index], index },
  };
}

/** Undo a delete. A no-op if the id (or the name) has been used again since. */
export function restoreCustomPreset(
  custom: readonly PracticePreset[],
  deleted: DeletedPreset,
): PracticePreset[] {
  const { preset, index } = deleted;
  if (custom.some((p) => p.id === preset.id || sameName(p.name, preset.name))) return [...custom];
  const next = [...custom];
  next.splice(Math.min(Math.max(0, index), next.length), 0, preset);
  return next;
}

export function serializeCustomPresets(custom: readonly PracticePreset[]): string {
  return JSON.stringify({
    version: CUSTOM_PRESETS_VERSION,
    presets: custom.map(({ id, name, bpm, toss }) => ({ id, name, bpm, toss })),
  });
}

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function parsePreset(raw: unknown): PracticePreset | null {
  if (!isObject(raw) || !isObject(raw.toss)) return null;
  const { id, name, bpm, toss: t } = raw;
  if (typeof id !== 'string' || !id.startsWith(ID_PREFIX)) return null;
  if (typeof name !== 'string' || !normalizePresetName(name)) return null;
  if (typeof bpm !== 'number' || !Number.isFinite(bpm)) return null;
  const phraseLength = t.phraseLength;
  if (
    typeof phraseLength !== 'number' ||
    !Number.isInteger(phraseLength) ||
    phraseLength < MIN_PHRASE_LENGTH ||
    phraseLength > MAX_PHRASE_LENGTH
  )
    return null;
  const leadCounts = t.leadCounts;
  if (
    typeof leadCounts !== 'number' ||
    !Number.isInteger(leadCounts) ||
    leadCounts < 1 ||
    leadCounts > phraseLength
  )
    return null;
  if (!Array.isArray(t.allowedTossCounts) || typeof t.allowRepeats !== 'boolean') return null;
  const calls = t.allowedTossCounts.filter(
    (n): n is number => typeof n === 'number' && isValidCall(n),
  );
  if (calls.length === 0) return null;
  const toss: TossSettings = {
    phraseLength,
    leadCounts,
    allowedTossCounts: [...new Set(calls)].sort((a, b) => a - b),
    allowRepeats: t.allowRepeats,
  };
  try {
    // A preset whose calls no longer all fit would silently change; skip it.
    if (validateTossSettings(toss).length !== toss.allowedTossCounts.length) return null;
  } catch {
    return null;
  }
  return {
    id,
    name: normalizePresetName(name),
    description: describeToss(toss),
    bpm: clampBpm(bpm),
    toss,
  };
}

/**
 * Custom presets from stored JSON. Never throws; unreadable presets,
 * repeated ids or names, copies of a built-in preset and anything past
 * MAX_CUSTOM_PRESETS are dropped.
 */
export function parseStoredCustomPresets(json: string | null | undefined): PracticePreset[] {
  if (!json) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!isObject(raw) || !Array.isArray(raw.presets)) return [];
  const out: PracticePreset[] = [];
  for (const item of raw.presets) {
    if (out.length >= MAX_CUSTOM_PRESETS) break;
    const p = parsePreset(item);
    if (!p) continue;
    if (out.some((q) => q.id === p.id) || presetNameProblem(p.name, out)) continue;
    if (allPresets(out).some((q) => tossMatchesPreset(p.toss, q))) continue;
    out.push(p);
  }
  return out;
}
