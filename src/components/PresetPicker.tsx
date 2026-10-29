import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Theme, themed, useTheme } from '../theme';
import { PRACTICE_PRESETS, PracticePreset, PracticeSettings, matchingPreset } from '../engine';

export interface PresetPickerProps {
  settings: PracticeSettings;
  onApply: (preset: PracticePreset) => void;
  /** Presets change the phrase and calls, so they're locked while practicing. */
  disabled?: boolean;
}

/** One-tap practice setups. The preset the settings still match is highlighted. */
export function PresetPicker({ settings, onApply, disabled = false }: PresetPickerProps) {
  const styles = getStyles(useTheme());
  const current = matchingPreset(settings);
  return (
    <View style={styles.block}>
      <Text style={styles.heading} accessibilityRole="header">
        Presets
      </Text>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Presets">
        {PRACTICE_PRESETS.map((preset) => {
          const selected = preset.id === current?.id;
          return (
            <Pressable
              key={preset.id}
              style={[styles.chip, selected && styles.chipSelected, disabled && styles.disabled]}
              onPress={() => onApply(preset)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={preset.name}
              accessibilityHint={`${preset.description}, ${preset.bpm} BPM`}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {preset.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.description}>
        {current
          ? `${current.description} · ${current.bpm} BPM to start`
          : 'Custom settings — pick a preset to start from one.'}
      </Text>
    </View>
  );
}

const getStyles = themed((t: Theme) =>
  StyleSheet.create({
    block: { width: '100%', maxWidth: 480, marginTop: 24 },
    heading: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.textMuted,
      marginBottom: 8,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 20,
      backgroundColor: t.control,
    },
    chipSelected: { backgroundColor: t.primary },
    chipText: { fontSize: 15, fontWeight: '600', color: t.text },
    chipTextSelected: { color: t.onPrimary },
    disabled: { opacity: 0.4 },
    description: { fontSize: 14, color: t.textMuted, marginTop: 8 },
  }),
);
