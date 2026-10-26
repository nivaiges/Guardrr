import { StyleSheet, Text, View } from 'react-native';

import { DisplayPhase, PhraseBeat, PracticeDisplay as DisplayModel } from '../engine';

const PHASE_COLORS: Record<DisplayPhase, string> = {
  ready: '#f1f3f6',
  'lead-in': '#f1f3f6',
  release: '#ffd76a',
  'in-air': '#dbe9ff',
  catch: '#9be7a8',
  marking: '#f1f3f6',
};

const MARKER_COLORS = {
  release: '#e0a400',
  catch: '#1a8f3c',
  call: '#1f6feb',
} as const;

function Beat({ beat }: { beat: PhraseBeat }) {
  const color = beat.marker ? MARKER_COLORS[beat.marker] : '#c4c9d1';
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
  const highlight = model.phase === 'release' || model.phase === 'catch';
  return (
    <View style={[styles.display, { backgroundColor: PHASE_COLORS[model.phase] }]}>
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
      <View style={styles.legend}>
        <Text style={[styles.legendItem, { color: MARKER_COLORS.release }]}>● release</Text>
        <Text style={[styles.legendItem, { color: MARKER_COLORS.catch }]}>● catch</Text>
        <Text style={[styles.legendItem, { color: MARKER_COLORS.call }]}>● call</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  callLabel: { fontSize: 14, color: '#555', textTransform: 'uppercase', letterSpacing: 1 },
  callValue: { fontSize: 24, fontWeight: '700', minWidth: 40, fontVariant: ['tabular-nums'] },
  count: { fontSize: 120, lineHeight: 132, fontWeight: '800', fontVariant: ['tabular-nums'] },
  headline: { fontSize: 30, fontWeight: '700' },
  headlineHighlight: { fontSize: 36 },
  detail: { fontSize: 18, marginTop: 6, color: '#333' },
  countdown: { fontSize: 16, marginTop: 4, color: '#555', fontVariant: ['tabular-nums'] },
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
  legendItem: { fontSize: 12 },
});
