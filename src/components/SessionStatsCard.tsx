import { StyleSheet, Text, View } from 'react-native';

import { Theme, themed, useTheme } from '../theme';
import { SessionStats, callLabel, summarizeStats } from '../engine';

export interface SessionStatsCardProps {
  stats: SessionStats;
  running: boolean;
}

function Figure({ value, label }: { value: string; label: string }) {
  const styles = getStyles(useTheme());
  return (
    <View style={styles.figure} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.figureValue}>{value}</Text>
      <Text style={styles.figureLabel}>{label}</Text>
    </View>
  );
}

/** Tosses called, time, which calls came up and the latest ones. */
export function SessionStatsCard({ stats, running }: SessionStatsCardProps) {
  const styles = getStyles(useTheme());
  const summary = summarizeStats(stats);
  if (!running && stats.countsPlayed === 0) return null;
  const top = Math.max(1, ...summary.tally.map((t) => t.times));

  return (
    <View style={styles.card}>
      <Text style={styles.heading} accessibilityRole="header">
        {running ? 'This session' : 'Last session'}
      </Text>
      <View style={styles.figures}>
        <Figure value={String(summary.tosses)} label="tosses" />
        <Figure value={summary.duration} label="time" />
        <Figure
          value={summary.mostCalled.length ? summary.mostCalled.map(callLabel).join(', ') : '–'}
          label="called most"
        />
      </View>

      {summary.tally.length > 0 ? (
        <View style={styles.tally}>
          {summary.tally.map((t) => (
            <View
              key={t.call}
              style={styles.tallyRow}
              accessible
              accessibilityLabel={`${t.label}: called ${t.times} ${t.times === 1 ? 'time' : 'times'}`}
            >
              <Text style={styles.tallyLabel}>{t.label}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { width: `${(t.times / top) * 100}%` }]} />
              </View>
              <Text style={styles.tallyTimes}>{t.times}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.note}>
          {running ? 'The first toss is released after the count-in.' : 'No tosses yet.'}
        </Text>
      )}

      {summary.latest.length > 0 ? (
        <Text
          style={styles.latest}
          accessibilityLabel={`Latest calls: ${summary.latest.join(', ')}`}
        >
          Latest: {summary.latest.join(' · ')}
        </Text>
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
    figures: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    figure: { alignItems: 'center', flex: 1 },
    figureValue: { fontSize: 26, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] },
    figureLabel: { fontSize: 13, color: t.textMuted },
    tally: { marginTop: 12, gap: 4 },
    tallyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tallyLabel: { width: 48, fontSize: 14, fontWeight: '600', textAlign: 'right', color: t.text },
    barTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: t.track },
    bar: { height: 10, borderRadius: 5, backgroundColor: t.primary },
    tallyTimes: { width: 32, fontSize: 14, color: t.text, fontVariant: ['tabular-nums'] },
    note: { fontSize: 14, color: t.textMuted, marginTop: 12 },
    latest: { fontSize: 14, color: t.textMuted, marginTop: 12 },
  }),
);
