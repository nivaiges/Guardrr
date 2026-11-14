import { Fragment, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Theme, themed, useTheme } from '../theme';
import {
  SessionRecord,
  SessionStats,
  callDetail,
  mostCalledLabel,
  mostCalledSpoken,
  summarizeStats,
} from '../engine';
import { CallDetailPanel } from './CallDetailPanel';

export interface SessionStatsCardProps {
  stats: SessionStats;
  running: boolean;
  /**
   * Saved sessions: when given, a call's row opens every session it came up
   * in (all of History, not its filters).
   */
  history?: readonly SessionRecord[];
  /** "Today"/"Yesterday" in the call detail are relative to this time (epoch ms); needed with `history`. */
  nowMs?: number;
}

function Figure({ value, label, spoken }: { value: string; label: string; spoken?: string }) {
  const styles = getStyles(useTheme());
  return (
    <View style={styles.figure} accessible accessibilityLabel={`${label}: ${spoken ?? value}`}>
      <Text style={styles.figureValue}>{value}</Text>
      <Text style={styles.figureLabel}>{label}</Text>
    </View>
  );
}

/** Tosses called, time, which calls came up and the latest ones. */
export function SessionStatsCard({ stats, running, history, nowMs }: SessionStatsCardProps) {
  const styles = getStyles(useTheme());
  const summary = summarizeStats(stats);
  const [detailCall, setDetailCall] = useState<number | null>(null);
  const detail = useMemo(
    () =>
      history && nowMs !== undefined && detailCall !== null
        ? callDetail(history, detailCall, nowMs)
        : null,
    [history, detailCall, nowMs],
  );
  // Calls with saved sessions (the running session is saved at Stop).
  const openable = useMemo(() => {
    const calls = new Set<string>();
    if (nowMs === undefined) return calls;
    for (const r of history ?? []) {
      for (const [call, times] of Object.entries(r.timesCalled)) if (times > 0) calls.add(call);
    }
    return calls;
  }, [history, nowMs]);
  if (!running && stats.countsPlayed === 0) return null;
  const anyOpenable = summary.tally.some((t) => openable.has(String(t.call)));
  const top = Math.max(1, ...summary.tally.map((t) => t.times));

  return (
    <View style={styles.card}>
      <Text style={styles.heading} accessibilityRole="header">
        {running ? 'This session' : 'Last session'}
      </Text>
      <View style={styles.figures}>
        <Figure value={String(summary.tosses)} label="tosses" />
        <Figure value={summary.duration} label="time" />
        {summary.drops > 0 ? <Figure value={summary.catchRateLabel} label="caught" /> : null}
        <Figure
          value={mostCalledLabel(summary.mostCalled)}
          spoken={mostCalledSpoken(summary.mostCalled)}
          label="called most"
        />
      </View>

      {summary.tally.length > 0 ? (
        <View style={styles.tally}>
          {summary.tally.map((t) => {
            const spoken = `${t.label}: called ${t.times} ${t.times === 1 ? 'time' : 'times'}${t.drops ? `, dropped ${t.drops}` : ''}`;
            const row = (
              <>
                <Text style={[styles.tallyLabel, openable.has(String(t.call)) && styles.link]}>
                  {t.label}
                </Text>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { width: `${(t.times / top) * 100}%` }]} />
                </View>
                <Text style={styles.tallyTimes}>
                  {t.times}
                  {t.drops ? <Text style={styles.tallyDrops}> ✗{t.drops}</Text> : null}
                </Text>
              </>
            );
            if (!openable.has(String(t.call))) {
              return (
                <View key={t.call} style={styles.tallyRow} accessible accessibilityLabel={spoken}>
                  {row}
                </View>
              );
            }
            const open = detail?.call === t.call;
            return (
              <Fragment key={t.call}>
                <Pressable
                  testID={`stats-call-${t.call}`}
                  onPress={() => setDetailCall(open ? null : t.call)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  aria-expanded={open}
                  accessibilityLabel={spoken}
                  accessibilityHint={
                    open ? 'Hides the sessions' : `Lists every session with a ${t.label}`
                  }
                  style={({ pressed }) => [
                    styles.tallyRow,
                    styles.tallyButton,
                    open && styles.tallyOpen,
                    pressed && styles.tallyPressed,
                  ]}
                >
                  {row}
                </Pressable>
                {open && detail ? (
                  <CallDetailPanel
                    detail={detail}
                    onClose={() => setDetailCall(null)}
                    testID="stats-call-detail"
                  />
                ) : null}
              </Fragment>
            );
          })}
          {anyOpenable && detail === null ? (
            <Text style={styles.hint}>Tap a call for every session it came up in.</Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.note}>
          {running ? 'The first toss is released after the count-in.' : 'No tosses yet.'}
        </Text>
      )}

      {summary.latest.length > 0 ? (
        <Text
          style={styles.latest}
          accessibilityLabel={`Latest calls: ${summary.latest.map((l) => l.replace(' ✗', ' dropped')).join(', ')}`}
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
    tallyButton: { borderRadius: 8, paddingVertical: 2 },
    tallyOpen: { backgroundColor: t.control },
    tallyPressed: { backgroundColor: t.controlPressed },
    link: { textDecorationLine: 'underline' },
    hint: { fontSize: 12, color: t.textMuted, marginTop: 4 },
    tallyLabel: { width: 48, fontSize: 14, fontWeight: '600', textAlign: 'right', color: t.text },
    barTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: t.track },
    bar: { height: 10, borderRadius: 5, backgroundColor: t.primary },
    tallyTimes: { minWidth: 32, fontSize: 14, color: t.text, fontVariant: ['tabular-nums'] },
    tallyDrops: { color: t.dangerText, fontWeight: '600' },
    note: { fontSize: 14, color: t.textMuted, marginTop: 12 },
    latest: { fontSize: 14, color: t.textMuted, marginTop: 12 },
  }),
);
