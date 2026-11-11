/**
 * Session stats: what happened during one practice run.
 *
 * Built by folding the per-tick practice cues (the same cues that drive the
 * click, the voice and the display), so the stats can't disagree with what
 * the performer heard. Immutable and framework-free; the caller supplies the
 * time so tests don't need a clock.
 */

import { callLabel } from './calls';
import { PracticeCue } from './practice';

/** How many recent tosses the history keeps. */
export const STATS_HISTORY_LIMIT = 50;

export interface TossRecord {
  /** Phrase the toss was released in (1 = first toss). */
  phrase: number;
  call: number;
  /** Marked as dropped by the performer (the "Drop" button). */
  dropped?: boolean;
  /** `countsPlayed` when the toss was released (absent in hand-built records). */
  releasedAtCount?: number;
  /** The toss's catch moment was reached. */
  caught?: boolean;
}

/**
 * For this many counts after a release, while the new toss is still in the
 * air, Drop marks the toss before it: a drop noticed late (e.g. a 7-count toss
 * in an 8-count phrase, caught one count before the next release) still lands
 * on the right toss, and nobody can tell yet whether the toss just released
 * will be dropped.
 */
export const DROP_GRACE_COUNTS = 2;

export interface SessionStats {
  /** Time of the first cue, or null before anything happened. */
  startedAtMs: number | null;
  /** Time of the latest cue. */
  lastCueAtMs: number | null;
  /** Counts (not "and"s) played, lead-in included. */
  countsPlayed: number;
  /** Tosses released (one per call that reached its count 1). */
  tosses: number;
  /** Tosses whose catch moment was reached. */
  catches: number;
  /** Most recent tosses, oldest first (at most STATS_HISTORY_LIMIT). */
  recent: readonly TossRecord[];
  /** How often each call was released, over the whole session. */
  timesCalled: Readonly<Record<string, number>>;
  /** Tosses the performer marked as dropped. */
  drops: number;
  /** How often each call was dropped, over the whole session. */
  timesDropped: Readonly<Record<string, number>>;
}

export const EMPTY_STATS: SessionStats = {
  startedAtMs: null,
  lastCueAtMs: null,
  countsPlayed: 0,
  tosses: 0,
  catches: 0,
  recent: [],
  timesCalled: {},
  drops: 0,
  timesDropped: {},
};

/** Fold one cue into the stats. Returns the same object when nothing changed. */
export function recordCue(stats: SessionStats, cue: PracticeCue, nowMs: number): SessionStats {
  const onCount = cue.subdivision === 0;
  const released = cue.release && cue.currentCall !== null;
  const caught = cue.catch && cue.currentCall !== null;
  if (!onCount && !released && !caught) return stats;

  let { recent, timesCalled, tosses } = stats;
  const countsPlayed = stats.countsPlayed + (onCount ? 1 : 0);
  if (caught && recent.length > 0) {
    // The catch belongs to the latest toss (a toss is caught before the next release).
    const last = recent[recent.length - 1];
    if (!last.caught) recent = [...recent.slice(0, -1), { ...last, caught: true }];
  }
  if (released) {
    const call = cue.currentCall as number;
    tosses += 1;
    recent = [...recent, { phrase: cue.phrase, call, releasedAtCount: countsPlayed }].slice(
      -STATS_HISTORY_LIMIT,
    );
    const key = String(call);
    timesCalled = { ...timesCalled, [key]: (timesCalled[key] ?? 0) + 1 };
  }
  return {
    ...stats,
    startedAtMs: stats.startedAtMs ?? nowMs,
    lastCueAtMs: nowMs,
    countsPlayed,
    tosses,
    catches: stats.catches + (caught ? 1 : 0),
    recent,
    timesCalled,
  };
}

export interface DropTarget {
  /** Index into `stats.recent`. */
  index: number;
  /** Toss number in the session (1 = first toss). */
  toss: number;
  call: number;
  dropped: boolean;
  /** True when this is the toss before the latest one (see DROP_GRACE_COUNTS). */
  previous: boolean;
}

/**
 * The toss Drop would mark right now: the latest toss, except during the
 * first DROP_GRACE_COUNTS counts after a release, before that toss is caught,
 * when it's the toss before it. Null before the first toss.
 */
export function dropTarget(stats: SessionStats): DropTarget | null {
  const n = stats.recent.length;
  if (n === 0) return null;
  const latest = stats.recent[n - 1];
  const inGrace =
    n >= 2 &&
    !latest.caught &&
    latest.releasedAtCount !== undefined &&
    stats.countsPlayed - latest.releasedAtCount < DROP_GRACE_COUNTS;
  const index = inGrace ? n - 2 : n - 1;
  const record = stats.recent[index];
  return {
    index,
    toss: stats.tosses - (n - 1 - index),
    call: record.call,
    dropped: record.dropped === true,
    previous: inGrace,
  };
}

/** Whether the latest toss is marked as dropped (false before the first toss). */
export function latestTossDropped(stats: SessionStats): boolean {
  return stats.recent[stats.recent.length - 1]?.dropped === true;
}

function bump(counts: Readonly<Record<string, number>>, call: number, by: number) {
  const key = String(call);
  const next = (counts[key] ?? 0) + by;
  const { [key]: _removed, ...rest } = counts;
  return next > 0 ? { ...rest, [key]: next } : rest;
}

/**
 * Mark the drop target (see dropTarget) as dropped, or un-mark it if it
 * already is (so a mistaken tap can be undone with a second one). Returns the
 * same object before the first toss.
 */
export function toggleDrop(stats: SessionStats): SessionStats {
  const target = dropTarget(stats);
  if (!target) return stats;
  const record = stats.recent[target.index];
  const dropped = !target.dropped;
  const by = dropped ? 1 : -1;
  const recent = [...stats.recent];
  recent[target.index] = { ...record, dropped };
  return {
    ...stats,
    recent,
    drops: stats.drops + by,
    timesDropped: bump(stats.timesDropped, record.call, by),
  };
}

/** Button text and screen-reader hint for Drop, for the current target. */
export function dropButtonText(stats: SessionStats): {
  label: string;
  detail: string | null;
  hint: string;
} | null {
  const target = dropTarget(stats);
  if (!target) return null;
  const label = target.dropped ? 'Undo drop' : 'Drop';
  const which = target.previous ? 'the previous toss' : 'the latest toss';
  const detail = target.previous ? `toss ${target.toss} · ${callLabel(target.call)}` : null;
  const hint = target.dropped
    ? `Counts ${which} (${callLabel(target.call)}) as caught again`
    : `Marks ${which} (${callLabel(target.call)}) as dropped`;
  return { label, detail, hint };
}

export interface CallTally {
  call: number;
  label: string;
  times: number;
  /** Share of all tosses, 0..1. */
  share: number;
  /** Times this call was marked dropped. */
  drops: number;
}

export interface StatsSummary {
  tosses: number;
  catches: number;
  drops: number;
  /** Tosses not marked dropped, 0..1; null before the first toss. */
  catchRate: number | null;
  /** "86%", or "–" before the first toss. */
  catchRateLabel: string;
  durationMs: number;
  /** "4:05" style elapsed time. */
  duration: string;
  /** Every call that came up, smallest call first. */
  tally: CallTally[];
  /** Call(s) that came up most often (ties included); empty before the first toss. */
  mostCalled: number[];
  /** Labels of the latest tosses, newest first. */
  latest: string[];
}

/** "m:ss", or "h:mm:ss" past an hour. Negative or invalid input reads as 0:00. */
export function formatDuration(ms: number): string {
  const total = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export function summarizeStats(stats: SessionStats, latestCount = 8): StatsSummary {
  const durationMs =
    stats.startedAtMs !== null && stats.lastCueAtMs !== null
      ? stats.lastCueAtMs - stats.startedAtMs
      : 0;
  const tally = Object.entries(stats.timesCalled)
    .map(([key, times]) => {
      const call = Number(key);
      return {
        call,
        label: callLabel(call),
        times,
        share: stats.tosses ? times / stats.tosses : 0,
        drops: stats.timesDropped[key] ?? 0,
      };
    })
    .sort((a, b) => a.call - b.call);
  const top = Math.max(0, ...tally.map((t) => t.times));
  const catchRate = stats.tosses > 0 ? (stats.tosses - stats.drops) / stats.tosses : null;
  return {
    tosses: stats.tosses,
    catches: stats.catches,
    drops: stats.drops,
    catchRate,
    catchRateLabel: catchRate === null ? '–' : `${Math.round(catchRate * 100)}%`,
    durationMs,
    duration: formatDuration(durationMs),
    tally,
    mostCalled: top > 0 ? tally.filter((t) => t.times === top).map((t) => t.call) : [],
    latest: stats.recent
      .slice(-latestCount)
      .reverse()
      .map((r) => (r.dropped ? `${callLabel(r.call)} ✗` : callLabel(r.call))),
  };
}
