/**
 * Vibration cues via expo-haptics.
 *
 * A firm impact on each release gives the performer a count 1 they can feel
 * even when the click is drowned out (e.g. a loud gym or headphones off).
 */

import * as Haptics from 'expo-haptics';

import type { HapticKind } from '../engine';

export interface HapticPlayer {
  play(kind: HapticKind): void;
}

type HapticsModule = Pick<typeof Haptics, 'impactAsync' | 'ImpactFeedbackStyle'>;

export function createHapticPlayer(haptics: HapticsModule = Haptics): HapticPlayer {
  return {
    play(kind) {
      if (kind === 'release') {
        // Fire and forget: unsupported devices (no Taptic Engine, web) reject.
        haptics.impactAsync(haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }
    },
  };
}
