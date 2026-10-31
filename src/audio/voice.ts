/**
 * Spoken toss calls via expo-speech.
 */

import * as Speech from 'expo-speech';

import { DEFAULT_VOICE_RATE } from '../engine/voiceRate';
import { VoiceInfo, callLanguage, callVoices } from '../engine/voices';

export interface VoiceOptions {
  /** Speech rate, 1.0 = normal. Calls are short, so slightly fast is clearer on time. */
  rate?: number;
  /** Voice identifier from `loadCallVoices`; omit for the system default. */
  voice?: string;
  /**
   * Language when no voice is chosen. Defaults to the phone's English, or US
   * English: the calls are English words even on a phone set to German.
   */
  language?: string;
}

export interface Voice {
  /** Speak a call, cutting off anything still being said. */
  say(text: string): void;
  stop(): void;
}

/** The phone's locale ("en-GB"), from Intl (Hermes supports it); undefined if unknown. */
export function deviceLocale(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || undefined;
  } catch {
    return undefined;
  }
}

export function createVoice(options: VoiceOptions = {}, speech: typeof Speech = Speech): Voice {
  const language = options.language ?? callLanguage(deviceLocale());
  return {
    say(text) {
      void speech.stop();
      speech.speak(text, {
        rate: options.rate ?? DEFAULT_VOICE_RATE,
        language,
        voice: options.voice,
      });
    },
    stop() {
      void speech.stop();
    },
  };
}

/**
 * English voices this phone can speak the call with, best first. Empty if
 * the list can't be read (some Android engines report nothing until their
 * first utterance; the picker retries when opened).
 */
export async function loadCallVoices(
  speech: Pick<typeof Speech, 'getAvailableVoicesAsync'> = Speech,
  locale: string | undefined = deviceLocale(),
): Promise<VoiceInfo[]> {
  try {
    const voices = await speech.getAvailableVoicesAsync();
    return callVoices(voices, locale);
  } catch {
    return [];
  }
}
