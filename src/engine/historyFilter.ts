/**
 * Filtering History by preset, so a performer can see the catch rate on one
 * drill ("Quads 155 only") instead of everything mixed together.
 *
 * Sessions are grouped by the preset name they were saved with (names at
 * save time, see `SessionRecord.preset`). Sessions without one — hand-tuned
 * settings, or saved before presets were recorded — share a "No preset"
 * group. Filters are plain string keys so the selection can live in UI state
 * and survive history changes: a key whose sessions are all gone resolves
 * back to "All".
 */

import { SessionRecord } from './history';

export const ALL_SESSIONS = 'all';
export const NO_PRESET = 'none';

export type HistoryFilterKey = string;

export interface HistoryFilter {
  key: HistoryFilterKey;
  /** "All", "Quads 155", "No preset" */
  label: string;
  /** Sessions this filter keeps. */
  sessions: number;
}

/** The filter key a session belongs to (besides "All"). */
export function sessionFilterKey(record: Pick<SessionRecord, 'preset'>): HistoryFilterKey {
  return record.preset ? `preset:${record.preset}` : NO_PRESET;
}

/**
 * The filters worth offering: "All", then each preset in the history (most
 * recently practiced first), then "No preset" when some sessions have none.
 * Empty when there is only one group — a filter would change nothing.
 */
export function historyFilters(history: readonly SessionRecord[]): HistoryFilter[] {
  const counts = new Map<HistoryFilterKey, number>();
  const newestFirst = [...history].sort((a, b) => b.startedAt - a.startedAt);
  for (const r of newestFirst) {
    const key = sessionFilterKey(r);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size < 2) return [];
  const presets: HistoryFilter[] = [];
  for (const [key, sessions] of counts) {
    if (key !== NO_PRESET) presets.push({ key, label: key.slice('preset:'.length), sessions });
  }
  const none = counts.get(NO_PRESET);
  return [
    { key: ALL_SESSIONS, label: 'All', sessions: history.length },
    ...presets,
    ...(none ? [{ key: NO_PRESET, label: 'No preset', sessions: none }] : []),
  ];
}

/** The selected key if it still matches something on offer, else "All". */
export function resolveHistoryFilter(
  history: readonly SessionRecord[],
  key: HistoryFilterKey,
): HistoryFilterKey {
  if (key === ALL_SESSIONS) return key;
  return historyFilters(history).some((f) => f.key === key) ? key : ALL_SESSIONS;
}

/** The sessions a filter keeps (order unchanged). Unknown keys keep everything. */
export function filterHistory(
  history: readonly SessionRecord[],
  key: HistoryFilterKey,
): SessionRecord[] {
  const resolved = resolveHistoryFilter(history, key);
  if (resolved === ALL_SESSIONS) return [...history];
  return history.filter((r) => sessionFilterKey(r) === resolved);
}

/** The label of a filter key ("Quads 155", "No preset"), or null for "All". */
export function historyFilterLabel(key: HistoryFilterKey): string | null {
  if (key === ALL_SESSIONS) return null;
  if (key === NO_PRESET) return 'No preset';
  return key.startsWith('preset:') ? key.slice('preset:'.length) : null;
}
