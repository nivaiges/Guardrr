/**
 * Hand-pick the calls: one chip per call the phrase allows, tap to add or
 * remove it. Lets a performer drill e.g. only 3, 5 and 7 — something the
 * shortest/longest steppers can't express.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  TossSettings,
  callChoices,
  callLabel,
  callSetSummary,
  displayLabelForCall,
  tossRangeOf,
  withCallToggled,
} from '../engine';
import { Theme, themed, useTheme } from '../theme';

export interface CallPickerProps {
  settings: TossSettings;
  onChange: (settings: TossSettings) => void;
  disabled?: boolean;
}

export function CallPicker({ settings, onChange, disabled = false }: CallPickerProps) {
  const styles = getStyles(useTheme());
  const { andCounts } = tossRangeOf(settings);
  const choices = callChoices(settings.phraseLength, andCounts);
  const picked = new Set(settings.allowedTossCounts);
  const summary = callSetSummary(settings);
  return (
    <View style={styles.block}>
      <Text style={styles.label}>Calls: {summary}</Text>
      <Text style={styles.hint}>Tap a call to add or remove it.</Text>
      <View style={styles.grid} accessibilityLabel={`Calls to pick from. Picked: ${summary}`}>
        {choices.map((call) => {
          const checked = picked.has(call);
          const last = checked && picked.size === 1;
          return (
            <Pressable
              key={call}
              testID={`call-chip-${call}`}
              style={[
                styles.chip,
                !Number.isInteger(call) && styles.andChip,
                checked && styles.chipChecked,
                disabled && styles.disabled,
              ]}
              onPress={() => onChange(withCallToggled(settings, call))}
              disabled={disabled}
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled }}
              accessibilityLabel={`Call ${callLabel(call)}`}
              accessibilityHint={last ? 'The last call can’t be removed' : undefined}
            >
              <Text style={[styles.chipText, checked && styles.chipTextChecked]}>
                {displayLabelForCall(call)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const getStyles = themed((t: Theme) =>
  StyleSheet.create({
    block: { paddingVertical: 8, gap: 6 },
    label: { fontSize: 16, color: t.text },
    hint: { fontSize: 13, color: t.textMuted },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
    chip: {
      minWidth: 44,
      minHeight: 44,
      paddingHorizontal: 8,
      borderRadius: 22,
      backgroundColor: t.control,
      alignItems: 'center',
      justifyContent: 'center',
    },
    andChip: { minWidth: 52 },
    chipChecked: { backgroundColor: t.primary },
    chipText: { fontSize: 16, fontWeight: '600', color: t.text, fontVariant: ['tabular-nums'] },
    chipTextChecked: { color: t.onPrimary },
    disabled: { opacity: 0.4 },
  }),
);
