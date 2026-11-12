/**
 * Catch-rate trend per call: is a call getting better over the last few
 * sessions? Built from saved session records (newest first, as History keeps
 * them), so it follows the History filter when given the filtered list.
 */

import { callLabel } from './calls';
import { SessionRecord, formatSessionDate, sessionRowDetail } from './history';

/** How many of a call's most recent sessions the trend looks at. */
export const TREND_SESSIONS = 10;
/**
 * Catch-rate change (0..1) between the earlier and later sessions below which
 * a call reads as steady: one drop in 20 tosses is noise, not a trend.
 */
export const TREND_STEADY_CHANGE = 0.05;

export type TrendDirection = 'better' | 'worse' | 'steady';

export interface TrendPoint {
  startedAt: number;
  tosses: number;
  drops: number;
  /** This session's catch rate for the call, 0..1. */
  rate: number;
}

export interface CallTrend {
  call: number;
  label: string;
  /** Sessions the call came up in, oldest first (at most TREND_SESSIONS, at least 2). */
  points: TrendPoint[];
  direction: TrendDirection;
  /**
   * Toss-weighted catch rate of the earlier and the later half of those
   * sessions ("67%"): the two numbers the direction compares, so the summary
   * can't say "100% → 100%, better". With two sessions, simply each one's rate.
   */
  earlier: string;
  later: string;
  /** "67% → 90%" */
  summary: string;
  /** For screen readers: "5: caught 67%, then 90%, over 4 sessions: getting better". */
  accessibilityLabel: string;
}

const percent = (rate: number) => `${Math.round(rate * 100)}%`;

/** Toss-weighted catch rate of some points (1 when there were no tosses). */
function pooledRate(points: readonly TrendPoint[]): number {
  let tosses = 0;
  let drops = 0;
  for (const p of points) {
    tosses += p.tosses;
    drops += p.drops;
  }
  return tosses > 0 ? (tosses - drops) / tosses : 1;
}

/**
 * Catch rates of the earlier and the later half of the sessions (the middle
 * one is left out when the count is odd), pooling each half's tosses so a
 * session with 2 tosses doesn't weigh as much as one with 30.
 */
export function trendHalves(points: readonly TrendPoint[]): { earlier: number; later: number } {
  const half = Math.floor(points.length / 2);
  if (half === 0) {
    const rate = pooledRate(points);
    return { earlier: rate, later: rate };
  }
  return { earlier: pooledRate(points.slice(0, half)), later: pooledRate(points.slice(-half)) };
}

/** Direction from the earlier half of the sessions to the later half (see trendHalves). */
export function trendDirection(points: readonly TrendPoint[]): TrendDirection {
  if (points.length < 2) return 'steady';
  const { earlier, later } = trendHalves(points);
  const change = later - earlier;
  if (change >= TREND_STEADY_CHANGE) return 'better';
  if (change <= -TREND_STEADY_CHANGE) return 'worse';
  return 'steady';
}

const DIRECTION_WORDS: Record<TrendDirection, string> = {
  better: 'getting better',
  worse: 'getting worse',
  steady: 'steady',
};

/** A call's trend over its latest `sessions` sessions, or null with fewer than 2. */
export function callTrend(
  history: readonly SessionRecord[],
  call: number,
  sessions = TREND_SESSIONS,
): CallTrend | null {
  const key = String(call);
  const points: TrendPoint[] = [];
  for (const r of history) {
    if (points.length >= sessions) break;
    const tosses = r.timesCalled[key] ?? 0;
    if (tosses === 0) continue;
    const drops = Math.min(r.timesDropped[key] ?? 0, tosses);
    points.push({ startedAt: r.startedAt, tosses, drops, rate: (tosses - drops) / tosses });
  }
  if (points.length < 2) return null;
  points.reverse(); // oldest first, like a chart reads
  const direction = trendDirection(points);
  const halves = trendHalves(points);
  const earlier = percent(halves.earlier);
  const later = percent(halves.later);
  const label = callLabel(call);
  return {
    call,
    label,
    points,
    direction,
    earlier,
    later,
    summary: `${earlier} → ${later}`,
    accessibilityLabel: `${label}: caught ${earlier}, then ${later}, over ${points.length} sessions: ${DIRECTION_WORDS[direction]}`,
  };
}

/** Trends for some calls (e.g. the ones dropped most), skipping calls with too few sessions. */
export function callTrends(
  history: readonly SessionRecord[],
  calls: readonly number[],
  sessions = TREND_SESSIONS,
): CallTrend[] {
  return calls.flatMap((call) => callTrend(history, call, sessions) ?? []);
}

/** Sessions listed in a call's detail view before it says how many more there are. */
export const CALL_DETAIL_SESSIONS = 25;

export interface CallDetailRow {
  startedAt: number;
  /** "Today 6:05 PM" */
  date: string;
  /** "Quads 155 · 155 BPM" or "120 BPM · 16 counts" */
  drill: string;
  tosses: number;
  drops: number;
  /** This session's catch rate for the call, 0..1. */
  rate: number;
  /** "4 of 5" */
  caughtOf: string;
  /** "80%" */
  caught: string;
  /** "Today 6:05 PM, Quads 155, 155 BPM: caught 4 of 5, 80%" */
  accessibilityLabel: string;
}

export interface CallDetail {
  call: number;
  label: string;
  /** Every session the call came up in. */
  sessions: number;
  tosses: number;
  drops: number;
  /** "85%" over all those sessions. */
  caught: string;
  /** Newest first, at most `limit`. */
  rows: CallDetailRow[];
  /** Sessions not listed (older than the last row). */
  more: number;
  /** "7: 12 sessions, 48 tosses, 85% caught" */
  summary: string;
}

/**
 * Every session a call came up in (newest first, as History keeps them):
 * the date, the drill and that session's catch rate for the call. Null when
 * the call never came up. Follows the History filters when given the
 * filtered list.
 */
export function callDetail(
  history: readonly SessionRecord[],
  call: number,
  nowMs: number,
  limit = CALL_DETAIL_SESSIONS,
): CallDetail | null {
  const key = String(call);
  const label = callLabel(call);
  const rows: CallDetailRow[] = [];
  let sessions = 0;
  let tosses = 0;
  let drops = 0;
  for (const r of history) {
    const t = r.timesCalled[key] ?? 0;
    if (t === 0) continue;
    const d = Math.min(r.timesDropped[key] ?? 0, t);
    sessions += 1;
    tosses += t;
    drops += d;
    if (rows.length >= limit) continue;
    const date = formatSessionDate(r.startedAt, nowMs);
    const drill = sessionRowDetail({
      preset: r.preset ?? null,
      bpm: r.bpm,
      phraseLength: r.phraseLength,
    });
    const rate = (t - d) / t;
    const caughtOf = `${t - d} of ${t}`;
    rows.push({
      startedAt: r.startedAt,
      date,
      drill,
      tosses: t,
      drops: d,
      rate,
      caughtOf,
      caught: percent(rate),
      accessibilityLabel: `${date}, ${drill.replace(/ · /g, ', ')}: caught ${caughtOf}, ${percent(rate)}`,
    });
  }
  if (sessions === 0) return null;
  const caught = percent((tosses - drops) / tosses);
  return {
    call,
    label,
    sessions,
    tosses,
    drops,
    caught,
    rows,
    more: sessions - rows.length,
    summary: `${label}: ${sessions} ${sessions === 1 ? 'session' : 'sessions'}, ${tosses} ${tosses === 1 ? 'toss' : 'tosses'}, ${caught} caught`,
  };
}
