/**
 * Past practice sessions: what is kept after Stop so stats survive the next
 * Start and app restarts.
 *
 * A session is reduced to a small record (when, how long, tempo, tosses,
 * drops, how often each call came up and was dropped) built from the same
 * SessionStats the stats card shows. Records are keyed by the wall-clock
 * start time, so re-saving a session (e.g. after a Drop marked just after
 * Stop) replaces it instead of adding a copy. Stored data is untrusted:
 * `parseStoredHistory` never throws and skips records it can't read.
 */

import { callLabel, isValidCall } from './calls';
import { SessionStats, formatDuration } from './stats';

export const HISTORY_STORAGE_KEY = 'guardrr.history';
export const HISTORY_VERSION = 1;
/** Oldest sessions are forgotten past this many. */
export const HISTORY_LIMIT = 200;

export interface SessionRecord {
  /** Wall-clock start (epoch ms); also the record's identity. */
  startedAt: number;
  durationMs: number;
  /** Tempo when the session was saved (the tempo can change while practicing). */
  bpm: number;
  phraseLength: number;
  tosses: number;
  drops: number;
  timesCalled: Readonly<Record<string, number>>;
  timesDropped: Readonly<Record<string, number>>;
}

export interface SessionContext {
  /** Wall-clock time Start was pressed (epoch ms). */
  startedAt: number;
  bpm: number;
  phraseLength: number;
}

/** The record for a session, or null when nothing was tossed (not worth keeping). */
export function sessionRecord(stats: SessionStats, context: SessionContext): SessionRecord | null {
  if (stats.tosses === 0) return null;
  const durationMs =
    stats.startedAtMs !== null && stats.lastCueAtMs !== null
      ? Math.max(0, Math.round(stats.lastCueAtMs - stats.startedAtMs))
      : 0;
  return {
    startedAt: context.startedAt,
    durationMs,
    bpm: context.bpm,
    phraseLength: context.phraseLength,
    tosses: stats.tosses,
    drops: stats.drops,
    timesCalled: { ...stats.timesCalled },
    timesDropped: { ...stats.timesDropped },
  };
}

/**
 * Add a session (newest first), replacing one with the same start time,
 * and keep at most `limit`.
 */
export function upsertSession(
  history: readonly SessionRecord[],
  record: SessionRecord,
  limit = HISTORY_LIMIT,
): SessionRecord[] {
  return [record, ...history.filter((r) => r.startedAt !== record.startedAt)]
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, Math.max(0, limit));
}

export function serializeHistory(history: readonly SessionRecord[]): string {
  return JSON.stringify({ version: HISTORY_VERSION, sessions: history });
}

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

/** A call → count map with only valid calls and positive whole counts, or null. */
function parseCallCounts(raw: unknown): Record<string, number> | null {
  if (!isObject(raw)) return null;
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    const call = Number(key);
    if (key.trim() === '' || !isValidCall(call) || !isCount(value)) return null;
    if (value > 0) out[String(call)] = value;
  }
  return out;
}

const sum = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);

function parseRecord(raw: unknown): SessionRecord | null {
  if (!isObject(raw)) return null;
  const { startedAt, durationMs, bpm, phraseLength, tosses, drops } = raw;
  if (!isCount(startedAt) || !isCount(tosses) || !isCount(drops)) return null;
  // Durations come from a sub-millisecond clock; accept fractions, keep whole ms.
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs < 0) return null;
  if (typeof bpm !== 'number' || !Number.isFinite(bpm) || bpm <= 0) return null;
  if (!isCount(phraseLength) || phraseLength < 1) return null;
  const timesCalled = parseCallCounts(raw.timesCalled);
  const timesDropped = parseCallCounts(raw.timesDropped);
  if (!timesCalled || !timesDropped) return null;
  // The totals must agree with the per-call counts, or the record is corrupt.
  if (tosses === 0 || sum(timesCalled) !== tosses || sum(timesDropped) !== drops) return null;
  if (Object.entries(timesDropped).some(([k, n]) => n > (timesCalled[k] ?? 0))) return null;
  return {
    startedAt,
    durationMs: Math.round(durationMs),
    bpm,
    phraseLength,
    tosses,
    drops,
    timesCalled,
    timesDropped,
  };
}

/** History from stored JSON (newest first, duplicates and unreadable records dropped). */
export function parseStoredHistory(json: string | null | undefined): SessionRecord[] {
  if (!json) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!isObject(raw) || !Array.isArray(raw.sessions)) return [];
  let history: SessionRecord[] = [];
  // Oldest first so that for duplicate start times the first-listed one wins.
  for (const item of [...raw.sessions].reverse()) {
    const record = parseRecord(item);
    if (record) history = upsertSession(history, record);
  }
  return history;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function startOfDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "Today 6:05 PM", "Yesterday 9:30 AM", "Oct 28 7:00 PM", "Dec 30, 2025 7:00 PM" (local time). */
export function formatSessionDate(startedAt: number, nowMs: number): string {
  const d = new Date(startedAt);
  const h = d.getHours() % 12 || 12;
  const time = `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
  const days = Math.round((startOfDay(nowMs) - startOfDay(startedAt)) / 86_400_000);
  if (days === 0) return `Today ${time}`;
  if (days === 1) return `Yesterday ${time}`;
  const sameYear = d.getFullYear() === new Date(nowMs).getFullYear();
  const date = `${MONTHS[d.getMonth()]} ${d.getDate()}${sameYear ? '' : `, ${d.getFullYear()}`}`;
  return `${date} ${time}`;
}

const percent = (rate: number | null) => (rate === null ? '–' : `${Math.round(rate * 100)}%`);
const catchRate = (tosses: number, drops: number) =>
  tosses > 0 ? (tosses - drops) / tosses : null;

export interface SessionRow {
  startedAt: number;
  date: string;
  tosses: number;
  drops: number;
  duration: string;
  /** "86%" */
  caught: string;
  bpm: number;
  phraseLength: number;
}

export interface CallHistory {
  call: number;
  label: string;
  times: number;
  drops: number;
  /** Share of this call's tosses not marked dropped, 0..1. */
  catchRate: number;
  caught: string;
}

export interface HistorySummary {
  sessions: number;
  tosses: number;
  drops: number;
  catchRate: number | null;
  caught: string;
  totalDuration: string;
  /** Every call that ever came up, smallest first. */
  calls: CallHistory[];
  /** Calls with the lowest catch rate (at least one drop), worst first; at most 3. */
  hardest: CallHistory[];
  /** The newest `rowCount` sessions. */
  rows: SessionRow[];
}

export function summarizeHistory(
  history: readonly SessionRecord[],
  nowMs: number,
  rowCount = 10,
): HistorySummary {
  let tosses = 0;
  let drops = 0;
  let durationMs = 0;
  const times: Record<string, number> = {};
  const dropped: Record<string, number> = {};
  for (const r of history) {
    tosses += r.tosses;
    drops += r.drops;
    durationMs += r.durationMs;
    for (const [k, n] of Object.entries(r.timesCalled)) times[k] = (times[k] ?? 0) + n;
    for (const [k, n] of Object.entries(r.timesDropped)) dropped[k] = (dropped[k] ?? 0) + n;
  }
  const calls = Object.entries(times)
    .map(([key, n]) => {
      const d = dropped[key] ?? 0;
      const rate = (n - d) / n;
      return {
        call: Number(key),
        label: callLabel(Number(key)),
        times: n,
        drops: d,
        catchRate: rate,
        caught: percent(rate),
      };
    })
    .sort((a, b) => a.call - b.call);
  const hardest = calls
    .filter((c) => c.drops > 0)
    .sort((a, b) => a.catchRate - b.catchRate || b.times - a.times || a.call - b.call)
    .slice(0, 3);
  const rate = catchRate(tosses, drops);
  return {
    sessions: history.length,
    tosses,
    drops,
    catchRate: rate,
    caught: percent(rate),
    totalDuration: formatDuration(durationMs),
    calls,
    hardest,
    rows: history.slice(0, rowCount).map((r) => ({
      startedAt: r.startedAt,
      date: formatSessionDate(r.startedAt, nowMs),
      tosses: r.tosses,
      drops: r.drops,
      duration: formatDuration(r.durationMs),
      caught: percent(catchRate(r.tosses, r.drops)),
      bpm: r.bpm,
      phraseLength: r.phraseLength,
    })),
  };
}
