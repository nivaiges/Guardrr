/**
 * Keep the screen on while practicing: the phone is usually propped up across
 * the floor, and a dimmed screen would hide the count and the call.
 */

import * as KeepAwake from 'expo-keep-awake';
import { useEffect, useRef } from 'react';

export const PRACTICE_KEEP_AWAKE_TAG = 'guardrr-practice';

type KeepAwakeModule = Pick<typeof KeepAwake, 'activateKeepAwakeAsync' | 'deactivateKeepAwake'>;

export interface KeepAwakeController {
  /** Keep the screen on (true) or let it sleep again (false). Repeat calls are no-ops. */
  set(active: boolean): void;
}

export function createKeepAwakeController(
  keepAwake: KeepAwakeModule = KeepAwake,
  tag: string = PRACTICE_KEEP_AWAKE_TAG,
): KeepAwakeController {
  let active = false;
  return {
    set(next) {
      if (next === active) return;
      active = next;
      // Best effort: some platforms (e.g. web without the Wake Lock API) reject.
      const result = next
        ? keepAwake.activateKeepAwakeAsync(tag)
        : keepAwake.deactivateKeepAwake(tag);
      result.catch(() => {});
    },
  };
}

/** Keeps the screen awake while `active` is true, and releases it on unmount. */
export function useKeepAwakeWhile(active: boolean): void {
  const controller = useRef<KeepAwakeController | null>(null);
  controller.current ??= createKeepAwakeController();
  useEffect(() => {
    controller.current?.set(active);
  }, [active]);
  useEffect(() => () => controller.current?.set(false), []);
}
