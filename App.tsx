import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DEFAULT_TOSS_SETTINGS,
  MAX_BPM,
  MIN_BPM,
  PracticeCue,
  TossSettings,
  displayLabelForCall,
} from './src/engine';
import { usePracticeSession } from './src/practice';

const DEFAULT_BPM = 120;
const BPM_STEP = 5;
const SETTINGS: TossSettings = DEFAULT_TOSS_SETTINGS;

function cueText(cue: PracticeCue | null): string {
  if (!cue) return 'Ready';
  if (cue.release) return 'Release!';
  if (cue.catch) return 'Catch!';
  if (cue.currentCall === null) return 'Lead-in';
  return `Toss: ${displayLabelForCall(cue.currentCall)}`;
}

export default function App() {
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const { running, cue, start, stop } = usePracticeSession(bpm, SETTINGS);

  const changeBpm = (delta: number) =>
    setBpm((b) => Math.min(MAX_BPM, Math.max(MIN_BPM, b + delta)));

  const highlight = cue?.release || cue?.catch;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Guardrr</Text>
      <Text style={styles.subtitle}>
        {SETTINGS.phraseLength}-count phrase · call {SETTINGS.leadCounts} counts before release
      </Text>

      <View style={[styles.display, highlight && styles.displayHighlight]}>
        <Text style={styles.count} accessibilityLabel="Current count">
          {cue ? cue.count : '–'}
        </Text>
        <Text style={styles.cue} accessibilityLiveRegion="polite">
          {cueText(cue)}
        </Text>
        <Text style={styles.next}>
          {cue?.nextCall != null ? `Next: ${displayLabelForCall(cue.nextCall)}` : ' '}
        </Text>
      </View>

      <View style={styles.bpmRow}>
        <Pressable
          style={styles.bpmButton}
          onPress={() => changeBpm(-BPM_STEP)}
          accessibilityRole="button"
          accessibilityLabel={`Slower by ${BPM_STEP} BPM`}
        >
          <Text style={styles.bpmButtonText}>−</Text>
        </Pressable>
        <Text style={styles.bpm}>{bpm} BPM</Text>
        <Pressable
          style={styles.bpmButton}
          onPress={() => changeBpm(BPM_STEP)}
          accessibilityRole="button"
          accessibilityLabel={`Faster by ${BPM_STEP} BPM`}
        >
          <Text style={styles.bpmButtonText}>+</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.startButton, running && styles.stopButton]}
        onPress={running ? stop : start}
        accessibilityRole="button"
      >
        <Text style={styles.startText}>{running ? 'Stop' : 'Start'}</Text>
      </Pressable>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 36, fontWeight: '700' },
  subtitle: { fontSize: 15, marginTop: 4, color: '#555', textAlign: 'center' },
  display: {
    marginTop: 32,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    paddingVertical: 24,
    borderRadius: 16,
    backgroundColor: '#f1f3f6',
  },
  displayHighlight: { backgroundColor: '#ffe7a3' },
  count: { fontSize: 120, fontWeight: '800', fontVariant: ['tabular-nums'] },
  cue: { fontSize: 28, fontWeight: '600' },
  next: { fontSize: 18, marginTop: 8, color: '#555' },
  bpmRow: { flexDirection: 'row', alignItems: 'center', marginTop: 32, gap: 20 },
  bpmButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e2e6ec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bpmButtonText: { fontSize: 30, fontWeight: '600' },
  bpm: { fontSize: 24, fontWeight: '600', minWidth: 120, textAlign: 'center' },
  startButton: {
    marginTop: 32,
    paddingVertical: 18,
    paddingHorizontal: 64,
    borderRadius: 32,
    backgroundColor: '#1f6feb',
  },
  stopButton: { backgroundColor: '#d1242f' },
  startText: { color: '#fff', fontSize: 22, fontWeight: '700' },
});
