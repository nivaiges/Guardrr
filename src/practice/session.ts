/**
 * A practice session: drives the scheduler, turns ticks into cues and hands
 * them to the click player, the voice and a listener (the UI).
 *
 * Plain TypeScript with injected outputs so it runs under Jest fake timers;
 * usePracticeSession wraps it for React.
 */

import {
  CallSequence,
  CueOptions,
  PracticeCue,
  Scheduler,
  SchedulerOptions,
  TossSettings,
  createRng,
  createScheduler,
  cueForTick,
  randomSeed,
} from '../engine';
import type { ClickPlayer, Voice } from '../audio';

export interface PracticeSessionOptions {
  bpm: number;
  settings: TossSettings;
  cueOptions?: CueOptions;
  clicks: Pick<ClickPlayer, 'play'>;
  voice: Voice;
  /** Called on every tick with the cue (after sound and speech were triggered). */
  onCue?: (cue: PracticeCue) => void;
  /** Seed for the call sequence; random when omitted. */
  seed?: number;
  /** Scheduler overrides (clock/timers) for tests. */
  schedulerOverrides?: Pick<SchedulerOptions, 'now' | 'setTimer' | 'clearTimer'>;
}

export interface PracticeSession {
  start(): void;
  stop(): void;
  setBpm(bpm: number): void;
  readonly running: boolean;
  /** Calls made so far this run, oldest first. */
  callHistory(): readonly number[];
}

/** "and" ticks are needed for "and" catches and the optional "and" click. */
export const TICKS_PER_COUNT = 2;

export function createPracticeSession(options: PracticeSessionOptions): PracticeSession {
  let calls: CallSequence | null = null;
  let scheduler: Scheduler | null = null;
  let bpm = options.bpm;

  function onTick(tick: Parameters<SchedulerOptions['onTick']>[0]): void {
    if (!calls) return;
    const cue = cueForTick(tick, options.settings, calls, options.cueOptions);
    if (cue.click) options.clicks.play(cue.click);
    if (cue.speak) options.voice.say(cue.speak);
    options.onCue?.(cue);
  }

  return {
    start() {
      if (scheduler?.running) return;
      // Validates the settings up front (throws before anything plays).
      calls = new CallSequence(options.settings, createRng(options.seed ?? randomSeed()));
      scheduler = createScheduler({
        bpm,
        ticksPerCount: TICKS_PER_COUNT,
        onTick,
        ...options.schedulerOverrides,
      });
      scheduler.start();
    },
    stop() {
      scheduler?.stop();
      options.voice.stop();
    },
    setBpm(next) {
      bpm = next;
      scheduler?.setBpm(next);
    },
    get running() {
      return scheduler?.running ?? false;
    },
    callHistory() {
      return calls?.history() ?? [];
    },
  };
}
