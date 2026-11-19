import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import {
  MAX_COUNT_OFF_WORDS,
  MAX_COUNT_OFF_WORD_LENGTH,
  TossSettings,
  countOffSummary,
  customCountOffNote,
  formatCountOffWords,
  parseCountOffWords,
} from '../engine';
import { Theme, themed, useTheme } from '../theme';

export interface CountOffWordsFieldProps {
  words: readonly string[];
  onChange: (words: string[]) => void;
  countIn: number;
  settings: TossSettings;
}

/**
 * The performer's own count-off words (Settings → Phrase → Count it as →
 * Your words): a text field, saved word by word as it's typed, with a note
 * saying which counts the words land on or why they don't fit.
 */
export function CountOffWordsField({
  words,
  onChange,
  countIn,
  settings,
}: CountOffWordsFieldProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  // The text as typed (a trailing space or comma stays while typing); the
  // saved words are the cleaned-up version.
  const [draft, setDraft] = useState(() => formatCountOffWords(words));
  const fits = words.length === 0 || countOffSummary(countIn, settings, 'custom', words) !== null;
  const note = customCountOffNote(words, countIn, settings);

  return (
    <View style={styles.field}>
      <Text style={styles.label} nativeID="count-off-words-label">
        Your count-off words
      </Text>
      <TextInput
        style={[styles.input, fits ? null : styles.inputError]}
        value={draft}
        onChangeText={(text) => {
          setDraft(text);
          onChange(parseCountOffWords(text));
        }}
        onBlur={() => setDraft(formatCountOffWords(parseCountOffWords(draft)))}
        maxLength={MAX_COUNT_OFF_WORDS * (MAX_COUNT_OFF_WORD_LENGTH + 2)}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        placeholder="e.g. hit it"
        placeholderTextColor={theme.textMuted}
        accessibilityLabel="Your count-off words"
        accessibilityHint="One word per count, spoken just before the call"
        accessibilityLabelledBy="count-off-words-label"
        testID="count-off-words"
      />
      <Text
        style={[styles.note, fits ? null : styles.error]}
        accessibilityLiveRegion="polite"
        testID="count-off-words-note"
      >
        {note}
      </Text>
    </View>
  );
}

const getStyles = themed((t: Theme) =>
  StyleSheet.create({
    field: { marginTop: 8 },
    label: { fontSize: 15, color: t.text, marginBottom: 6 },
    input: {
      fontSize: 17,
      color: t.text,
      backgroundColor: t.surface,
      borderWidth: 2,
      borderColor: t.control,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    inputError: { borderColor: t.dangerText },
    note: { fontSize: 14, color: t.textMuted, marginTop: 6 },
    error: { color: t.dangerText },
  }),
);
