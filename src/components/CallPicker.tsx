/**
 * Hand-pick the calls: one chip per call the phrase allows, tap to add or
 * remove it. Lets a performer drill e.g. only 3, 5 and 7 — something the
 * shortest/longest steppers can't express.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  CALL_SHORTCUTS,
  CallShortcut,
  TossSettings,
  callChoices,
  callLabel,
  callSetSummary,
  callShortcutOf,
  displayLabelForCall,
  tossRangeOf,
  withCallShortcut,
  withCallToggled,
} from '../engine';
import { Theme, themed, useTheme } from '../theme';

const SHORTCUT_LABELS: Record<CallShortcut, string> = { all: 'All', odd: 'Odd', even: 'Even' };

const SHORTCUT_A11Y: Record<CallShortcut, string> = {
  all: 'Pick every call',
  odd: 'Pick the odd counts only',
  even: 'Pick the even counts only',
};

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
  const shortcut = callShortcutOf(settings);
  return (
    <View style={styles.block}>
      <Text style={styles.label}>Calls: {summary}</Text>
      <Text style={styles.hint}>Tap a call to add or remove it, or pick a group.</Text>
      <View style={styles.shortcuts}>
        {CALL_SHORTCUTS.map((option) => {
          const selected = option === shortcut;
          return (
            <Pressable
              key={option}
              testID={`call-shortcut-${option}`}
              style={[
                styles.shortcut,
                selected && styles.shortcutSelected,
                disabled && styles.disabled,
              ]}
              onPress={() => onChange(withCallShortcut(settings, option))}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={SHORTCUT_A11Y[option]}
            >
              <Text style={[styles.shortcutText, selected && styles.shortcutTextSelected]}>
                {SHORTCUT_LABELS[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
              aria-checked={checked}
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
    shortcuts: { flexDirection: 'row', gap: 6 },
    shortcut: {
      flex: 1,
      minHeight: 44,
      borderRadius: 10,
      backgroundColor: t.control,
      alignItems: 'center',
      justifyContent: 'center',
    },
    shortcutSelected: { backgroundColor: t.primary },
    shortcutText: { fontSize: 15, fontWeight: '600', color: t.text },
    shortcutTextSelected: { color: t.onPrimary },
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
