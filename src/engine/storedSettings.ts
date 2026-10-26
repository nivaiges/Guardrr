/**
 * Saving and loading the practice settings.
 *
 * Stored data is untrusted: it may come from an older app version, be
 * hand-edited or truncated. `parseStoredSettings` never throws; each field
 * that is missing or invalid falls back to its default, and the toss
 * settings as a whole are re-validated so the result always starts.
 */

import { DEFAULT_TOSS_SETTINGS, TossSettings, validateTossSettings } from './announce';
import { isValidCall } from './calls';
import { clampBpm } from './editSettings';
import { CueOptions } from './practice';
import { MAX_PHRASE_LENGTH, MIN_PHRASE_LENGTH } from './timing';

export const SETTINGS_STORAGE_KEY = 'guardrr.settings';
export const SETTINGS_VERSION = 1;

export const DEFAULT_BPM = 120;
export const DEFAULT_CUE_OPTIONS: Required<CueOptions> = {
  accentDownbeat: true,
  andClicks: false,
};

export interface PracticeSettings {
  bpm: number;
  toss: TossSettings;
  cue: Required<CueOptions>;
}

export const DEFAULT_PRACTICE_SETTINGS: PracticeSettings = {
  bpm: DEFAULT_BPM,
  toss: DEFAULT_TOSS_SETTINGS,
  cue: DEFAULT_CUE_OPTIONS,
};

export function serializeSettings(settings: PracticeSettings): string {
  return JSON.stringify({ version: SETTINGS_VERSION, ...settings });
}

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function int(v: unknown, lo: number, hi: number, fallback: number): number {
  return typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : fallback;
}

function parseToss(raw: unknown): TossSettings {
  if (!isObject(raw)) return DEFAULT_TOSS_SETTINGS;
  const d = DEFAULT_TOSS_SETTINGS;
  const phraseLength = int(raw.phraseLength, MIN_PHRASE_LENGTH, MAX_PHRASE_LENGTH, d.phraseLength);
  const counts = Array.isArray(raw.allowedTossCounts)
    ? raw.allowedTossCounts.filter((n): n is number => typeof n === 'number' && isValidCall(n))
    : [];
  const candidate: TossSettings = {
    phraseLength,
    leadCounts: int(raw.leadCounts, 1, phraseLength, Math.min(d.leadCounts, phraseLength)),
    allowedTossCounts: counts.length > 0 ? counts : d.allowedTossCounts,
    allowRepeats: bool(raw.allowRepeats, d.allowRepeats),
  };
  try {
    // Keep only calls that fit; if none do, the whole toss block is unusable.
    return { ...candidate, allowedTossCounts: validateTossSettings(candidate) };
  } catch {
    return DEFAULT_TOSS_SETTINGS;
  }
}

/** Settings from stored JSON (or null when nothing is stored). Never throws. */
export function parseStoredSettings(json: string | null | undefined): PracticeSettings {
  if (!json) return DEFAULT_PRACTICE_SETTINGS;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return DEFAULT_PRACTICE_SETTINGS;
  }
  if (!isObject(raw)) return DEFAULT_PRACTICE_SETTINGS;
  const cue = isObject(raw.cue) ? raw.cue : {};
  return {
    bpm: typeof raw.bpm === 'number' && Number.isFinite(raw.bpm) ? clampBpm(raw.bpm) : DEFAULT_BPM,
    toss: parseToss(raw.toss),
    cue: {
      accentDownbeat: bool(cue.accentDownbeat, DEFAULT_CUE_OPTIONS.accentDownbeat),
      andClicks: bool(cue.andClicks, DEFAULT_CUE_OPTIONS.andClicks),
    },
  };
}
