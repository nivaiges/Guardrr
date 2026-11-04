import { useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';

import { SessionRecord, SessionRow, deletionMessage, summarizeHistory } from '../engine';
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
}

interface PendingUndo {
  message: string;
  records: SessionRecord[];
}

function rowLabel(row: SessionRow): string {
  const tosses = `${row.tosses} ${row.tosses === 1 ? 'toss' : 'tosses'}`;
  const drops = row.drops ? `, ${row.drops} dropped, ${row.caught} caught` : '';
  return `${row.date}: ${tosses}${drops}, ${row.duration}, ${row.bpm} BPM, ${row.phraseLength}-count phrase`;
}

/**
 * All-time totals, the calls dropped most and the latest sessions. "Edit"
 * shows a Delete button per session and "Clear all history" (which asks
 * first); every delete can be undone until the next one or "Done".
 */
export function SessionHistoryCard({
  history,
  nowMs,
  onDelete,
  onClear,
  onRestore,
}: SessionHistoryCardProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [undo, setUndo] = useState<PendingUndo | null>(null);
  const summary = useMemo(
    () => summarizeHistory(history, nowMs, expanded ? MANY_ROWS : FEW_ROWS),
    [history, nowMs, expanded],
  );
  const editable = Boolean(onDelete || onClear);
  if (history.length === 0 && !editing && !undo) return null;
  const more = Math.min(history.length, MANY_ROWS) - summary.rows.length;

  const removed = (records: SessionRecord[]) => {
    setConfirmingClear(false);
    if (records.length === 0) return;
    const message = deletionMessage(records, nowMs);
    setUndo({ message, records });
    AccessibilityInfo.announceForAccessibility(`${message}. Undo is available.`);
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
                  <Text style={styles.date} numberOfLines={1}>
                    {row.date}
                  </Text>
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
    headerButton: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
    headerButtonText: { fontSize: 15, fontWeight: '600', color: t.text },
    heading: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.textMuted,
    },
    totals: { fontSize: 16, fontWeight: '600', color: t.text, marginTop: 8 },
    hardest: { fontSize: 14, color: t.textMuted, marginTop: 4 },
    hardestCall: { fontWeight: '700', color: t.dangerText },
    rows: { marginTop: 4, gap: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rowInfo: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
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
