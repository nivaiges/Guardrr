/**
 * Vibration cues via expo-haptics.
 *
 * A firm impact on each release gives the performer a count 1 they can feel
 * even when the click is drowned out (e.g. a loud gym or headphones off).
 * The optional catch tap is lighter, so the two never feel alike. The
 * optional call buzz uses the system "warning" pattern (a double pulse), so it
 * can't be mistaken for either impact.
 */

import * as Haptics from 'expo-haptics';

import type { HapticKind } from '../engine';

export interface HapticPlayer {
  play(kind: HapticKind): void;
}

type HapticsModule = Pick<
  typeof Haptics,
  'impactAsync' | 'ImpactFeedbackStyle' | 'notificationAsync' | 'NotificationFeedbackType'
>;

export function createHapticPlayer(haptics: HapticsModule = Haptics): HapticPlayer {
  return {
    play(kind) {
      // Fire and forget: unsupported devices (no Taptic Engine, web) reject.
      if (kind === 'call') {
        haptics.notificationAsync(haptics.NotificationFeedbackType.Warning).catch(() => {});
        return;
      }
      const style =
        kind === 'release' ? haptics.ImpactFeedbackStyle.Heavy : haptics.ImpactFeedbackStyle.Light;
      haptics.impactAsync(style).catch(() => {});
    },
  };
}
