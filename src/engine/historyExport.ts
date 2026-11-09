/**
 * History as CSV, for sharing with a coach (Messages, Mail, Notes, Files…)
 * and opening in a spreadsheet.
 *
 * One row per session, newest first like the History card. Dates are local
 * and sortable (2026-11-08, 18:05). Per-call counts go in one cell each
 * ("3: 4; 3&: 2"), with "&" for an "and" call. Preset names are typed by
 * the performer, so every cell is escaped, including a leading = + - @ that
 * a spreadsheet would otherwise run as a formula.
 */

import { isValidCall } from './calls';
import { SessionRecord } from './history';

export const HISTORY_CSV_HEADER = [
  'Date',
  'Time',
  'Preset',
  'BPM',
  'Counts per phrase',
  'Minutes',
  'Tosses',
  'Dropped',
  'Caught %',
  'Calls',
  'Drops by call',
] as const;

/** One CSV cell: quoted when needed, formulas defused. */
export function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text) && typeof value === 'string') text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-11-08" and "18:05" in local time. */
export function csvDateTime(epochMs: number): { date: string; time: string } {
  const d = new Date(epochMs);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** "3: 4; 3&: 2" — calls smallest first, "&" for an "and" call. */
export function callCountsCell(counts: Readonly<Record<string, number>>): string {
  return Object.entries(counts)
    .map(([key, n]) => [Number(key), n] as const)
    .filter(([call, n]) => isValidCall(call) && n > 0)
    .sort((a, b) => a[0] - b[0])
    .map(([call, n]) => `${Number.isInteger(call) ? call : `${Math.floor(call)}&`}: ${n}`)
    .join('; ');
}

/** Minutes with one decimal ("5.3"); sessions are short, seconds are noise. */
const minutes = (ms: number) => String(Math.round(ms / 6_000) / 10);

export function sessionCsvRow(r: SessionRecord): string {
  const { date, time } = csvDateTime(r.startedAt);
  const caught = Math.round(((r.tosses - r.drops) / r.tosses) * 100);
  return [
    date,
    time,
    r.preset ?? '',
    r.bpm,
    r.phraseLength,
    minutes(r.durationMs),
    r.tosses,
    r.drops,
    caught,
    callCountsCell(r.timesCalled),
    callCountsCell(r.timesDropped),
  ]
    .map(csvCell)
    .join(',');
}

/** The whole history as CSV (header + one row per session, newest first, CRLF lines). */
export function historyCsv(history: readonly SessionRecord[]): string {
  const rows = [...history].sort((a, b) => b.startedAt - a.startedAt).map(sessionCsvRow);
  return [HISTORY_CSV_HEADER.map(csvCell).join(','), ...rows].join('\r\n') + '\r\n';
}

/**
 * Title for the share sheet: "Guardrr history (12 sessions)", or with the
 * History filter's label: "Guardrr history: Quads 155 (4 sessions)".
 */
export function historyShareTitle(
  history: readonly SessionRecord[],
  filterLabel?: string | null,
): string {
  const n = history.length;
  const what = filterLabel ? `Guardrr history: ${filterLabel}` : 'Guardrr history';
  return `${what} (${n} ${n === 1 ? 'session' : 'sessions'})`;
}
