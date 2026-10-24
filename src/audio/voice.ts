/**
 * Spoken toss calls via expo-speech.
 */

import * as Speech from 'expo-speech';

export interface VoiceOptions {
  /** Speech rate, 1.0 = normal. Calls are short, so slightly fast is clearer on time. */
  rate?: number;
  language?: string;
}

export interface Voice {
  /** Speak a call, cutting off anything still being said. */
  say(text: string): void;
  stop(): void;
}

export const DEFAULT_VOICE_RATE = 1.1;

export function createVoice(options: VoiceOptions = {}, speech: typeof Speech = Speech): Voice {
  return {
    say(text) {
      void speech.stop();
      speech.speak(text, {
        rate: options.rate ?? DEFAULT_VOICE_RATE,
        language: options.language,
      });
    },
    stop() {
      void speech.stop();
    },
  };
}
