/**
 * History as CSV, for sharing with a coach (Messages, Mail, Notes, Files…)
 * and opening in a spreadsheet.
 *
 * One row per session, newest first like the History card. Dates are local
 * and sortable (2026-11-08, 18:05). Per-call counts go in one cell each
 * ("3: 4; 3&: 2"), with "&" for an "and" call. Preset names are typed by
 * the performer, so every cell is escaped, including a leading = + - @ that
 * a spreadsheet would otherwise run as a formula.
 *
 * With Settings → Calls → "Say calls as: Rotations", two more columns repeat
 * the calls and drops by today's rotation names ("Double: 2; 4: 1"), the
 * same labels History shows. The count columns stay first and unchanged, so
 * a coach's sheet built on them keeps working.
 */

import { isValidCall } from './calls';
import { SessionRecord } from './history';
import { CallNameOptions, rotationNameForCall } from './practice';

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

/** The extra columns when calls are named by rotation. */
export const HISTORY_CSV_NAME_HEADER = ['Calls by name', 'Drops by name'] as const;

/** True when the export should carry the name columns. */
export function csvUsesNames(names: CallNameOptions = {}): boolean {
  return names.callNaming === 'rotations' && names.rotationMap !== undefined;
}

/** The header row's cells for these naming options. */
export function historyCsvHeader(names: CallNameOptions = {}): string[] {
  return csvUsesNames(names)
    ? [...HISTORY_CSV_HEADER, ...HISTORY_CSV_NAME_HEADER]
    : [...HISTORY_CSV_HEADER];
}

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

/** "3", or "3&" for an "and" call. */
const countLabel = (call: number) =>
  Number.isInteger(call) ? String(call) : `${Math.floor(call)}&`;

/**
 * "3: 4; 3&: 2" — calls smallest first, "&" for an "and" call. With `label`,
 * each call is written by that label instead ("Triple: 4; Quad: 2").
 */
export function callCountsCell(
  counts: Readonly<Record<string, number>>,
  label: (call: number) => string = countLabel,
): string {
  return Object.entries(counts)
    .map(([key, n]) => [Number(key), n] as const)
    .filter(([call, n]) => isValidCall(call) && n > 0)
    .sort((a, b) => a[0] - b[0])
    .map(([call, n]) => `${label(call)}: ${n}`)
    .join('; ');
}

/** "Double" for a named call, the count ("4", "4&") for one without a name. */
export function csvNameLabel(call: number, names: CallNameOptions): string {
  return rotationNameForCall(call, names) ?? countLabel(call);
}

/** Minutes with one decimal ("5.3"); sessions are short, seconds are noise. */
const minutes = (ms: number) => String(Math.round(ms / 6_000) / 10);

export function sessionCsvRow(r: SessionRecord, names: CallNameOptions = {}): string {
  const { date, time } = csvDateTime(r.startedAt);
  const caught = Math.round(((r.tosses - r.drops) / r.tosses) * 100);
  const byName = (call: number) => csvNameLabel(call, names);
  const nameCells = csvUsesNames(names)
    ? [callCountsCell(r.timesCalled, byName), callCountsCell(r.timesDropped, byName)]
    : [];
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
    ...nameCells,
  ]
    .map(csvCell)
    .join(',');
}

/**
 * The whole history as CSV (header + one row per session, newest first, CRLF
 * lines), with the name columns when calls are named by rotation.
 */
export function historyCsv(history: readonly SessionRecord[], names: CallNameOptions = {}): string {
  const rows = [...history]
    .sort((a, b) => b.startedAt - a.startedAt)
    .map((r) => sessionCsvRow(r, names));
  return [historyCsvHeader(names).map(csvCell).join(','), ...rows].join('\r\n') + '\r\n';
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
