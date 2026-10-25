import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SettingsPanel } from './src/components/SettingsPanel';
import {
  CueOptions,
  DEFAULT_TOSS_SETTINGS,
  PracticeCue,
  TossSettings,
  displayLabelForCall,
} from './src/engine';
import { usePracticeSession } from './src/practice';

const DEFAULT_BPM = 120;
const DEFAULT_CUE_OPTIONS: CueOptions = { accentDownbeat: true, andClicks: false };

function cueText(cue: PracticeCue | null): string {
  if (!cue) return 'Ready';
  if (cue.release) return 'Release!';
  if (cue.catch) return 'Catch!';
  if (cue.currentCall === null) return 'Lead-in';
  return `Toss: ${displayLabelForCall(cue.currentCall)}`;
}

export default function App() {
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [settings, setSettings] = useState<TossSettings>(DEFAULT_TOSS_SETTINGS);
  const [cueOptions, setCueOptions] = useState<CueOptions>(DEFAULT_CUE_OPTIONS);
  const { running, cue, start, stop } = usePracticeSession(bpm, settings, cueOptions);

  const highlight = cue?.release || cue?.catch;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Guardrr</Text>
      <Text style={styles.subtitle}>
        {bpm} BPM · {settings.phraseLength}-count phrase · call on count{' '}
        {settings.phraseLength - settings.leadCounts + 1}
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

      <Pressable
        style={[styles.startButton, running && styles.stopButton]}
        onPress={running ? stop : start}
        accessibilityRole="button"
      >
        <Text style={styles.startText}>{running ? 'Stop' : 'Start'}</Text>
      </Pressable>

      <SettingsPanel
        bpm={bpm}
        onBpmChange={setBpm}
        settings={settings}
        onSettingsChange={setSettings}
        cueOptions={cueOptions}
        onCueOptionsChange={setCueOptions}
        running={running}
      />
      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 48,
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
