/**
 * Saving and loading the practice settings.
 *
 * Stored data is untrusted: it may come from an older app version, be
 * hand-edited or truncated. `parseStoredSettings` never throws; each field
 * that is missing or invalid falls back to its default, and the toss
 * settings as a whole are re-validated so the result always starts.
 */

import { TossSettings, validateTossSettings } from './announce';
import { isValidCall } from './calls';
import { clampBpm } from './editSettings';
import { DEFAULT_COUNT_IN } from './countIn';
import { CueOptions } from './practice';
import { DEFAULT_VOICE_RATE, isVoiceRateOption } from './voiceRate';
import { isStoredVoiceId } from './voices';
import { MAX_PHRASE_LENGTH, MIN_PHRASE_LENGTH } from './timing';

export const SETTINGS_STORAGE_KEY = 'guardrr.settings';
export const SETTINGS_VERSION = 1;

/** Default tempo: Niv's "Quads 155" drill (2026-11-05). */
export const DEFAULT_BPM = 155;

/**
 * Toss settings the app starts with: quads. A quad is caught around the
 * "and" of 3 (see docs/colorguard-research.md); at 155 BPM a count is only
 * ~0.39 s, so calls run from 3 to 5 with the "and"s in between.
 */
export const QUADS_TOSS_SETTINGS: TossSettings = {
  phraseLength: 16,
  leadCounts: 4,
  allowedTossCounts: [3, 3.5, 4, 4.5, 5],
  allowRepeats: true,
};

export type CameraFacing = 'front' | 'back';

export interface CameraSettings {
  /** Show the camera behind the practice display (mirror-style self-check). */
  enabled: boolean;
  facing: CameraFacing;
}

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = { enabled: true, facing: 'front' };
export const DEFAULT_CUE_OPTIONS: Required<CueOptions> = {
  accentDownbeat: true,
  andClicks: false,
  haptics: true,
  catchHaptics: false,
};

export interface PracticeSettings {
  bpm: number;
  toss: TossSettings;
  cue: Required<CueOptions>;
  /** Counts of metronome before the first release; 0 = a full phrase (see countIn.ts). */
  countIn: number;
  /** Speech rate of the spoken call (one of VOICE_RATE_OPTIONS). */
  voiceRate: number;
  /**
   * Identifier of the voice that speaks the call (see voices.ts), or null for
   * the system default. Ignored when the phone no longer has that voice.
   */
  voice: string | null;
  /** Camera preview on the practice screen. */
  camera: CameraSettings;
}

export const DEFAULT_PRACTICE_SETTINGS: PracticeSettings = {
  bpm: DEFAULT_BPM,
  toss: QUADS_TOSS_SETTINGS,
  cue: DEFAULT_CUE_OPTIONS,
  countIn: DEFAULT_COUNT_IN,
  voiceRate: DEFAULT_VOICE_RATE,
  voice: null,
  camera: DEFAULT_CAMERA_SETTINGS,
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
  const d = DEFAULT_PRACTICE_SETTINGS.toss;
  if (!isObject(raw)) return d;
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
    return d;
  }
}

function parseCamera(raw: unknown): CameraSettings {
  if (!isObject(raw)) return DEFAULT_CAMERA_SETTINGS;
  return {
    enabled: bool(raw.enabled, DEFAULT_CAMERA_SETTINGS.enabled),
    facing:
      raw.facing === 'front' || raw.facing === 'back' ? raw.facing : DEFAULT_CAMERA_SETTINGS.facing,
  };
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
      haptics: bool(cue.haptics, DEFAULT_CUE_OPTIONS.haptics),
      catchHaptics: bool(cue.catchHaptics, DEFAULT_CUE_OPTIONS.catchHaptics),
    },
    countIn: int(raw.countIn, 0, MAX_PHRASE_LENGTH, DEFAULT_COUNT_IN),
    voiceRate: isVoiceRateOption(raw.voiceRate) ? raw.voiceRate : DEFAULT_VOICE_RATE,
    voice: isStoredVoiceId(raw.voice) ? raw.voice : null,
    camera: parseCamera(raw.camera),
  };
}
