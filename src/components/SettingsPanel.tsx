import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  COUNT_IN_OPTIONS,
  CueOptions,
  MAX_BPM,
  MIN_BPM,
  PHRASE_LENGTH_OPTIONS,
  PendingSettingsChange,
  TossSettings,
  VOICE_RATE_OPTIONS,
  VoiceInfo,
  addTap,
  announceCountInPhrase,
  callSetNote,
  countInLabel,
  countOffSummary,
  describeWarning,
  effectiveCountIn,
  liveSettingsNote,
  settingsWarnings,
  tapTempoBpm,
  tossRangeOf,
  withAllowRepeats,
  withAndCalls,
  withLeadCounts,
  withPhraseLength,
  withTossRange,
} from '../engine';
import { Theme, themed, useTheme } from '../theme';
import { CallPicker } from './CallPicker';
import { Segmented, Stepper, Toggle } from './controls';
import { VoicePicker } from './VoicePicker';

export interface SettingsPanelProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  settings: TossSettings;
  onSettingsChange: (settings: TossSettings) => void;
  cueOptions: CueOptions;
  onCueOptionsChange: (options: CueOptions) => void;
  /** Counts before the first release; 0 = a full phrase. */
  countIn: number;
  onCountInChange: (countIn: number) => void;
  voiceRate: number;
  onVoiceRateChange: (rate: number) => void;
  /** English voices on this phone, best first. */
  voices: readonly VoiceInfo[];
  /** Chosen voice identifier, or null for the system default. */
  voice: string | null;
  onVoiceChange: (voice: string | null) => void;
  /** Re-read the voice list (when the picker opens). */
  onReloadVoices?: () => void;
  /** Speak a sample call at the chosen speed, with `voice` if given (else the chosen one). */
  onTestVoice: (voice?: string | null) => void;
  /**
   * While practicing everything can change: tempo, sounds and voice speed
   * right away, phrase and calls from the next toss not yet called (see
   * `pendingChange`). Only voice previews wait for Stop (they'd talk over the calls).
   */
  running: boolean;
  /** Phrase/call changes waiting for their toss while practicing. */
  pendingChange?: PendingSettingsChange | null;
}

function TapTempoButton({ onBpm }: { onBpm: (bpm: number) => void }) {
  const styles = getStyles(useTheme());
  const taps = useRef<number[]>([]);
  const [count, setCount] = useState(0);
  const onPress = () => {
    taps.current = addTap(taps.current, performance.now());
    setCount(taps.current.length);
    const bpm = tapTempoBpm(taps.current);
    if (bpm !== null) onBpm(bpm);
  };
  return (
    <Pressable
      style={({ pressed }) => [styles.tap, pressed && styles.tapPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Tap tempo"
      accessibilityHint="Tap along with the beat to set the BPM"
    >
      <Text style={styles.tapText}>Tap tempo</Text>
      <Text style={styles.tapHint}>{count < 2 ? 'tap the beat' : `${count} taps`}</Text>
    </Pressable>
  );
}

function VoiceRatePicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (rate: number) => void;
  disabled: boolean;
}) {
  // Segmented works on numbers; index the options so labels stay words.
  const index = Math.max(
    0,
    VOICE_RATE_OPTIONS.findIndex((o) => o.rate === value),
  );
  return (
    <Segmented
      label="Call speed"
      options={VOICE_RATE_OPTIONS.map((_, i) => i)}
      value={index}
      onChange={(i) => onChange(VOICE_RATE_OPTIONS[i].rate)}
      disabled={disabled}
      optionLabel={(i) => VOICE_RATE_OPTIONS[i].label}
      optionAccessibilityLabel={(i) => `${VOICE_RATE_OPTIONS[i].label} speech`}
    />
  );
}

export function SettingsPanel({
  bpm,
  onBpmChange,
  settings,
  onSettingsChange,
  cueOptions,
  onCueOptionsChange,
  countIn,
  onCountInChange,
  voiceRate,
  onVoiceRateChange,
  voices,
  voice,
  onVoiceChange,
  onReloadVoices,
  onTestVoice,
  running,
  pendingChange = null,
}: SettingsPanelProps) {
  const styles = getStyles(useTheme());
  const range = tossRangeOf(settings);
  const callNote = callSetNote(settings);
  const announceCount = announceCountInPhrase(settings.phraseLength, settings.leadCounts);
  const warnings = settingsWarnings(settings);
  // Previews speak, so they'd talk over the practice calls.
  const previewLocked = running;
  const liveNote = liveSettingsNote(running, pendingChange);
  const countInUsed = effectiveCountIn(countIn, settings);
  const countOff = countOffSummary(countIn, settings);

  return (
    <View style={styles.panel}>
      <Text style={styles.heading} accessibilityRole="header">
        Tempo
      </Text>
      <Stepper
        label="BPM"
        value={bpm}
        min={MIN_BPM}
        max={MAX_BPM}
        bigStep={5}
        onChange={onBpmChange}
      />
      <TapTempoButton onBpm={onBpmChange} />

      <Text style={styles.heading} accessibilityRole="header">
        Phrase
      </Text>
      {liveNote ? (
        <Text style={styles.note} accessibilityLiveRegion="polite" testID="live-settings-note">
          {liveNote}
        </Text>
      ) : null}
      <Segmented
        label="Counts per phrase"
        options={PHRASE_LENGTH_OPTIONS}
        value={settings.phraseLength}
        onChange={(n) => onSettingsChange(withPhraseLength(settings, n))}
      />
      <Stepper
        label={`Call ${settings.leadCounts} before release (on count ${announceCount})`}
        value={settings.leadCounts}
        min={1}
        max={settings.phraseLength}
        onChange={(n) => onSettingsChange(withLeadCounts(settings, n))}
      />
      <Segmented
        label={`Count-in before the first toss (${countInUsed} counts)`}
        options={COUNT_IN_OPTIONS}
        value={countIn}
        onChange={onCountInChange}
        optionLabel={countInLabel}
        optionAccessibilityLabel={(n) => (n === 0 ? 'A full phrase' : `${n} counts`)}
      />
      <Toggle
        label={
          countOff
            ? `Speak the count-off (${countOff}, then the call)`
            : 'Speak the count-off (no room before the call: shorten the lead)'
        }
        value={cueOptions.countOff ?? false}
        onChange={(v) => onCueOptionsChange({ ...cueOptions, countOff: v })}
      />

      <Text style={styles.heading} accessibilityRole="header">
        Calls
      </Text>
      <Stepper
        label="Shortest toss"
        value={range.min}
        min={1}
        max={range.max}
        onChange={(min) => onSettingsChange(withTossRange(settings, { ...range, min }))}
      />
      <Stepper
        label="Longest toss"
        value={range.max}
        min={range.min}
        max={settings.phraseLength}
        onChange={(max) => onSettingsChange(withTossRange(settings, { ...range, max }))}
      />
      <Toggle
        label={'Include "and" calls (e.g. "2 and")'}
        value={range.andCounts}
        onChange={(andCounts) => onSettingsChange(withAndCalls(settings, andCounts))}
      />
      <CallPicker settings={settings} onChange={onSettingsChange} />
      {callNote ? <Text style={styles.note}>{callNote}</Text> : null}
      <Toggle
        label="Allow the same call twice in a row"
        value={settings.allowRepeats}
        onChange={(v) => onSettingsChange(withAllowRepeats(settings, v))}
      />

      <Text style={styles.heading} accessibilityRole="header">
        Sound
      </Text>
      <Toggle
        label="Accent count 1"
        value={cueOptions.accentDownbeat ?? true}
        onChange={(accentDownbeat) => onCueOptionsChange({ ...cueOptions, accentDownbeat })}
      />
      <Toggle
        label={'Quiet click on the "and"s'}
        value={cueOptions.andClicks ?? false}
        onChange={(andClicks) => onCueOptionsChange({ ...cueOptions, andClicks })}
      />
      <Toggle
        label="Vibrate on the release (count 1)"
        value={cueOptions.haptics ?? true}
        onChange={(haptics) => onCueOptionsChange({ ...cueOptions, haptics })}
      />
      <Toggle
        label="Light tap on the catch"
        value={cueOptions.catchHaptics ?? false}
        onChange={(catchHaptics) => onCueOptionsChange({ ...cueOptions, catchHaptics })}
      />

      <Text style={styles.heading} accessibilityRole="header">
        Voice
      </Text>
      <VoicePicker
        voices={voices}
        value={voice}
        onChange={onVoiceChange}
        onPreview={onTestVoice}
        onOpen={onReloadVoices}
        disabled={previewLocked}
      />
      <VoiceRatePicker value={voiceRate} onChange={onVoiceRateChange} disabled={false} />
      <Pressable
        style={({ pressed }) => [styles.tap, pressed && styles.tapPressed]}
        onPress={() => onTestVoice()}
        disabled={previewLocked}
        accessibilityRole="button"
        accessibilityLabel="Test voice"
        accessibilityHint="Speaks a sample call with the chosen voice and speed"
        accessibilityState={{ disabled: previewLocked }}
      >
        <Text style={[styles.tapText, previewLocked && styles.dimmed]}>Test voice</Text>
      </Pressable>
      {previewLocked ? <Text style={styles.note}>Stop to choose or test a voice.</Text> : null}

      {warnings.length > 0 ? (
        <View style={styles.warnings} accessibilityRole="summary" accessibilityLiveRegion="polite">
          {warnings.map((w) => (
            <Text
              key={w.code}
              style={styles.warning}
              accessibilityLabel={`Warning: ${describeWarning(w)}`}
            >
              ⚠︎ {describeWarning(w)}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const getStyles = themed((t: Theme) =>
  StyleSheet.create({
    panel: { width: '100%', maxWidth: 480, marginTop: 24 },
    heading: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.textMuted,
      marginTop: 20,
      marginBottom: 4,
    },
    note: { fontSize: 14, color: t.textMuted, marginBottom: 4 },
    tap: {
      marginTop: 4,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: t.control,
      alignItems: 'center',
    },
    tapPressed: { backgroundColor: t.controlPressed },
    tapText: { fontSize: 18, fontWeight: '700', color: t.text },
    dimmed: { opacity: 0.4 },
    tapHint: { fontSize: 13, color: t.textMuted, marginTop: 2 },
    warnings: {
      marginTop: 16,
      padding: 12,
      borderRadius: 12,
      backgroundColor: t.warningBackground,
      gap: 8,
    },
    warning: { fontSize: 14, color: t.warningText },
  }),
);
