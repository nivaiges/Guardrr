/**
 * Vibration cues via expo-haptics.
 *
 * A firm impact on each release gives the performer a count 1 they can feel
 * even when the click is drowned out (e.g. a loud gym or headphones off).
 * The optional catch tap is lighter, so the two never feel alike. The
 * optional call buzz uses the system "warning" pattern (a double pulse), so it
 * can't be mistaken for either impact — or, with "Buzz the number", taps out
 * the call as a row of medium impacts (see callPulsePattern).
 */

import * as Haptics from 'expo-haptics';

import type { CallPulse, HapticKind } from '../engine';

export interface HapticPlayer {
  play(kind: HapticKind): void;
  /**
   * Plays a call's pulses (offsets from now). Optional: players without it
   * get the double buzz instead.
   */
  playPulses?(pulses: readonly CallPulse[]): void;
  /** Cancels pulses that haven't played yet (on Stop). */
  stop?(): void;
}

type HapticsModule = Pick<
  typeof Haptics,
  'impactAsync' | 'ImpactFeedbackStyle' | 'notificationAsync' | 'NotificationFeedbackType'
>;

export interface HapticTimers {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

const defaultTimers: HapticTimers = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function createHapticPlayer(
  haptics: HapticsModule = Haptics,
  timers: HapticTimers = defaultTimers,
): HapticPlayer {
  // Fire and forget: unsupported devices (no Taptic Engine, web) reject.
  const impact = (style: Haptics.ImpactFeedbackStyle) => {
    haptics.impactAsync(style).catch(() => {});
  };
  let pending: unknown[] = [];

  function stop() {
    for (const handle of pending) timers.clearTimeout(handle);
    pending = [];
  }

  return {
    play(kind) {
      if (kind === 'call') {
        haptics.notificationAsync(haptics.NotificationFeedbackType.Warning).catch(() => {});
        return;
      }
      impact(
        kind === 'release' ? haptics.ImpactFeedbackStyle.Heavy : haptics.ImpactFeedbackStyle.Light,
      );
    },
    playPulses(pulses) {
      // A new call replaces any pulses left over from the last one.
      stop();
      for (const pulse of pulses) {
        const style =
          pulse.strength === 'medium'
            ? haptics.ImpactFeedbackStyle.Medium
            : haptics.ImpactFeedbackStyle.Light;
        if (pulse.atMs <= 0) {
          impact(style);
          continue;
        }
        // A pattern lasts under a second, so plain timers are accurate enough.
        const handle = timers.setTimeout(() => {
          pending = pending.filter((h) => h !== handle);
          impact(style);
        }, pulse.atMs);
        pending.push(handle);
      }
    },
    stop,
  };
}
