import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  COUNT_IN_OPTIONS,
  CueOptions,
  MAX_BPM,
  MIN_BPM,
  PHRASE_LENGTH_OPTIONS,
  TossSettings,
  addTap,
  announceCountInPhrase,
  countInLabel,
  describeWarning,
  effectiveCountIn,
  settingsWarnings,
  tapTempoBpm,
  tossRangeOf,
  withAllowRepeats,
  withLeadCounts,
  withPhraseLength,
  withTossRange,
} from '../engine';
import { Theme, themed, useTheme } from '../theme';
import { Segmented, Stepper, Toggle } from './controls';

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
  /** While practicing only the tempo can change; the rest applies on the next start. */
  running: boolean;
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

export function SettingsPanel({
  bpm,
  onBpmChange,
  settings,
  onSettingsChange,
  cueOptions,
  onCueOptionsChange,
  countIn,
  onCountInChange,
  running,
}: SettingsPanelProps) {
  const styles = getStyles(useTheme());
  const range = tossRangeOf(settings);
  const announceCount = announceCountInPhrase(settings.phraseLength, settings.leadCounts);
  const warnings = settingsWarnings(settings);
  const locked = running;
  const countInUsed = effectiveCountIn(countIn, settings);

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
      {locked ? <Text style={styles.note}>Stop to change these.</Text> : null}
      <Segmented
        label="Counts per phrase"
        options={PHRASE_LENGTH_OPTIONS}
        value={settings.phraseLength}
        onChange={(n) => onSettingsChange(withPhraseLength(settings, n))}
        disabled={locked}
      />
      <Stepper
        label={`Call ${settings.leadCounts} before release (on count ${announceCount})`}
        value={settings.leadCounts}
        min={1}
        max={settings.phraseLength}
        onChange={(n) => onSettingsChange(withLeadCounts(settings, n))}
        disabled={locked}
      />
      <Segmented
        label={`Count-in before the first toss (${countInUsed} counts)`}
        options={COUNT_IN_OPTIONS}
        value={countIn}
        onChange={onCountInChange}
        disabled={locked}
        optionLabel={countInLabel}
        optionAccessibilityLabel={(n) => (n === 0 ? 'A full phrase' : `${n} counts`)}
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
        disabled={locked}
      />
      <Stepper
        label="Longest toss"
        value={range.max}
        min={range.min}
        max={settings.phraseLength}
        onChange={(max) => onSettingsChange(withTossRange(settings, { ...range, max }))}
        disabled={locked}
      />
      <Toggle
        label={'Include "and" calls (e.g. "2 and")'}
        value={range.andCounts}
        onChange={(andCounts) => onSettingsChange(withTossRange(settings, { ...range, andCounts }))}
        disabled={locked}
      />
      <Toggle
        label="Allow the same call twice in a row"
        value={settings.allowRepeats}
        onChange={(v) => onSettingsChange(withAllowRepeats(settings, v))}
        disabled={locked}
      />

      <Text style={styles.heading} accessibilityRole="header">
        Sound
      </Text>
      <Toggle
        label="Accent count 1"
        value={cueOptions.accentDownbeat ?? true}
        onChange={(accentDownbeat) => onCueOptionsChange({ ...cueOptions, accentDownbeat })}
        disabled={locked}
      />
      <Toggle
        label={'Quiet click on the "and"s'}
        value={cueOptions.andClicks ?? false}
        onChange={(andClicks) => onCueOptionsChange({ ...cueOptions, andClicks })}
        disabled={locked}
      />
      <Toggle
        label="Vibrate on the release (count 1)"
        value={cueOptions.haptics ?? true}
        onChange={(haptics) => onCueOptionsChange({ ...cueOptions, haptics })}
        disabled={locked}
      />

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
