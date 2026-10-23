/**
 * Drift-correcting tick scheduler.
 *
 * Every tick has an absolute target time (anchor + n × interval). After each
 * tick the next timer is set for `target − now`, so a timer that fires late
 * never pushes later ticks back: error never accumulates.
 *
 * Framework-free: the clock and the timer functions are injected, so it runs
 * under Jest fake timers and can later be driven by an audio clock.
 */

import { msPerCount } from './timing';

export interface Tick {
  /** 0-based tick number since start (counts × ticksPerCount). */
  tick: number;
  /** 0-based absolute count index this tick belongs to. */
  countIndex: number;
  /** 0 on the count itself; 1 on the "and" when ticksPerCount = 2. */
  subdivision: number;
  /** When the tick should sound, on the injected clock (ms). */
  targetTimeMs: number;
  /** How late the callback ran relative to the target (negative = early, with lookahead). */
  lateMs: number;
}

export type TimerHandle = unknown;

export interface SchedulerOptions {
  bpm: number;
  onTick: (tick: Tick) => void;
  /** Ticks per count: 1 = counts only, 2 = counts and "and"s. Default 1. */
  ticksPerCount?: number;
  /**
   * Run each callback this many ms before its target, so audio can be
   * scheduled ahead on a precise clock. Default 0.
   */
  lookaheadMs?: number;
  /**
   * Ticks more than this late are skipped instead of played in a burst
   * (e.g. after the JS thread stalled). Default: one tick interval.
   */
  maxLateMs?: number;
  /** Called with the ticks that were skipped because they were too late. */
  onSkip?: (skippedTicks: number[]) => void;
  /** Clock in ms. Default: performance.now() when available, else Date.now(). */
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => TimerHandle;
  clearTimer?: (handle: TimerHandle) => void;
}

export interface Scheduler {
  /** Start ticking; tick 0 is due at `startTimeMs` (default: now). */
  start(startTimeMs?: number): void;
  stop(): void;
  /** Change tempo without a jump: the next tick keeps its time, later ones respace. */
  setBpm(bpm: number): void;
  readonly running: boolean;
  /** The next tick that will fire. */
  readonly nextTick: number;
  /** Target time of tick `n` under the current anchor and tempo. */
  targetTimeOf(tick: number): number;
}

function defaultNow(): number {
  const perf = (globalThis as { performance?: { now(): number } }).performance;
  return perf ? perf.now() : Date.now();
}

export function createScheduler(options: SchedulerOptions): Scheduler {
  const ticksPerCount = options.ticksPerCount ?? 1;
  if (!Number.isInteger(ticksPerCount) || ticksPerCount < 1 || ticksPerCount > 4) {
    throw new RangeError(`ticksPerCount must be an integer 1..4, got ${ticksPerCount}`);
  }
  const lookaheadMs = options.lookaheadMs ?? 0;
  if (!Number.isFinite(lookaheadMs) || lookaheadMs < 0) {
    throw new RangeError(`lookaheadMs must be >= 0, got ${lookaheadMs}`);
  }
  const now = options.now ?? defaultNow;
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer =
    options.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));

  let intervalMs = msPerCount(options.bpm) / ticksPerCount;
  // Ticks are timed from an anchor so tempo changes don't rewrite the past.
  let anchorTick = 0;
  let anchorTimeMs = 0;
  let next = 0;
  let running = false;
  let timer: TimerHandle | null = null;

  const maxLateMs = () => options.maxLateMs ?? intervalMs;
  const targetTimeOf = (tick: number) => anchorTimeMs + (tick - anchorTick) * intervalMs;

  function arm(): void {
    const delay = Math.max(0, targetTimeOf(next) - lookaheadMs - now());
    timer = setTimer(run, delay);
  }

  function run(): void {
    timer = null;
    if (!running) return;
    const t = now();
    const skipped: number[] = [];
    // Fire every tick that is due (normally exactly one).
    while (running && targetTimeOf(next) - lookaheadMs <= t) {
      const target = targetTimeOf(next);
      const lateMs = t - target;
      if (lateMs > maxLateMs()) {
        skipped.push(next);
      } else {
        options.onTick({
          tick: next,
          countIndex: Math.floor(next / ticksPerCount),
          subdivision: next % ticksPerCount,
          targetTimeMs: target,
          lateMs,
        });
      }
      next++;
    }
    if (skipped.length > 0) options.onSkip?.(skipped);
    if (running) arm();
  }

  return {
    start(startTimeMs?: number) {
      if (running) return;
      running = true;
      anchorTick = 0;
      anchorTimeMs = startTimeMs ?? now();
      next = 0;
      run();
    },
    stop() {
      running = false;
      if (timer !== null) clearTimer(timer);
      timer = null;
    },
    setBpm(bpm: number) {
      const newInterval = msPerCount(bpm) / ticksPerCount;
      anchorTimeMs = targetTimeOf(next);
      anchorTick = next;
      intervalMs = newInterval;
      if (running) {
        if (timer !== null) clearTimer(timer);
        arm();
      }
    },
    get running() {
      return running;
    },
    get nextTick() {
      return next;
    },
    targetTimeOf,
  };
}
