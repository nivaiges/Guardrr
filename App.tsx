import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { createVoice, useCallVoices } from './src/audio';
import { PracticeDisplay } from './src/components/PracticeDisplay';
import { PresetPicker } from './src/components/PresetPicker';
import { SessionStatsCard } from './src/components/SessionStatsCard';
import { SettingsPanel } from './src/components/SettingsPanel';
import {
  CueOptions,
  PracticePreset,
  TossSettings,
  VOICE_TEST_PHRASE,
  applyPreset,
  latestTossDropped,
  practiceDisplay,
  practiceStartedAnnouncement,
  practiceStoppedAnnouncement,
  resolveVoice,
  summarizeStats,
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
  const { bpm, toss: settings, cue: cueOptions, countIn, voiceRate } = saved;
  const { voices, reload: reloadVoices } = useCallVoices();
  // A saved voice the phone no longer has falls back to the system default.
  const voice = resolveVoice(saved.voice, voices);
  const setBpm = (next: number) => update((s) => ({ ...s, bpm: next }));
  const setSettings = (toss: TossSettings) => update((s) => ({ ...s, toss }));
  const setCueOptions = (cue: CueOptions) => update((s) => ({ ...s, cue: { ...s.cue, ...cue } }));
  const setCountIn = (next: number) => update((s) => ({ ...s, countIn: next }));
  const setVoiceRate = (next: number) => update((s) => ({ ...s, voiceRate: next }));
  const setVoice = (next: string | null) => update((s) => ({ ...s, voice: next }));
  const testVoice = (preview?: string | null) =>
    createVoice({
      rate: voiceRate,
      voice: preview === undefined ? voice : (preview ?? undefined),
    }).say(VOICE_TEST_PHRASE);
  const applyPresetToSettings = (preset: PracticePreset) => update((s) => applyPreset(s, preset));
  const { running, cue, stats, start, stop, toggleDrop } = usePracticeSession(
    bpm,
    settings,
    cueOptions,
    countIn,
    voiceRate,
    voice,
  );
  // One short screen-reader announcement per Start/Stop (no-op without one).
  const onStart = () => {
    start();
    AccessibilityInfo.announceForAccessibility(practiceStartedAnnouncement(bpm, settings));
  };
  const onStop = () => {
    stop();
    AccessibilityInfo.announceForAccessibility(practiceStoppedAnnouncement(summarizeStats(stats)));
  };

  const display = practiceDisplay(cue, settings);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Guardrr
      </Text>
      <Text style={styles.subtitle}>
        {bpm} BPM · {settings.phraseLength}-count phrase · call on count{' '}
        {settings.phraseLength - settings.leadCounts + 1}
      </Text>

      <PracticeDisplay model={display} />

      <Pressable
        style={[styles.startButton, running && styles.stopButton]}
        onPress={running ? onStop : onStart}
        accessibilityRole="button"
        accessibilityLabel={running ? 'Stop practice' : 'Start practice'}
        accessibilityHint={
          running ? undefined : 'Starts the metronome; the first toss is called during the count-in'
        }
      >
        <Text style={styles.startText}>{running ? 'Stop' : 'Start'}</Text>
      </Pressable>

      {stats.tosses > 0 ? (
        <Pressable
          style={({ pressed }) => [styles.dropButton, pressed && styles.dropPressed]}
          onPress={toggleDrop}
          accessibilityRole="button"
          accessibilityLabel={latestTossDropped(stats) ? 'Undo drop' : 'Drop'}
          accessibilityHint={
            latestTossDropped(stats)
              ? 'Counts the latest toss as caught again'
              : 'Marks the latest toss as dropped'
          }
        >
          <Text style={styles.dropText}>{latestTossDropped(stats) ? 'Undo drop' : 'Drop'}</Text>
        </Pressable>
      ) : null}

      <SessionStatsCard stats={stats} running={running} />

      <PresetPicker settings={saved} onApply={applyPresetToSettings} disabled={running} />

      <SettingsPanel
        bpm={bpm}
        onBpmChange={setBpm}
        settings={settings}
        onSettingsChange={setSettings}
        cueOptions={cueOptions}
        onCueOptionsChange={setCueOptions}
        countIn={countIn}
        onCountInChange={setCountIn}
        voiceRate={voiceRate}
        onVoiceRateChange={setVoiceRate}
        voices={voices}
        voice={voice ?? null}
        onVoiceChange={setVoice}
        onReloadVoices={reloadVoices}
        onTestVoice={testVoice}
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
      minWidth: 200,
      alignItems: 'center',
      borderRadius: 32,
      backgroundColor: t.primary,
    },
    stopButton: { backgroundColor: t.danger },
    startText: { color: t.onPrimary, fontSize: 22, fontWeight: '700' },
    dropButton: {
      marginTop: 12,
      paddingVertical: 14,
      minWidth: 200,
      alignItems: 'center',
      borderRadius: 28,
      borderWidth: 2,
      borderColor: t.dangerText,
    },
    dropPressed: { backgroundColor: t.controlPressed },
    dropText: { color: t.text, fontSize: 18, fontWeight: '700' },
  }),
);
