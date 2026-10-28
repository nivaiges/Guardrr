import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  CueOptions,
  MAX_BPM,
  MIN_BPM,
  PHRASE_LENGTH_OPTIONS,
  TossSettings,
  addTap,
  announceCountInPhrase,
  describeWarning,
  settingsWarnings,
  tapTempoBpm,
  tossRangeOf,
  withAllowRepeats,
  withLeadCounts,
  withPhraseLength,
  withTossRange,
} from '../engine';
import { Segmented, Stepper, Toggle } from './controls';

export interface SettingsPanelProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  settings: TossSettings;
  onSettingsChange: (settings: TossSettings) => void;
  cueOptions: CueOptions;
  onCueOptionsChange: (options: CueOptions) => void;
  /** While practicing only the tempo can change; the rest applies on the next start. */
  running: boolean;
}

function TapTempoButton({ onBpm }: { onBpm: (bpm: number) => void }) {
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
  running,
}: SettingsPanelProps) {
  const range = tossRangeOf(settings);
  const announceCount = announceCountInPhrase(settings.phraseLength, settings.leadCounts);
  const warnings = settingsWarnings(settings);
  const locked = running;

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Tempo</Text>
      <Stepper
        label="BPM"
        value={bpm}
        min={MIN_BPM}
        max={MAX_BPM}
        bigStep={5}
        onChange={onBpmChange}
      />
      <TapTempoButton onBpm={onBpmChange} />

      <Text style={styles.heading}>Phrase</Text>
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

      <Text style={styles.heading}>Calls</Text>
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

      <Text style={styles.heading}>Sound</Text>
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
        <View style={styles.warnings} accessibilityRole="summary">
          {warnings.map((w) => (
            <Text key={w.code} style={styles.warning}>
              ⚠︎ {describeWarning(w)}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', maxWidth: 480, marginTop: 24 },
  heading: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#666',
    marginTop: 20,
    marginBottom: 4,
  },
  note: { fontSize: 14, color: '#888', marginBottom: 4 },
  tap: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#e2e6ec',
    alignItems: 'center',
  },
  tapPressed: { backgroundColor: '#c9d1dc' },
  tapText: { fontSize: 18, fontWeight: '700' },
  tapHint: { fontSize: 13, color: '#666', marginTop: 2 },
  warnings: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff4d6',
    gap: 8,
  },
  warning: { fontSize: 14, color: '#5c4400' },
});
