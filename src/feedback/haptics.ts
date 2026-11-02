/**
 * Vibration cues via expo-haptics.
 *
 * A firm impact on each release gives the performer a count 1 they can feel
 * even when the click is drowned out (e.g. a loud gym or headphones off).
 * The optional catch tap is lighter, so the two never feel alike.
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
      const style =
        kind === 'release' ? haptics.ImpactFeedbackStyle.Heavy : haptics.ImpactFeedbackStyle.Light;
      // Fire and forget: unsupported devices (no Taptic Engine, web) reject.
      haptics.impactAsync(style).catch(() => {});
    },
  };
}
