import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CallDetail } from '../engine';
import { Theme, themed, useTheme } from '../theme';

export interface CallDetailPanelProps {
  detail: CallDetail;
  onClose: () => void;
  /** testID of the panel; the Close button gets `${testID}-close`. */
  testID: string;
}

/**
 * Every session a call came up in — date, drill, "4 of 5", 80% — with a
 * Close button. Shown under a History trend row or "Dropped most", and under
 * a call's row in the session stats.
 */
export function CallDetailPanel({ detail, onClose, testID }: CallDetailPanelProps) {
  const styles = getStyles(useTheme());
  return (
    <View style={styles.panel} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {detail.label} — every session
        </Text>
        <Pressable
          testID={`${testID}-close`}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={`Close ${detail.label} sessions`}
          hitSlop={8}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>
      <Text style={styles.summary}>
        {detail.sessions} {detail.sessions === 1 ? 'session' : 'sessions'} · {detail.tosses}{' '}
        {detail.tosses === 1 ? 'toss' : 'tosses'} · {detail.caught} caught
      </Text>
      {detail.rows.map((row) => (
        <View
          key={row.startedAt}
          style={styles.row}
          accessible
          accessibilityLabel={row.accessibilityLabel}
        >
          <View style={styles.dateColumn}>
            <Text style={styles.date} numberOfLines={1}>
              {row.date}
            </Text>
            <Text style={styles.drill} numberOfLines={1}>
              {row.drill}
            </Text>
          </View>
          <Text style={styles.caughtOf}>{row.caughtOf}</Text>
          <Text style={[styles.cell, row.drops > 0 && styles.dropped]}>{row.caught}</Text>
        </View>
      ))}
      {detail.more > 0 ? (
        <Text style={styles.more}>
          and {detail.more} older {detail.more === 1 ? 'session' : 'sessions'}
        </Text>
      ) : null}
    </View>
  );
}

const getStyles = themed((t: Theme) =>
  StyleSheet.create({
    panel: {
      marginTop: 2,
      padding: 12,
      gap: 8,
      borderRadius: 12,
      backgroundColor: t.control,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 15, fontWeight: '700', color: t.text },
    close: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
    closeText: { fontSize: 15, fontWeight: '600', color: t.text },
    pressed: { backgroundColor: t.controlPressed },
    summary: { fontSize: 14, color: t.textMuted },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    dateColumn: { flex: 1 },
    date: { flex: 1, fontSize: 14, color: t.text },
    drill: { fontSize: 12, color: t.textMuted, marginTop: 1 },
    caughtOf: {
      width: 64,
      fontSize: 14,
      textAlign: 'right',
      color: t.textMuted,
      fontVariant: ['tabular-nums'],
    },
    cell: {
      width: 52,
      fontSize: 14,
      textAlign: 'right',
      color: t.text,
      fontVariant: ['tabular-nums'],
    },
    dropped: { color: t.dangerText, fontWeight: '600' },
    more: { fontSize: 13, color: t.textMuted },
  }),
);
