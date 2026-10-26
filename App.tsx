import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { PracticeDisplay } from './src/components/PracticeDisplay';
import { SettingsPanel } from './src/components/SettingsPanel';
import { CueOptions, DEFAULT_TOSS_SETTINGS, TossSettings, practiceDisplay } from './src/engine';
import { usePracticeSession } from './src/practice';

const DEFAULT_BPM = 120;
const DEFAULT_CUE_OPTIONS: CueOptions = { accentDownbeat: true, andClicks: false };

export default function App() {
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [settings, setSettings] = useState<TossSettings>(DEFAULT_TOSS_SETTINGS);
  const [cueOptions, setCueOptions] = useState<CueOptions>(DEFAULT_CUE_OPTIONS);
  const { running, cue, start, stop } = usePracticeSession(bpm, settings, cueOptions);

  const display = practiceDisplay(cue, settings);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Guardrr</Text>
      <Text style={styles.subtitle}>
        {bpm} BPM · {settings.phraseLength}-count phrase · call on count{' '}
        {settings.phraseLength - settings.leadCounts + 1}
      </Text>

      <PracticeDisplay model={display} />

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
  startButton: {
    marginTop: 24,
    paddingVertical: 18,
    paddingHorizontal: 64,
    borderRadius: 32,
    backgroundColor: '#1f6feb',
  },
  stopButton: { backgroundColor: '#d1242f' },
  startText: { color: '#fff', fontSize: 22, fontWeight: '700' },
});
