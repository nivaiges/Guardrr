import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { PracticeDisplay } from './src/components/PracticeDisplay';
import { PresetPicker } from './src/components/PresetPicker';
import { SessionStatsCard } from './src/components/SessionStatsCard';
import { SettingsPanel } from './src/components/SettingsPanel';
import {
  CueOptions,
  PracticePreset,
  TossSettings,
  applyPreset,
  practiceDisplay,
} from './src/engine';
import { usePracticeSession } from './src/practice';
import { usePersistedSettings } from './src/storage';
import { Theme, themed, useTheme } from './src/theme';

export default function App() {
  const theme = useTheme();
  const styles = getStyles(theme);
  useEffect(() => {
    // Root view color behind the app (keyboard, rotation, overscroll) follows the theme.
    SystemUI.setBackgroundColorAsync(theme.background).catch(() => {});
  }, [theme]);
  const { settings: saved, setSettings: update } = usePersistedSettings();
  const { bpm, toss: settings, cue: cueOptions } = saved;
  const setBpm = (next: number) => update((s) => ({ ...s, bpm: next }));
  const setSettings = (toss: TossSettings) => update((s) => ({ ...s, toss }));
  const setCueOptions = (cue: CueOptions) => update((s) => ({ ...s, cue: { ...s.cue, ...cue } }));
  const applyPresetToSettings = (preset: PracticePreset) => update((s) => applyPreset(s, preset));
  const { running, cue, stats, start, stop } = usePracticeSession(bpm, settings, cueOptions);

  const display = practiceDisplay(cue, settings);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
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

      <SessionStatsCard stats={stats} running={running} />

      <PresetPicker settings={saved} onApply={applyPresetToSettings} disabled={running} />

      <SettingsPanel
        bpm={bpm}
        onBpmChange={setBpm}
        settings={settings}
        onSettingsChange={setSettings}
        cueOptions={cueOptions}
        onCueOptionsChange={setCueOptions}
        running={running}
      />
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
    </ScrollView>
  );
}

const getStyles = themed((t: Theme) =>
  StyleSheet.create({
    screen: { backgroundColor: t.background },
    container: {
      flexGrow: 1,
      backgroundColor: t.background,
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 72,
      paddingBottom: 48,
    },
    title: { fontSize: 36, fontWeight: '700', color: t.text },
    subtitle: { fontSize: 15, marginTop: 4, color: t.textMuted, textAlign: 'center' },
    startButton: {
      marginTop: 24,
      paddingVertical: 18,
      paddingHorizontal: 64,
      borderRadius: 32,
      backgroundColor: t.primary,
    },
    stopButton: { backgroundColor: t.danger },
    startText: { color: t.onPrimary, fontSize: 22, fontWeight: '700' },
  }),
);
