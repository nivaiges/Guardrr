/**
 * Rotation names for calls: single, double, triple, quad.
 *
 * Guardrr's calls are counts ("catch on 5"), because that's what a metronome
 * can cue. Many guards, though, call tosses by how many times the equipment
 * turns in the air (see docs/colorguard-research.md). How many counts a
 * double takes depends on the performer, the height and the tempo, so the
 * performer maps each name to the count it's caught on, and the voice says
 * "double" instead of "two and" for that call. Calls without a name are
 * still spoken as counts.
 *
 * The default map is The DrillMaster's rifle exercise: a single caught on 2,
 * a double on "2 and", a triple on 3 and a quad on "3 and".
 */

import { TossSettings, tossCountsThatFit } from './announce';
import { catchPositionOf, isValidCall } from './calls';
import { PHRASE_LENGTH_OPTIONS } from './editSettings';

/** The latest a rotation can be caught: the end of the longest phrase offered (32). */
export const MAX_ROTATION_CALL = Math.max(...PHRASE_LENGTH_OPTIONS);

export const ROTATIONS = ['single', 'double', 'triple', 'quad'] as const;
export type Rotation = (typeof ROTATIONS)[number];

/** The call (count) each rotation is caught on. */
export type RotationMap = Record<Rotation, number>;

export const DEFAULT_ROTATION_MAP: RotationMap = { single: 2, double: 2.5, triple: 3, quad: 3.5 };

/** How calls are said and shown: as counts ("two and") or by rotation name ("double"). */
export type CallNaming = 'counts' | 'rotations';

export const CALL_NAMINGS: readonly CallNaming[] = ['counts', 'rotations'];
export const DEFAULT_CALL_NAMING: CallNaming = 'counts';

export function isCallNaming(value: unknown): value is CallNaming {
  return value === 'counts' || value === 'rotations';
}

export function callNamingLabel(naming: CallNaming): string {
  return naming === 'counts' ? 'Counts' : 'Rotations';
}

const ROTATION_LABELS: Record<Rotation, string> = {
  single: 'Single',
  double: 'Double',
  triple: 'Triple',
  quad: 'Quad',
};

/** "Single", "Double", ... */
export function rotationLabel(rotation: Rotation): string {
  return ROTATION_LABELS[rotation];
}

/**
 * Every call a rotation can be mapped to, in order: 1 (the pop toss), then
 * 2, 2 and, 3, ... up to the longest phrase offered. "1 and" is left out because
 * it's caught at the same moment as the pop toss.
 */
export const ROTATION_CALL_CHOICES: readonly number[] = (() => {
  const calls = [1];
  for (let n = 2; n <= MAX_ROTATION_CALL; n += 0.5) calls.push(n);
  return calls;
})();

/** The rotation mapped to this call, or null (spoken as a count). */
export function rotationForCall(call: number, map: RotationMap): Rotation | null {
  for (const rotation of ROTATIONS) if (map[rotation] === call) return rotation;
  return null;
}

/**
 * True when every rotation is on an offered call and each one is caught
 * strictly later than the one before (more turns need more air time).
 */
export function isValidRotationMap(map: unknown): map is RotationMap {
  if (typeof map !== 'object' || map === null) return false;
  const values = ROTATIONS.map((r) => (map as Record<string, unknown>)[r]);
  if (!values.every((v) => typeof v === 'number' && ROTATION_CALL_CHOICES.includes(v))) {
    return false;
  }
  const calls = values as number[];
  return calls.every((call, i) => i === 0 || catchPositionOf(call) > catchPositionOf(calls[i - 1]));
}

/** True when both maps put every rotation on the same call. */
export function sameRotationMap(a: RotationMap, b: RotationMap): boolean {
  return ROTATIONS.every((r) => a[r] === b[r]);
}

/** A stored map, or the default when it's missing or invalid. Never throws. */
export function parseStoredRotationMap(raw: unknown): RotationMap {
  if (!isValidRotationMap(raw)) return { ...DEFAULT_ROTATION_MAP };
  return {
    single: raw.single,
    double: raw.double,
    triple: raw.triple,
    quad: raw.quad,
  };
}

/**
 * The range of `ROTATION_CALL_CHOICES` indexes a rotation can move within:
 * after the rotation before it and before the one after it.
 */
export function rotationChoiceLimits(
  map: RotationMap,
  rotation: Rotation,
): { min: number; max: number } {
  const i = ROTATIONS.indexOf(rotation);
  const before = i > 0 ? ROTATION_CALL_CHOICES.indexOf(map[ROTATIONS[i - 1]]) : -1;
  const after =
    i < ROTATIONS.length - 1
      ? ROTATION_CALL_CHOICES.indexOf(map[ROTATIONS[i + 1]])
      : ROTATION_CALL_CHOICES.length;
  return { min: before + 1, max: after - 1 };
}

/** Index of the rotation's call in `ROTATION_CALL_CHOICES`. */
export function rotationChoiceIndex(map: RotationMap, rotation: Rotation): number {
  return ROTATION_CALL_CHOICES.indexOf(map[rotation]);
}

/**
 * Map a rotation to the call at `index` of `ROTATION_CALL_CHOICES`, clamped
 * so the rotations stay in order (a double can't be caught before a single).
 */
export function withRotationChoice(
  map: RotationMap,
  rotation: Rotation,
  index: number,
): RotationMap {
  const { min, max } = rotationChoiceLimits(map, rotation);
  const clamped = Math.min(max, Math.max(min, Math.round(index)));
  const call = ROTATION_CALL_CHOICES[clamped];
  if (call === undefined || !isValidCall(call)) return map;
  return { ...map, [rotation]: call };
}

/** The mapped calls that fit the phrase, in order (for "Use these calls"). */
export function rotationCalls(map: RotationMap, phraseLength: number): number[] {
  const named = ROTATIONS.map((r) => map[r]);
  if (!named.some((call) => catchPositionOf(call) <= phraseLength)) return [];
  return tossCountsThatFit(named, phraseLength);
}

/** Practice only the named calls; unchanged when none of them fits the phrase. */
export function withRotationCalls(settings: TossSettings, map: RotationMap): TossSettings {
  const calls = rotationCalls(map, settings.phraseLength);
  if (calls.length === 0) return settings;
  return { ...settings, allowedTossCounts: calls };
}

/** True when the calls are exactly the named ones that fit. */
export function usesRotationCalls(settings: TossSettings, map: RotationMap): boolean {
  const want = rotationCalls(map, settings.phraseLength);
  const have = [...new Set(settings.allowedTossCounts)].sort((a, b) => a - b);
  return want.length === have.length && want.every((n, i) => n === have[i]);
}

/**
 * The note under the rotation map: which picked calls have no name (and are
 * still said as counts), or null when every call has one.
 */
export function unnamedCallsNote(
  settings: TossSettings,
  map: RotationMap,
  label: (call: number) => string,
): string | null {
  const unnamed = [...settings.allowedTossCounts]
    .sort((a, b) => a - b)
    .filter((call) => rotationForCall(call, map) === null);
  if (unnamed.length === 0) return null;
  const list = unnamed.map(label).join(', ');
  const verb = unnamed.length === 1 ? 'has no name and is' : 'have no name and are';
  return `${list} ${verb} still called as ${unnamed.length === 1 ? 'a count' : 'counts'}.`;
}
