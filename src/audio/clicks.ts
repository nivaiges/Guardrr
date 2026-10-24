/**
 * Metronome click playback on expo-audio.
 *
 * Each click kind gets a small pool of preloaded players used round-robin,
 * so a click can start while the previous one of the same kind is still
 * ringing (at 400 BPM with "and"s, ticks are 75 ms apart; samples are 50 ms).
 */

import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import type { ClickKind } from '../engine';

const SOURCES: Record<ClickKind, number> = {
  accent: require('../../assets/sounds/click-accent.wav'),
  count: require('../../assets/sounds/click-count.wav'),
  and: require('../../assets/sounds/click-and.wav'),
};

const POOL_SIZE = 2;

export interface ClickPlayer {
  play(kind: ClickKind): void;
  /** Free the native players. The ClickPlayer can't be used afterwards. */
  release(): void;
}

/** Configure the audio session for practice: audible in silent mode, mixes with music. */
export async function configurePracticeAudio(): Promise<void> {
  await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
}

export function createClickPlayer(
  factory: (source: number) => AudioPlayer = (source) => createAudioPlayer(source),
): ClickPlayer {
  const pools = {} as Record<ClickKind, AudioPlayer[]>;
  const nextIndex: Record<ClickKind, number> = { accent: 0, count: 0, and: 0 };
  for (const kind of Object.keys(SOURCES) as ClickKind[]) {
    pools[kind] = Array.from({ length: POOL_SIZE }, () => factory(SOURCES[kind]));
  }
  let released = false;

  return {
    play(kind) {
      if (released) return;
      const pool = pools[kind];
      const player = pool[nextIndex[kind]];
      nextIndex[kind] = (nextIndex[kind] + 1) % pool.length;
      // A finished player sits at the end of the sample; rewind before playing.
      void player.seekTo(0);
      player.play();
    },
    release() {
      if (released) return;
      released = true;
      for (const pool of Object.values(pools)) for (const p of pool) p.remove();
    },
  };
}
