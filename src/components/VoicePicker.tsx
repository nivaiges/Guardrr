import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { VoiceInfo, voiceLabel } from '../engine';
import { Theme, themed, useTheme } from '../theme';

export interface VoicePickerProps {
  /** English voices on this phone, best first. */
  voices: readonly VoiceInfo[];
  /** Chosen voice identifier, or null for the system default. */
  value: string | null;
  onChange: (voice: string | null) => void;
  /** Speak a sample with this voice (null = system default). */
  onPreview: (voice: string | null) => void;
  /** Called when the list opens, so it can be re-read. */
  onOpen?: () => void;
  disabled: boolean;
}

/**
 * A row showing the current voice that opens a list: tapping a voice picks
 * it and speaks a sample, so voices can be compared by ear.
 */
export function VoicePicker({
  voices,
  value,
  onChange,
  onPreview,
  onOpen,
  disabled,
}: VoicePickerProps) {
  const styles = getStyles(useTheme());
  const [open, setOpen] = useState(false);
  const current = value ? voices.find((v) => v.identifier === value) : undefined;
  const currentLabel = current
    ? voiceLabel(current)
    : value && voices.length === 0
      ? 'Saved voice'
      : 'System default';
  const toggle = () => {
    if (!open) onOpen?.();
    setOpen(!open);
  };
  const choose = (id: string | null) => {
    onChange(id);
    onPreview(id);
  };
  const options: { id: string | null; label: string }[] = [
    { id: null, label: 'System default' },
    ...voices.map((v) => ({ id: v.identifier, label: voiceLabel(v) })),
  ];

  return (
    <View>
      <Pressable
        style={[styles.row, disabled && styles.disabled]}
        onPress={toggle}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Voice: ${currentLabel}`}
        accessibilityHint={open ? 'Closes the voice list' : 'Opens the list of voices'}
        accessibilityState={{ disabled, expanded: open }}
      >
        <Text style={styles.label}>Voice</Text>
        <Text style={styles.value} numberOfLines={1}>
          {currentLabel} {open ? '▴' : '▾'}
        </Text>
      </Pressable>
      {open && !disabled ? (
        <ScrollView
          style={styles.list}
          nestedScrollEnabled
          accessibilityRole="radiogroup"
          accessibilityLabel="Voices"
        >
          {options.map((o) => {
            const selected = o.id === (current ? value : null);
            return (
              <Pressable
                key={o.id ?? 'default'}
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.optionSelected,
                  pressed && styles.optionPressed,
                ]}
                onPress={() => choose(o.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={o.label}
                accessibilityHint="Selects this voice and speaks a sample call"
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
          {voices.length === 0 ? (
            <Text style={styles.empty}>
              No other English voices found. Add voices in your phone&apos;s text-to-speech
              settings, then reopen this list.
            </Text>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}

const getStyles = themed((t: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      gap: 12,
    },
    label: { fontSize: 16, color: t.text },
    value: { fontSize: 16, fontWeight: '600', color: t.text, flexShrink: 1 },
    disabled: { opacity: 0.4 },
    list: { maxHeight: 320, borderRadius: 12, backgroundColor: t.control },
    option: { paddingVertical: 12, paddingHorizontal: 14 },
    optionSelected: { backgroundColor: t.primary },
    optionPressed: { backgroundColor: t.controlPressed },
    optionText: { fontSize: 16, color: t.text },
    optionTextSelected: { color: t.onPrimary, fontWeight: '600' },
    empty: { fontSize: 14, color: t.textMuted, padding: 14 },
  }),
);
