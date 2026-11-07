/**
 * A practice session: drives the scheduler, turns ticks into cues and hands
 * them to the click player, the voice and a listener (the UI).
 *
 * Plain TypeScript with injected outputs so it runs under Jest fake timers;
 * usePracticeSession wraps it for React.
 */

import {
  CueOptions,
  LiveCueTimeline,
  PendingSettingsChange,
  PracticeCue,
  Scheduler,
  SchedulerOptions,
  TossSettings,
  createRng,
  createScheduler,
  firstCountIndex,
  randomSeed,
} from '../engine';
import type { ClickPlayer, Voice } from '../audio';
import type { HapticPlayer } from '../feedback';

export interface PracticeSessionOptions {
  bpm: number;
  settings: TossSettings;
  cueOptions?: CueOptions;
  clicks: Pick<ClickPlayer, 'play'>;
  voice: Voice;
  /** Vibration output; omit for none. */
  haptics?: HapticPlayer;
  /** Called on every tick with the cue (after sound and speech were triggered). */
  onCue?: (cue: PracticeCue) => void;
  /**
   * Counts of metronome before the first release (see countIn.ts);
   * 0 or omitted = a full lead-in phrase.
   */
  countIn?: number;
  /** Seed for the call sequence; random when omitted. */
  seed?: number;
  /** Scheduler overrides (clock/timers) for tests. */
  schedulerOverrides?: Pick<SchedulerOptions, 'now' | 'setTimer' | 'clearTimer'>;
}

export interface PracticeSession {
  start(): void;
  stop(): void;
  setBpm(bpm: number): void;
  /**
   * New toss settings. While running they start at the next phrase whose call
   * hasn't been spoken (see LiveCueTimeline); otherwise on the next start.
   * Throws on invalid settings, changing nothing.
   */
  setSettings(settings: TossSettings): void;
  /** Click/vibration options; apply from the next tick. */
  setCueOptions(options: CueOptions | undefined): void;
  /** Voice for the next call (the current one finishes in the old voice). */
  setVoice(voice: Voice): void;
  /** The toss settings of the phrase being played (the latest ones when stopped). */
  activeSettings(): TossSettings;
  /** A settings change waiting for its phrase, while running. */
  pendingChange(): PendingSettingsChange | null;
  readonly running: boolean;
  /** Calls made so far this run, oldest first. */
  callHistory(): readonly number[];
}

/** "and" ticks are needed for "and" catches and the optional "and" click. */
export const TICKS_PER_COUNT = 2;

export function createPracticeSession(options: PracticeSessionOptions): PracticeSession {
  let timeline: LiveCueTimeline | null = null;
  let scheduler: Scheduler | null = null;
  let bpm = options.bpm;
  let settings = options.settings;
  let cueOptions = options.cueOptions;
  let voice = options.voice;

  function onTick(raw: Parameters<SchedulerOptions['onTick']>[0]): void {
    if (!timeline) return;
    const cue = timeline.cueAt(raw, cueOptions);
    if (cue.click) options.clicks.play(cue.click);
    if (cue.haptic) options.haptics?.play(cue.haptic);
    if (cue.speak) voice.say(cue.speak);
    options.onCue?.(cue);
  }

  const isRunning = () => scheduler?.running ?? false;

  return {
    start() {
      if (scheduler?.running) return;
      // Validates the settings up front (throws before anything plays).
      // The scheduler counts from 0; a short count-in starts part-way into the lead-in phrase.
      timeline = new LiveCueTimeline(
        settings,
        createRng(options.seed ?? randomSeed()),
        firstCountIndex(options.countIn ?? 0, settings),
        TICKS_PER_COUNT,
      );
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
      voice.stop();
    },
    setBpm(next) {
      bpm = next;
      scheduler?.setBpm(next);
    },
    setSettings(next) {
      if (isRunning() && timeline) {
        timeline.scheduleSettings(next);
      } else {
        // Same validation as start(), so a bad change fails here and not on Start.
        new LiveCueTimeline(next, createRng(0));
      }
      settings = next;
    },
    setCueOptions(next) {
      cueOptions = next;
    },
    setVoice(next) {
      voice = next;
    },
    activeSettings() {
      return isRunning() && timeline ? timeline.activeSettings() : settings;
    },
    pendingChange() {
      return isRunning() ? (timeline?.pendingChange() ?? null) : null;
    },
    get running() {
      return isRunning();
    },
    callHistory() {
      return timeline?.callHistory() ?? [];
    },
  };
}
