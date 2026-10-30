/**
 * How fast the toss call is spoken.
 *
 * A few named speeds rather than a free slider: TTS rates aren't linear
 * across engines (iOS and Android both treat 1.0 as "normal", but the same
 * number sounds different), so a handful of clearly different steps is
 * easier to pick by ear. "Fast" (1.1) was the fixed rate before this setting
 * existed and stays the default: a call is one or two words and should land
 * close to its count.
 */

export interface VoiceRateOption {
  id: 'slow' | 'normal' | 'fast' | 'faster';
  label: string;
  rate: number;
}

export const VOICE_RATE_OPTIONS: readonly VoiceRateOption[] = [
  { id: 'slow', label: 'Slow', rate: 0.8 },
  { id: 'normal', label: 'Normal', rate: 1.0 },
  { id: 'fast', label: 'Fast', rate: 1.1 },
  { id: 'faster', label: 'Faster', rate: 1.3 },
];

export const DEFAULT_VOICE_RATE = 1.1;

/** Whether `rate` is one of the offered speeds (stored settings are untrusted). */
export function isVoiceRateOption(rate: unknown): rate is number {
  return typeof rate === 'number' && VOICE_RATE_OPTIONS.some((o) => o.rate === rate);
}

/** Label for a rate ("Fast"), or the number itself for an unknown one. */
export function voiceRateLabel(rate: number): string {
  return VOICE_RATE_OPTIONS.find((o) => o.rate === rate)?.label ?? `${rate}×`;
}

/** What "Test voice" says: a typical call, so rate and volume can be checked by ear. */
export const VOICE_TEST_PHRASE = 'five';
