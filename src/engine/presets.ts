/**
 * Practice presets: one-tap starting points for the settings screen.
 *
 * A preset sets the tempo and the toss settings (phrase, lead counts, calls,
 * repeats). Sound options (accent, "and" clicks) are personal and left alone.
 * Every preset is valid by construction (checked in the tests), and
 * `matchingPreset` tells the UI which preset, if any, the current settings
 * still equal — editing any field afterwards simply "un-selects" it.
 */

import { TossSettings } from './announce';
import { PracticeSettings } from './storedSettings';

export interface PracticePreset {
  id: string;
  name: string;
  /** One line for the settings screen. */
  description: string;
  bpm: number;
  toss: TossSettings;
}

export const PRACTICE_PRESETS: readonly PracticePreset[] = [
  {
    id: 'standard-16',
    name: 'Standard 16',
    description: 'Calls 1–7, spoken on the "5" of 5-6-7-8',
    bpm: 120,
    toss: {
      phraseLength: 16,
      leadCounts: 4,
      allowedTossCounts: [1, 2, 3, 4, 5, 6, 7],
      allowRepeats: true,
    },
  },
  {
    id: 'quick-8',
    name: 'Quick 8',
    description: 'A toss every 8 counts, calls 2–5',
    bpm: 120,
    toss: {
      phraseLength: 8,
      leadCounts: 4,
      allowedTossCounts: [2, 3, 4, 5],
      allowRepeats: true,
    },
  },
  {
    id: 'singles-doubles',
    name: 'Singles & doubles',
    description: 'Short tosses 2–4 incl. "and" catches (2&, 3&), no repeats',
    bpm: 112,
    toss: {
      phraseLength: 8,
      leadCounts: 4,
      allowedTossCounts: [2, 2.5, 3, 3.5, 4],
      allowRepeats: false,
    },
  },
  {
    id: 'big-tosses',
    name: 'Big tosses',
    description: 'Long air time: calls 5–8, called a full 8 counts early',
    bpm: 108,
    toss: {
      phraseLength: 16,
      leadCounts: 8,
      allowedTossCounts: [5, 6, 7, 8],
      allowRepeats: false,
    },
  },
  {
    id: 'slow-32',
    name: 'Slow 32',
    description: 'Lots of recovery time between tosses, calls 1–7',
    bpm: 96,
    toss: {
      phraseLength: 32,
      leadCounts: 8,
      allowedTossCounts: [1, 2, 3, 4, 5, 6, 7],
      allowRepeats: true,
    },
  },
];

export function presetById(id: string): PracticePreset | undefined {
  return PRACTICE_PRESETS.find((p) => p.id === id);
}

/** Settings with the preset applied; sound options are kept. */
export function applyPreset(settings: PracticeSettings, preset: PracticePreset): PracticeSettings {
  return {
    ...settings,
    bpm: preset.bpm,
    toss: { ...preset.toss, allowedTossCounts: [...preset.toss.allowedTossCounts] },
  };
}

function sameCalls(a: readonly number[], b: readonly number[]): boolean {
  const sa = [...new Set(a)].sort((x, y) => x - y);
  const sb = [...new Set(b)].sort((x, y) => x - y);
  return sa.length === sb.length && sa.every((n, i) => n === sb[i]);
}

/** True when the toss settings equal the preset's (call order doesn't matter). */
export function tossMatchesPreset(toss: TossSettings, preset: PracticePreset): boolean {
  const p = preset.toss;
  return (
    toss.phraseLength === p.phraseLength &&
    toss.leadCounts === p.leadCounts &&
    toss.allowRepeats === p.allowRepeats &&
    sameCalls(toss.allowedTossCounts, p.allowedTossCounts)
  );
}

/**
 * The preset the settings currently match, if any. Tempo is ignored, so
 * nudging the BPM (or tap tempo) keeps the preset highlighted.
 */
export function matchingPreset(settings: PracticeSettings): PracticePreset | null {
  return PRACTICE_PRESETS.find((p) => tossMatchesPreset(settings.toss, p)) ?? null;
}
