import { StyleSheet, Text, View } from 'react-native';

import { PhraseBeat, PracticeDisplay as DisplayModel } from '../engine';
import { Theme, themed, useTheme } from '../theme';

function Beat({ beat }: { beat: PhraseBeat }) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const color = theme.marker[beat.marker ?? 'idle'];
  return (
    <View
      style={[
        styles.beat,
        { borderColor: color },
        (beat.past || beat.current) && { backgroundColor: color },
        beat.current && styles.beatCurrent,
      ]}
    >
      {beat.catchOnAnd && <View style={[styles.andDot, { backgroundColor: color }]} />}
    </View>
  );
}

function countdownText(model: DisplayModel): string {
  if (model.countsToCatch === null) return ' ';
  if (model.countsToCatch === 0.5) return 'catch on the "and"';
  return `${model.countsToCatch} to catch`;
}

/** The big count/cue display with a strip showing where you are in the phrase. */
export function PracticeDisplay({ model }: { model: DisplayModel }) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const highlight = model.phase === 'release' || model.phase === 'catch';
  return (
    <View style={[styles.display, { backgroundColor: theme.phase[model.phase] }]}>
      <View style={styles.callRow}>
        <Text style={styles.callLabel}>Toss</Text>
        <Text style={styles.callValue} accessibilityLabel="Current toss">
          {model.callLabel ?? '–'}
        </Text>
        <Text style={styles.callLabel}>Next</Text>
        <Text style={styles.callValue} accessibilityLabel="Next toss">
          {model.nextCallLabel ?? '–'}
        </Text>
      </View>

      <Text style={styles.count} accessibilityLabel="Current count">
        {model.count ?? '–'}
      </Text>
      <Text
        style={[styles.headline, highlight && styles.headlineHighlight]}
        accessibilityLiveRegion="polite"
      >
        {model.headline}
      </Text>
      <Text style={styles.detail}>{model.detail}</Text>
      <Text style={styles.countdown}>{countdownText(model)}</Text>

      <View
        style={styles.strip}
        accessible
        accessibilityLabel={
          model.count === null
            ? `${model.beats.length}-count phrase`
            : `Count ${model.count} of ${model.beats.length}`
        }
      >
        {model.beats.map((beat) => (
          <Beat key={beat.count} beat={beat} />
        ))}
      </View>
      <View style={styles.legend} importantForAccessibility="no-hide-descendants">
        {(['release', 'catch', 'call'] as const).map((marker) => (
          <Text key={marker} style={styles.legendItem}>
            <Text style={{ color: theme.marker[marker] }}>●</Text> {marker}
          </Text>
        ))}
      </View>
    </View>
  );
}

const getStyles = themed((t: Theme) =>
  StyleSheet.create({
    display: {
      marginTop: 24,
      width: '100%',
      maxWidth: 360,
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 16,
      borderRadius: 16,
    },
    callRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    callLabel: { fontSize: 14, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
    callValue: {
      fontSize: 24,
      fontWeight: '700',
      color: t.text,
      minWidth: 40,
      fontVariant: ['tabular-nums'],
    },
    count: {
      fontSize: 120,
      lineHeight: 132,
      fontWeight: '800',
      color: t.text,
      fontVariant: ['tabular-nums'],
    },
    headline: { fontSize: 30, fontWeight: '700', color: t.text },
    headlineHighlight: { fontSize: 36 },
    detail: { fontSize: 18, marginTop: 6, color: t.text },
    countdown: { fontSize: 16, marginTop: 4, color: t.textMuted, fontVariant: ['tabular-nums'] },
    strip: {
      marginTop: 16,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 6,
    },
    beat: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    beatCurrent: { transform: [{ scale: 1.4 }] },
    andDot: { position: 'absolute', right: -6, width: 5, height: 5, borderRadius: 3 },
    legend: { flexDirection: 'row', gap: 12, marginTop: 10 },
    legendItem: { fontSize: 12, color: t.textMuted },
  }),
);
