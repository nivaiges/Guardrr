import { Fragment, useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ALL_SESSIONS,
  ALL_TEMPOS,
  HistoryFilter,
  HistoryFilterKey,
  SessionRecord,
  SessionRow,
  TREND_SESSIONS,
  TrendDirection,
  callDetail,
  callTrends,
  combinedFilterLabel,
  deletionMessage,
  filterByTempo,
  filterHistory,
  historyFilters,
  resolveHistoryFilter,
  resolveTempoFilter,
  sessionRowDetail,
  summarizeHistory,
  tempoFilters,
} from '../engine';
import { Theme, themed, useTheme } from '../theme';

/** Rows shown before "Show more", and after it. */
const FEW_ROWS = 5;
const MANY_ROWS = 25;

export interface SessionHistoryCardProps {
  history: readonly SessionRecord[];
  /** "Today"/"Yesterday" are relative to this time (epoch ms). */
  nowMs: number;
  /** Delete one session; returns what was removed (for Undo). */
  onDelete?: (startedAt: number) => SessionRecord[];
  /** Delete every session; returns what was removed (for Undo). */
  onClear?: () => SessionRecord[];
  /** Put deleted sessions back. */
  onRestore?: (records: readonly SessionRecord[]) => void;
  /**
   * Share these sessions (CSV) — the ones the filter shows — with the
   * filter's label (null for All); resolves to a note to show, or null.
   */
  onShare?: (
    sessions: readonly SessionRecord[],
    filterLabel: string | null,
  ) => Promise<string | null>;
  /** The chosen filter, when the parent keeps it (e.g. saved across restarts). */
  filterKey?: HistoryFilterKey;
  /** Called when a filter chip is tapped. */
  onFilterChange?: (key: HistoryFilterKey) => void;
  /** The chosen tempo filter ("tempo:120/16"), when the parent keeps it. */
  tempoKey?: HistoryFilterKey;
  /** Called when a tempo chip is tapped. */
  onTempoChange?: (key: HistoryFilterKey) => void;
}

interface PendingUndo {
  message: string;
  records: SessionRecord[];
}

function rowLabel(row: SessionRow): string {
  const tosses = `${row.tosses} ${row.tosses === 1 ? 'toss' : 'tosses'}`;
  const drops = row.drops ? `, ${row.drops} dropped, ${row.caught} caught` : '';
  const drill = row.preset ? `${row.preset}, ` : '';
  return `${row.date}: ${tosses}${drops}, ${row.duration}, ${drill}${row.bpm} BPM, ${row.phraseLength}-count phrase`;
}

const DIRECTION_TEXT: Record<TrendDirection, string> = {
  better: '↑ better',
  worse: '↓ worse',
  steady: 'steady',
};

function directionStyle(styles: ReturnType<typeof getStyles>, direction: TrendDirection) {
  if (direction === 'better') return styles.trendBetter;
  if (direction === 'worse') return styles.trendWorse;
  return null;
}

/** One row of radio chips (presets, or tempos) with session counts. */
function FilterChips({
  filters,
  active,
  label,
  testIDPrefix,
  styles,
  onSelect,
}: {
  filters: readonly HistoryFilter[];
  active: HistoryFilterKey;
  label: string;
  testIDPrefix: string;
  styles: ReturnType<typeof getStyles>;
  onSelect: (key: HistoryFilterKey) => void;
}) {
  return (
    <View style={styles.filters} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {filters.map((f) => {
        const checked = f.key === active;
        return (
          <Pressable
            key={f.key}
            testID={`${testIDPrefix}-${f.key}`}
            onPress={() => onSelect(f.key)}
            accessibilityRole="radio"
            accessibilityState={{ checked }}
            aria-checked={checked}
            accessibilityLabel={`${f.label}, ${f.sessions} ${f.sessions === 1 ? 'session' : 'sessions'}`}
            style={({ pressed }) => [
              styles.filter,
              checked && styles.filterChecked,
              pressed && !checked && styles.morePressed,
            ]}
          >
            <Text
              style={[styles.filterText, checked && styles.filterTextChecked]}
              numberOfLines={1}
            >
              {f.label} <Text style={styles.filterCount}>{f.sessions}</Text>
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * All-time totals, the calls dropped most and the latest sessions; chips
 * above them narrow everything (and Share) to one preset and/or tempo. "Edit"
 * shows a Delete button per session and "Clear all history" (which asks
 * first); every delete can be undone until the next one or "Done".
 */
export function SessionHistoryCard({
  history,
  nowMs,
  onDelete,
  onClear,
  onRestore,
  onShare,
  filterKey: savedFilterKey,
  onFilterChange,
  tempoKey: savedTempoKey,
  onTempoChange,
}: SessionHistoryCardProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [undo, setUndo] = useState<PendingUndo | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [ownFilterKey, setOwnFilterKey] = useState<HistoryFilterKey>(ALL_SESSIONS);
  const filterKey = savedFilterKey ?? ownFilterKey;
  const setFilterKey = (key: HistoryFilterKey) => {
    setOwnFilterKey(key);
    onFilterChange?.(key);
  };
  const [ownTempoKey, setOwnTempoKey] = useState<HistoryFilterKey>(ALL_TEMPOS);
  const tempoKey = savedTempoKey ?? ownTempoKey;
  const setTempoKey = (key: HistoryFilterKey) => {
    setOwnTempoKey(key);
    onTempoChange?.(key);
  };
  const filters = useMemo(() => historyFilters(history), [history]);
  // A preset whose sessions were all deleted falls back to All.
  const activeFilter = resolveHistoryFilter(history, filterKey);
  const byPreset = useMemo(() => filterHistory(history, activeFilter), [history, activeFilter]);
  // Tempo chips narrow the preset's sessions further; hidden when one tempo is left.
  const tempos = useMemo(() => tempoFilters(byPreset), [byPreset]);
  const activeTempo = resolveTempoFilter(byPreset, tempoKey);
  const shown = useMemo(() => filterByTempo(byPreset, activeTempo), [byPreset, activeTempo]);
  const summary = useMemo(
    () => summarizeHistory(shown, nowMs, expanded ? MANY_ROWS : FEW_ROWS),
    [shown, nowMs, expanded],
  );
  // How the calls dropped most are doing lately (follows the filter).
  const trends = useMemo(
    () =>
      callTrends(
        shown,
        summary.hardest.map((c) => c.call),
      ),
    [shown, summary.hardest],
  );
  // The call whose sessions are listed (tap a trend row); follows the filters.
  const [detailCall, setDetailCall] = useState<number | null>(null);
  const detail = useMemo(
    () => (detailCall === null ? null : callDetail(shown, detailCall, nowMs)),
    [shown, detailCall, nowMs],
  );
  const editable = Boolean(onDelete || onClear);
  if (history.length === 0 && !editing && !undo) return null;
  const more = Math.min(shown.length, MANY_ROWS) - summary.rows.length;
  const filterLabel = combinedFilterLabel(activeFilter, activeTempo);

  const removed = (records: SessionRecord[]) => {
    setConfirmingClear(false);
    if (records.length === 0) return;
    const message = deletionMessage(records, nowMs);
    setUndo({ message, records });
    AccessibilityInfo.announceForAccessibility(`${message}. Undo is available.`);
  };
  const share = async () => {
    if (!onShare || sharing) return;
    setSharing(true);
    setShareNote(null);
    try {
      const note = await onShare(shown, filterLabel);
      setShareNote(note);
      if (note) AccessibilityInfo.announceForAccessibility(note);
    } finally {
      setSharing(false);
    }
  };
  const finishEditing = () => {
    setEditing(false);
    setConfirmingClear(false);
    setUndo(null);
  };
  const undoDelete = () => {
    if (!undo) return;
    onRestore?.(undo.records);
    setUndo(null);
    AccessibilityInfo.announceForAccessibility('Restored');
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.heading} accessibilityRole="header">
          History
        </Text>
        <View style={styles.headerButtons}>
          {onShare && !editing && history.length > 0 ? (
            <Pressable
              testID="history-share"
              onPress={share}
              disabled={sharing}
              accessibilityRole="button"
              accessibilityLabel={filterLabel ? `Share ${filterLabel} history` : 'Share history'}
              accessibilityHint={
                filterLabel
                  ? `Shares the ${filterLabel} sessions as a spreadsheet (CSV)`
                  : 'Shares every saved session as a spreadsheet (CSV)'
              }
              hitSlop={8}
              style={({ pressed }) => [styles.headerButton, pressed && styles.morePressed]}
            >
              <Text style={styles.headerButtonText}>Share</Text>
            </Pressable>
          ) : null}
          {editable ? (
            <Pressable
              testID="history-edit"
              onPress={editing ? finishEditing : () => setEditing(true)}
              accessibilityRole="button"
              accessibilityLabel={editing ? 'Done editing history' : 'Edit history'}
              hitSlop={8}
              style={({ pressed }) => [styles.headerButton, pressed && styles.morePressed]}
            >
              <Text style={styles.headerButtonText}>{editing ? 'Done' : 'Edit'}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {shareNote && !editing ? (
        <Text style={styles.shareNote} testID="history-share-note">
          {shareNote}
        </Text>
      ) : null}

      {undo ? (
        <View style={styles.undoBar}>
          <Text style={styles.undoText} numberOfLines={2}>
            {undo.message}
          </Text>
          <Pressable
            testID="history-undo"
            onPress={undoDelete}
            accessibilityRole="button"
            accessibilityLabel={`Undo: ${undo.message}`}
            style={({ pressed }) => [styles.smallButton, pressed && styles.morePressed]}
          >
            <Text style={styles.smallButtonText}>Undo</Text>
          </Pressable>
        </View>
      ) : null}

      {history.length === 0 ? (
        <Text style={styles.empty}>No sessions saved.</Text>
      ) : (
        <>
          {filters.length > 0 ? (
            <FilterChips
              filters={filters}
              active={activeFilter}
              label="Show sessions from"
              testIDPrefix="history-filter"
              styles={styles}
              onSelect={(key) => {
                setFilterKey(key);
                setShareNote(null);
              }}
            />
          ) : null}
          {tempos.length > 0 ? (
            <FilterChips
              filters={tempos}
              active={activeTempo}
              label="Show sessions at"
              testIDPrefix="history-tempo"
              styles={styles}
              onSelect={(key) => {
                setTempoKey(key);
                setShareNote(null);
              }}
            />
          ) : null}
          <Text
            style={styles.totals}
            accessibilityLabel={`${summary.sessions} ${summary.sessions === 1 ? 'session' : 'sessions'}, ${summary.tosses} ${summary.tosses === 1 ? 'toss' : 'tosses'}${summary.drops ? `, ${summary.caught} caught` : ''}, ${summary.totalDuration} in total`}
          >
            {summary.sessions} {summary.sessions === 1 ? 'session' : 'sessions'} · {summary.tosses}{' '}
            {summary.tosses === 1 ? 'toss' : 'tosses'}
            {summary.drops ? ` · ${summary.caught} caught` : ''} · {summary.totalDuration}
          </Text>
          {summary.hardest.length > 0 ? (
            <Text style={styles.hardest}>
              Dropped most:{' '}
              {summary.hardest.map((c, i) => (
                <Text key={c.call}>
                  {i > 0 ? ', ' : ''}
                  <Text style={styles.hardestCall}>{c.label}</Text> ({c.caught} caught)
                </Text>
              ))}
            </Text>
          ) : null}
          {trends.length > 0 ? (
            <View style={styles.trends} testID="history-trends">
              <Text style={styles.trendsTitle}>
                Catch rate, last {TREND_SESSIONS} sessions · tap a call for details
              </Text>
              {trends.map((trend) => {
                const open = detail?.call === trend.call;
                return (
                  <Fragment key={trend.call}>
                    <Pressable
                      testID={`history-trend-${trend.call}`}
                      onPress={() => setDetailCall(open ? null : trend.call)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: open }}
                      aria-expanded={open}
                      accessibilityLabel={trend.accessibilityLabel}
                      accessibilityHint={
                        open ? 'Hides the sessions' : `Lists every session with a ${trend.label}`
                      }
                      style={({ pressed }) => [
                        styles.trendRow,
                        open && styles.trendRowOpen,
                        pressed && styles.morePressed,
                      ]}
                    >
                      <Text style={styles.trendCall}>{trend.label}</Text>
                      <View style={styles.trendBars}>
                        {trend.points.map((p) => (
                          <View key={p.startedAt} style={styles.trendSlot}>
                            <View
                              style={[
                                styles.trendBar,
                                { height: `${Math.max(8, Math.round(p.rate * 100))}%` },
                              ]}
                            />
                          </View>
                        ))}
                      </View>
                      <Text style={styles.trendSummary}>{trend.summary}</Text>
                      <Text
                        style={[styles.trendDirection, directionStyle(styles, trend.direction)]}
                      >
                        {DIRECTION_TEXT[trend.direction]}
                      </Text>
                    </Pressable>
                    {open && detail ? (
                      <View style={styles.detailPanel} testID="history-call-detail">
                        <View style={styles.detailHeader}>
                          <Text style={styles.detailTitle} accessibilityRole="header">
                            {detail.label} — every session
                          </Text>
                          <Pressable
                            testID="history-call-detail-close"
                            onPress={() => setDetailCall(null)}
                            accessibilityRole="button"
                            accessibilityLabel={`Close ${detail.label} sessions`}
                            hitSlop={8}
                            style={({ pressed }) => [
                              styles.headerButton,
                              pressed && styles.morePressed,
                            ]}
                          >
                            <Text style={styles.headerButtonText}>Close</Text>
                          </Pressable>
                        </View>
                        <Text style={styles.detailSummary}>
                          {detail.sessions} {detail.sessions === 1 ? 'session' : 'sessions'} ·{' '}
                          {detail.tosses} {detail.tosses === 1 ? 'toss' : 'tosses'} ·{' '}
                          {detail.caught} caught
                        </Text>
                        {detail.rows.map((row) => (
                          <View
                            key={row.startedAt}
                            style={styles.detailRow}
                            accessible
                            accessibilityLabel={row.accessibilityLabel}
                          >
                            <View style={styles.dateColumn}>
                              <Text style={styles.date} numberOfLines={1}>
                                {row.date}
                              </Text>
                              <Text style={styles.detail} numberOfLines={1}>
                                {row.drill}
                              </Text>
                            </View>
                            <Text style={styles.detailCaughtOf}>{row.caughtOf}</Text>
                            <Text style={[styles.cell, row.drops > 0 && styles.dropped]}>
                              {row.caught}
                            </Text>
                          </View>
                        ))}
                        {detail.more > 0 ? (
                          <Text style={styles.detailMore}>
                            and {detail.more} older {detail.more === 1 ? 'session' : 'sessions'}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </Fragment>
                );
              })}
            </View>
          ) : null}

          <View style={styles.legend} importantForAccessibility="no-hide-descendants">
            <Text style={[styles.date, styles.legendText]} />
            <Text style={[styles.cell, styles.legendText]}>tosses</Text>
            <Text style={[styles.cell, styles.legendText]}>caught</Text>
            {/* While editing, the Delete buttons take the time column's place. */}
            {editing ? (
              <View style={styles.deleteSpace} />
            ) : (
              <Text style={[styles.cell, styles.legendText]}>time</Text>
            )}
          </View>
          <View style={styles.rows}>
            {summary.rows.map((row) => (
              <View key={row.startedAt} style={styles.row}>
                <View style={styles.rowInfo} accessible accessibilityLabel={rowLabel(row)}>
                  <View style={styles.dateColumn}>
                    <Text style={styles.date} numberOfLines={1}>
                      {row.date}
                    </Text>
                    <Text style={styles.detail} numberOfLines={1}>
                      {sessionRowDetail(row)}
                    </Text>
                  </View>
                  <Text style={styles.cell}>{row.tosses}</Text>
                  <Text style={[styles.cell, row.drops > 0 && styles.dropped]}>
                    {row.drops ? row.caught : '–'}
                  </Text>
                  {editing ? null : <Text style={styles.cell}>{row.duration}</Text>}
                </View>
                {editing && onDelete ? (
                  <Pressable
                    testID={`history-delete-${row.startedAt}`}
                    onPress={() => removed(onDelete(row.startedAt))}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete session ${row.date}`}
                    hitSlop={6}
                    style={({ pressed }) => [styles.deleteButton, pressed && styles.morePressed]}
                  >
                    <Text style={styles.deleteText}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>

          {more > 0 || expanded ? (
            <Pressable
              onPress={() => setExpanded((e) => !e)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.more, pressed && styles.morePressed]}
            >
              <Text style={styles.moreText}>{expanded ? 'Show fewer' : `Show ${more} more`}</Text>
            </Pressable>
          ) : null}

          {editing && onClear ? (
            confirmingClear ? (
              <View style={styles.confirm}>
                <Text style={styles.confirmText}>
                  Delete all {history.length} {history.length === 1 ? 'session' : 'sessions'}?
                </Text>
                <View style={styles.confirmButtons}>
                  <Pressable
                    testID="history-clear-cancel"
                    onPress={() => setConfirmingClear(false)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.smallButton, pressed && styles.morePressed]}
                  >
                    <Text style={styles.smallButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    testID="history-clear-confirm"
                    onPress={() => removed(onClear())}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete all ${history.length} sessions`}
                    style={({ pressed }) => [styles.dangerButton, pressed && styles.dangerPressed]}
                  >
                    <Text style={styles.dangerButtonText}>Delete all</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                testID="history-clear"
                onPress={() => setConfirmingClear(true)}
                accessibilityRole="button"
                accessibilityHint="Asks before deleting every saved session"
                style={({ pressed }) => [styles.more, pressed && styles.morePressed]}
              >
                <Text style={[styles.moreText, styles.clearText]}>Clear all history</Text>
              </Pressable>
            )
          ) : null}
        </>
      )}
    </View>
  );
}

const getStyles = themed((t: Theme) =>
  StyleSheet.create({
    card: {
      width: '100%',
      maxWidth: 480,
      marginTop: 24,
      padding: 16,
      borderRadius: 16,
      backgroundColor: t.surface,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerButtons: { flexDirection: 'row', gap: 4 },
    headerButton: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
    shareNote: { fontSize: 14, color: t.textMuted, marginTop: 6 },
    headerButtonText: { fontSize: 15, fontWeight: '600', color: t.text },
    heading: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.textMuted,
    },
    totals: { fontSize: 16, fontWeight: '600', color: t.text, marginTop: 8 },
    filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    filter: {
      minHeight: 36,
      maxWidth: '100%',
      paddingHorizontal: 12,
      borderRadius: 18,
      backgroundColor: t.control,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterChecked: { backgroundColor: t.primary },
    filterText: { fontSize: 14, fontWeight: '600', color: t.text },
    filterTextChecked: { color: t.onPrimary },
    filterCount: { fontWeight: '400', fontVariant: ['tabular-nums'] },
    hardest: { fontSize: 14, color: t.textMuted, marginTop: 4 },
    hardestCall: { fontWeight: '700', color: t.dangerText },
    trends: { marginTop: 10, gap: 6 },
    trendsTitle: { fontSize: 12, color: t.textMuted },
    trendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 40,
      marginHorizontal: -6,
      paddingHorizontal: 6,
      borderRadius: 8,
    },
    trendRowOpen: { backgroundColor: t.control },
    detailPanel: {
      marginTop: 2,
      padding: 12,
      gap: 8,
      borderRadius: 12,
      backgroundColor: t.control,
    },
    detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    detailTitle: { fontSize: 15, fontWeight: '700', color: t.text },
    detailSummary: { fontSize: 14, color: t.textMuted },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    detailCaughtOf: {
      width: 64,
      fontSize: 14,
      textAlign: 'right',
      color: t.textMuted,
      fontVariant: ['tabular-nums'],
    },
    detailMore: { fontSize: 13, color: t.textMuted },
    trendCall: { width: 44, fontSize: 14, fontWeight: '700', color: t.dangerText },
    trendBars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 24 },
    trendSlot: {
      flex: 1,
      maxWidth: 14,
      height: '100%',
      justifyContent: 'flex-end',
      borderRadius: 2,
      backgroundColor: t.track,
    },
    trendBar: { width: '100%', borderRadius: 2, backgroundColor: t.primary },
    trendSummary: {
      width: 104,
      textAlign: 'right',
      fontSize: 13,
      color: t.text,
      fontVariant: ['tabular-nums'],
    },
    trendDirection: { width: 64, fontSize: 13, fontWeight: '600', color: t.textMuted },
    trendBetter: { color: t.text, fontWeight: '700' },
    trendWorse: { color: t.dangerText },
    rows: { marginTop: 4, gap: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rowInfo: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    deleteSpace: { width: 36 },
    deleteButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.control,
    },
    deleteText: { fontSize: 15, fontWeight: '700', color: t.dangerText },
    empty: { fontSize: 15, color: t.textMuted, marginTop: 8 },
    undoBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
      padding: 8,
      paddingLeft: 12,
      borderRadius: 12,
      backgroundColor: t.control,
    },
    undoText: { flex: 1, fontSize: 14, color: t.text },
    smallButton: {
      minHeight: 40,
      paddingHorizontal: 14,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    smallButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: t.text,
      textDecorationLine: 'underline',
    },
    confirm: { marginTop: 12, gap: 8, alignItems: 'center' },
    confirmText: { fontSize: 15, fontWeight: '600', color: t.text },
    confirmButtons: { flexDirection: 'row', gap: 12 },
    dangerButton: {
      minHeight: 40,
      paddingHorizontal: 18,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.danger,
    },
    dangerPressed: { opacity: 0.8 },
    dangerButtonText: { fontSize: 15, fontWeight: '700', color: t.onPrimary },
    clearText: { color: t.dangerText },
    date: { flex: 1, fontSize: 14, color: t.text },
    dateColumn: { flex: 1 },
    detail: { fontSize: 12, color: t.textMuted, marginTop: 1 },
    cell: {
      width: 52,
      fontSize: 14,
      textAlign: 'right',
      color: t.text,
      fontVariant: ['tabular-nums'],
    },
    dropped: { color: t.dangerText, fontWeight: '600' },
    legend: { flexDirection: 'row', gap: 8, marginTop: 12 },
    legendText: { fontSize: 12, color: t.textMuted },
    more: {
      marginTop: 10,
      alignSelf: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 16,
    },
    morePressed: { backgroundColor: t.controlPressed },
    moreText: { fontSize: 15, fontWeight: '600', color: t.text, textDecorationLine: 'underline' },
  }),
);
