/**
 * Leaving the screen mid-practice.
 *
 * The metronome runs on JS timers, which Android pauses and iOS suspends once
 * the app is in the background (see docs/background-audio.md). Rather than
 * resuming mid-phrase with the time away counted as practice, a session stops
 * when the app goes to the background, and the practice page says why.
 *
 * Framework-free: app states are React Native's AppState strings.
 */

import { StatsSummary } from './stats';

/**
 * True when a running session should stop for this app-state change. Only
 * `background` stops it: iOS's `inactive` (Control Center, a notification
 * banner, the app switcher opening) keeps the app on screen and timers running.
 */
export function shouldStopForAppState(appState: string, running: boolean): boolean {
  return running && appState === 'background';
}

/**
 * How long after leaving the screen Resume is still offered. Past this, coming
 * back is a new practice, not a pause (the warm-up is gone anyway).
 */
export const RESUME_WINDOW_MS = 30 * 60 * 1000;

/**
 * Whether the practice page offers Resume: the session stopped because the
 * app left the screen, had at least one toss (otherwise Start is the same
 * thing), and it's been at most RESUME_WINDOW_MS.
 */
export function canResume(stoppedAtMs: number | null, nowMs: number, tosses: number): boolean {
  if (stoppedAtMs === null || tosses <= 0) return false;
  const away = nowMs - stoppedAtMs;
  return away >= 0 && away <= RESUME_WINDOW_MS;
}

/**
 * The note shown on the practice page until the next Start, e.g.
 * "Stopped when Guardrr left the screen, after 7 tosses (2:15). They're saved
 * in History. Tap Start to go again." With `resumable`, the last sentence
 * offers Resume instead: "Resume keeps counting this session; Start begins a
 * new one."
 */
export function interruptedNote(
  summary: Pick<StatsSummary, 'tosses' | 'duration'>,
  resumable = false,
): string {
  const lead = 'Stopped when Guardrr left the screen';
  if (summary.tosses <= 0) return `${lead}. Tap Start to go again.`;
  const again = resumable
    ? 'Resume keeps counting this session; Start begins a new one.'
    : 'Tap Start to go again.';
  const saved = summary.tosses === 1 ? "It's saved in History." : "They're saved in History.";
  const tosses = `${summary.tosses} ${summary.tosses === 1 ? 'toss' : 'tosses'}`;
  return `${lead}, after ${tosses} (${summary.duration}). ${saved} ${again}`;
}
