import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  ScrollViewInstance,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { createVoice, useCallVoices } from './src/audio';
import { CameraBackdrop } from './src/components/CameraBackdrop';
import { CameraSettings } from './src/components/CameraSettings';
import { PageDots } from './src/components/PageDots';
import { PracticeDisplay } from './src/components/PracticeDisplay';
import { PresetPicker } from './src/components/PresetPicker';
import { SessionHistoryCard } from './src/components/SessionHistoryCard';
import { SessionStatsCard } from './src/components/SessionStatsCard';
import { SettingsPanel } from './src/components/SettingsPanel';
import {
  CameraSettings as CameraSettingsValue,
  CueOptions,
  PageIndex,
  PracticePreset,
  TossSettings,
  VOICE_TEST_PHRASE,
  applyPreset,
  latestTossDropped,
  otherPage,
  pageFromOffset,
  practiceDisplay,
  practiceStartedAnnouncement,
  practiceStoppedAnnouncement,
  presetForToss,
  resolveVoice,
  sessionRecord,
  settingsLinkLabel,
  summarizeStats,
} from './src/engine';
import { usePracticeSession } from './src/practice';
import { useCustomPresets, usePersistedSettings, useSessionHistory } from './src/storage';
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
  const { camera } = saved;
  const setCamera = (next: CameraSettingsValue) => update((s) => ({ ...s, camera: next }));
  const flipCamera = () =>
    update((s) => ({
      ...s,
      camera: { ...s.camera, facing: s.camera.facing === 'front' ? 'back' : 'front' },
    }));
  const testVoice = (preview?: string | null) =>
    createVoice({
      rate: voiceRate,
      voice: preview === undefined ? voice : (preview ?? undefined),
    }).say(VOICE_TEST_PHRASE);
  const applyPresetToSettings = (preset: PracticePreset) => update((s) => applyPreset(s, preset));
  const {
    presets: customPresets,
    savePreset,
    deletePreset,
    restorePreset,
    renamePreset,
    updatePreset,
  } = useCustomPresets();
  const { running, cue, stats, startedAt, activeSettings, pendingChange, start, stop, toggleDrop } =
    usePracticeSession(bpm, settings, cueOptions, countIn, voiceRate, voice);
  const {
    history,
    saveSession,
    deleteSession,
    clearHistory,
    restoreSessions,
    updatedAt: historyUpdatedAt,
  } = useSessionHistory();
  // The finished session goes into the history on Stop, and is re-saved if a
  // drop is marked (or undone) after Stop. While practicing, it is saved when
  // the app goes to the background, so a session isn't lost if the app is
  // closed from there.
  // The session is labelled with the preset its drill matched when saved.
  const record = useMemo(
    () =>
      startedAt === null
        ? null
        : sessionRecord(stats, {
            startedAt,
            bpm,
            phraseLength: activeSettings.phraseLength,
            preset: presetForToss(activeSettings, customPresets)?.name,
          }),
    [stats, startedAt, bpm, activeSettings, customPresets],
  );
  const latestRecord = useRef(record);
  useEffect(() => {
    latestRecord.current = record;
  }, [record]);
  useEffect(() => {
    if (!running && record) saveSession(record);
    // Re-save only when the totals change (a late drop), not on every new object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, record?.tosses, record?.drops, saveSession]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && latestRecord.current) saveSession(latestRecord.current);
    });
    return () => sub.remove();
  }, [saveSession]);
  // One short screen-reader announcement per Start/Stop (no-op without one).
  const onStart = () => {
    start();
    AccessibilityInfo.announceForAccessibility(practiceStartedAnnouncement(bpm, settings));
  };
  const onStop = () => {
    stop();
    AccessibilityInfo.announceForAccessibility(practiceStoppedAnnouncement(summarizeStats(stats)));
  };

  // While practicing, show what is playing: changed settings wait for their toss.
  const display = practiceDisplay(cue, activeSettings);

  // Two pages side by side: practice (camera) and settings & stats.
  const { width, height } = useWindowDimensions();
  const pager = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState<PageIndex>(0);
  const onPagerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(pageFromOffset(e.nativeEvent.contentOffset.x, width));
  const goToPage = (p: PageIndex) => {
    pager.current?.scrollTo({ x: p * width, animated: true });
    setPage(p);
  };
  // The first visit to the settings page retires the "swipe left" hint.
  const { swipeHintSeen } = saved;
  useEffect(() => {
    if (page === 1 && !swipeHintSeen) update((s) => ({ ...s, swipeHintSeen: true }));
  }, [page, swipeHintSeen, update]);

  return (
    <View style={styles.root}>
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onPagerScroll}
        scrollEventThrottle={32}
        keyboardShouldPersistTaps="handled"
      >
        {/* Page 1: practice, over the camera. */}
        <View style={[styles.practicePage, { width, height }]} testID="practice-page">
          <CameraBackdrop enabled={camera.enabled} facing={camera.facing} active={page === 0} />
          <View style={styles.topBar}>
            <View style={styles.titlePill}>
              <Text style={styles.title} accessibilityRole="header">
                Guardrr
              </Text>
              <Text style={styles.subtitle}>
                {bpm} BPM · {activeSettings.phraseLength} counts · call on{' '}
                {activeSettings.phraseLength - activeSettings.leadCounts + 1}
              </Text>
            </View>
            {camera.enabled ? (
              <Pressable
                testID="camera-flip"
                style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}
                onPress={flipCamera}
                accessibilityRole="button"
                accessibilityLabel={
                  camera.facing === 'front' ? 'Switch to back camera' : 'Switch to front camera'
                }
                hitSlop={8}
              >
                <Text style={styles.roundButtonText}>⟲</Text>
                <Text style={styles.roundButtonLabel}>
                  {camera.facing === 'front' ? 'Front' : 'Back'}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.displayArea}>
            <PracticeDisplay model={display} overlay />
          </View>

          <View style={styles.controls}>
            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.startButton, running && styles.stopButton]}
                onPress={running ? onStop : onStart}
                accessibilityRole="button"
                accessibilityLabel={running ? 'Stop practice' : 'Start practice'}
                accessibilityHint={
                  running
                    ? undefined
                    : 'Starts the metronome; the first toss is called during the count-in'
                }
              >
                <Text style={styles.startText}>{running ? 'Stop' : 'Start'}</Text>
              </Pressable>
              {stats.tosses > 0 ? (
                <Pressable
                  style={({ pressed }) => [styles.dropButton, pressed && styles.pressed]}
                  onPress={toggleDrop}
                  accessibilityRole="button"
                  accessibilityLabel={latestTossDropped(stats) ? 'Undo drop' : 'Drop'}
                  accessibilityHint={
                    latestTossDropped(stats)
                      ? 'Counts the latest toss as caught again'
                      : 'Marks the latest toss as dropped'
                  }
                >
                  <Text style={styles.dropText}>
                    {latestTossDropped(stats) ? 'Undo drop' : 'Drop'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <Pressable
              testID="go-to-settings"
              style={({ pressed }) => [styles.pageLink, pressed && styles.pressed]}
              onPress={() => goToPage(1)}
              accessibilityRole="button"
              accessibilityLabel="Settings, stats and history"
              accessibilityHint="Or swipe left"
            >
              <Text style={styles.pageLinkText}>{settingsLinkLabel(swipeHintSeen)}</Text>
            </Pressable>
          </View>
        </View>

        {/* Page 2: everything else, one swipe to the right. */}
        <ScrollView
          style={[styles.settingsPage, { width, height }]}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          testID="settings-page"
        >
          <View style={styles.settingsHeader}>
            <Pressable
              testID="go-to-practice"
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              onPress={() => goToPage(0)}
              accessibilityRole="button"
              accessibilityLabel="Back to practice"
              accessibilityHint="Or swipe right"
            >
              <Text style={styles.backText}>‹ Practice</Text>
            </Pressable>
            <Text style={styles.settingsTitle} accessibilityRole="header">
              Settings & stats
            </Text>
          </View>

          <SessionStatsCard stats={stats} running={running} />
          <SessionHistoryCard
            history={history}
            nowMs={historyUpdatedAt}
            onDelete={deleteSession}
            onClear={clearHistory}
            onRestore={restoreSessions}
          />

          <PresetPicker
            settings={saved}
            customPresets={customPresets}
            onApply={applyPresetToSettings}
            onSave={(name) => savePreset(saved, name)}
            onDelete={deletePreset}
            onRestore={restorePreset}
            onRename={renamePreset}
            onUpdate={(id) => updatePreset(id, saved)}
          />

          <CameraSettings camera={camera} onChange={setCamera} />

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
            pendingChange={pendingChange}
          />
        </ScrollView>
      </ScrollView>
      <View style={styles.dots} pointerEvents="box-none">
        <PageDots page={page} onPress={() => goToPage(otherPage(page))} />
      </View>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
    </View>
  );
}

const getStyles = themed((t: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.background },
    practicePage: { backgroundColor: t.background, overflow: 'hidden' },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      paddingTop: 56,
      paddingHorizontal: 16,
    },
    titlePill: {
      flexShrink: 1,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: t.background + 'CC',
    },
    title: { fontSize: 22, fontWeight: '700', color: t.text },
    subtitle: { fontSize: 13, color: t.textMuted },
    roundButton: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.background + 'CC',
    },
    roundButtonText: { fontSize: 22, lineHeight: 24, color: t.text, fontWeight: '700' },
    roundButtonLabel: { fontSize: 11, fontWeight: '600', color: t.text },
    pressed: { opacity: 0.7 },
    displayArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    controls: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
    dots: { position: 'absolute', left: 0, right: 0, bottom: 12, alignItems: 'center' },
    buttonRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
    startButton: {
      paddingVertical: 18,
      minWidth: 150,
      alignItems: 'center',
      borderRadius: 32,
      backgroundColor: t.primary,
    },
    stopButton: { backgroundColor: t.danger },
    startText: { color: t.onPrimary, fontSize: 22, fontWeight: '700' },
    dropButton: {
      paddingVertical: 16,
      minWidth: 130,
      alignItems: 'center',
      borderRadius: 32,
      borderWidth: 2,
      borderColor: t.dangerText,
      backgroundColor: t.background + 'CC',
    },
    dropText: { color: t.text, fontSize: 20, fontWeight: '700' },
    pageLink: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 16,
      backgroundColor: t.background + 'CC',
    },
    pageLinkText: { fontSize: 15, fontWeight: '600', color: t.text },
    settingsPage: { backgroundColor: t.background },
    container: {
      flexGrow: 1,
      backgroundColor: t.background,
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 56,
      paddingBottom: 48,
    },
    settingsHeader: {
      width: '100%',
      maxWidth: 480,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: t.control,
    },
    backText: { fontSize: 15, fontWeight: '600', color: t.text },
    settingsTitle: { fontSize: 22, fontWeight: '700', color: t.text },
  }),
);
