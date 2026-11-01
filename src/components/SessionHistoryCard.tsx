import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SessionRecord, SessionRow, summarizeHistory } from '../engine';
import { Theme, themed, useTheme } from '../theme';

/** Rows shown before "Show more", and after it. */
const FEW_ROWS = 5;
const MANY_ROWS = 25;

export interface SessionHistoryCardProps {
  history: readonly SessionRecord[];
  /** "Today"/"Yesterday" are relative to this time (epoch ms). */
  nowMs: number;
}

function rowLabel(row: SessionRow): string {
  const tosses = `${row.tosses} ${row.tosses === 1 ? 'toss' : 'tosses'}`;
  const drops = row.drops ? `, ${row.drops} dropped, ${row.caught} caught` : '';
  return `${row.date}: ${tosses}${drops}, ${row.duration}, ${row.bpm} BPM, ${row.phraseLength}-count phrase`;
}

/** All-time totals, the calls dropped most and the latest sessions. */
export function SessionHistoryCard({ history, nowMs }: SessionHistoryCardProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [expanded, setExpanded] = useState(false);
  const summary = useMemo(
    () => summarizeHistory(history, nowMs, expanded ? MANY_ROWS : FEW_ROWS),
    [history, nowMs, expanded],
  );
  if (history.length === 0) return null;
  const more = Math.min(history.length, MANY_ROWS) - summary.rows.length;

  return (
    <View style={styles.card}>
      <Text style={styles.heading} accessibilityRole="header">
        History
      </Text>
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
        <Text style={[styles.cell, styles.legendText]}>time</Text>
      </View>
      <View style={styles.rows}>
        {summary.rows.map((row) => (
          <View
            key={row.startedAt}
            style={styles.row}
            accessible
            accessibilityLabel={rowLabel(row)}
          >
            <Text style={styles.date} numberOfLines={1}>
              {row.date}
            </Text>
            <Text style={styles.cell}>{row.tosses}</Text>
            <Text style={[styles.cell, row.drops > 0 && styles.dropped]}>
              {row.drops ? row.caught : '–'}
            </Text>
            <Text style={styles.cell}>{row.duration}</Text>
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
    rows: { marginTop: 4, gap: 6 },
    row: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
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
