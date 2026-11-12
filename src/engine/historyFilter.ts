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

/** Longest stored filter key accepted (preset names are far shorter). */
const MAX_FILTER_KEY_LENGTH = 80;

/**
 * A filter key read back from storage, or "All" when it isn't one. The key
 * is kept even when no session matches it today: History loads after the
 * settings, and `resolveHistoryFilter` already shows All until it matches.
 */
export function parseHistoryFilterKey(raw: unknown): HistoryFilterKey {
  if (raw === ALL_SESSIONS || raw === NO_PRESET) return raw;
  if (
    typeof raw === 'string' &&
    raw.length <= MAX_FILTER_KEY_LENGTH &&
    raw.startsWith('preset:') &&
    raw.slice('preset:'.length).trim().length > 0
  ) {
    return raw;
  }
  return ALL_SESSIONS;
}

/*
 * Tempo filter: a second, independent row of chips that narrows History to
 * one tempo (and phrase length), e.g. "only my 120 BPM sessions". It is
 * applied after the preset filter, and offered only when the sessions left
 * span two or more tempos — inside one preset there's usually just one.
 */

export const ALL_TEMPOS = 'all';

/** The tempo filter key a session belongs to: "tempo:155/16". */
export function sessionTempoKey(
  record: Pick<SessionRecord, 'bpm' | 'phraseLength'>,
): HistoryFilterKey {
  return `tempo:${record.bpm}/${record.phraseLength}`;
}

function parseTempoKey(key: string): { bpm: number; phraseLength: number } | null {
  const m = /^tempo:(\d{1,3})\/(\d{1,3})$/.exec(key);
  if (!m) return null;
  const bpm = Number(m[1]);
  const phraseLength = Number(m[2]);
  return bpm > 0 && phraseLength > 0 ? { bpm, phraseLength } : null;
}

/**
 * "155 BPM", or "155 BPM · 8" when the sessions use more than one phrase
 * length (so two chips never read the same).
 */
function tempoLabel(bpm: number, phraseLength: number, showPhrase: boolean): string {
  return showPhrase ? `${bpm} BPM · ${phraseLength}` : `${bpm} BPM`;
}

/**
 * The tempo filters worth offering for some sessions: "All tempos", then
 * each tempo (slowest first; same tempo: shorter phrase first). Empty when
 * the sessions share one tempo and phrase length.
 */
export function tempoFilters(history: readonly SessionRecord[]): HistoryFilter[] {
  const groups = new Map<HistoryFilterKey, { bpm: number; phraseLength: number; n: number }>();
  for (const r of history) {
    const key = sessionTempoKey(r);
    const g = groups.get(key);
    if (g) g.n += 1;
    else groups.set(key, { bpm: r.bpm, phraseLength: r.phraseLength, n: 1 });
  }
  if (groups.size < 2) return [];
  const showPhrase = new Set([...groups.values()].map((g) => g.phraseLength)).size > 1;
  const tempos = [...groups.entries()]
    .sort(([, a], [, b]) => a.bpm - b.bpm || a.phraseLength - b.phraseLength)
    .map(([key, g]) => ({
      key,
      label: tempoLabel(g.bpm, g.phraseLength, showPhrase),
      sessions: g.n,
    }));
  return [{ key: ALL_TEMPOS, label: 'All tempos', sessions: history.length }, ...tempos];
}

/** The selected tempo key if some of these sessions match it, else "All tempos". */
export function resolveTempoFilter(
  history: readonly SessionRecord[],
  key: HistoryFilterKey,
): HistoryFilterKey {
  if (key === ALL_TEMPOS) return key;
  return tempoFilters(history).some((f) => f.key === key) ? key : ALL_TEMPOS;
}

/** The sessions a tempo key keeps (order unchanged); unknown keys keep everything. */
export function filterByTempo(
  history: readonly SessionRecord[],
  key: HistoryFilterKey,
): SessionRecord[] {
  const resolved = resolveTempoFilter(history, key);
  if (resolved === ALL_TEMPOS) return [...history];
  return history.filter((r) => sessionTempoKey(r) === resolved);
}

/**
 * The label of a tempo key ("120 BPM · 16 counts"), or null for "All
 * tempos". Spelled out in full: it names a shared CSV or a screen-reader
 * summary, where there are no other chips to compare with.
 */
export function tempoFilterLabel(key: HistoryFilterKey): string | null {
  const t = parseTempoKey(key);
  return t ? `${t.bpm} BPM · ${t.phraseLength} counts` : null;
}

/** Both filters' labels joined ("Quads 155 · 155 BPM · 16 counts"), or null when neither is set. */
export function combinedFilterLabel(
  presetKey: HistoryFilterKey,
  tempoKey: HistoryFilterKey,
): string | null {
  const parts = [historyFilterLabel(presetKey), tempoFilterLabel(tempoKey)].filter(
    (p): p is string => p !== null,
  );
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** A tempo key read back from storage, or "All tempos" when it isn't one. */
export function parseTempoFilterKey(raw: unknown): HistoryFilterKey {
  return typeof raw === 'string' && parseTempoKey(raw) ? raw : ALL_TEMPOS;
}
