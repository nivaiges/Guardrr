import { useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Theme, themed, useTheme } from '../theme';
import {
  DeletedPreset,
  MAX_CUSTOM_PRESETS,
  MAX_PRESET_NAME_LENGTH,
  PracticePreset,
  PracticeSettings,
  SavePresetResult,
  allPresets,
  canSavePreset,
  isCustomPreset,
  matchingAnyPreset,
  presetNameMessage,
  suggestPresetName,
} from '../engine';

export interface PresetPickerProps {
  settings: PracticeSettings;
  /** The performer's own presets, shown after the built-in ones. */
  customPresets: readonly PracticePreset[];
  onApply: (preset: PracticePreset) => void;
  onSave: (name: string) => SavePresetResult;
  onDelete: (id: string) => DeletedPreset | null;
  onRestore: (deleted: DeletedPreset) => void;
  /**
   * Presets change the phrase and calls, so applying one is locked while
   * practicing. Saving and deleting don't touch the running settings and
   * stay available.
   */
  disabled?: boolean;
}

/**
 * One-tap practice setups, built-in and the performer's own. The preset the
 * settings still match is highlighted; settings that match none can be
 * saved under a name, and a selected custom preset can be deleted (with Undo).
 */
export function PresetPicker({
  settings,
  customPresets,
  onApply,
  onSave,
  onDelete,
  onRestore,
  disabled = false,
}: PresetPickerProps) {
  const styles = getStyles(useTheme());
  const theme = useTheme();
  const current = matchingAnyPreset(settings, customPresets);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<DeletedPreset | null>(null);
  const savable = canSavePreset(settings, customPresets);

  const startNaming = () => {
    setName(suggestPresetName(customPresets));
    setError(null);
    setNaming(true);
  };
  const cancelNaming = () => {
    setNaming(false);
    setError(null);
  };
  const save = () => {
    const result = onSave(name);
    if (result.saved) {
      setNaming(false);
      setError(null);
      setDeleted(null);
      AccessibilityInfo.announceForAccessibility(`Saved preset ${result.saved.name}`);
    } else if (result.problem === 'empty' || result.problem === 'taken') {
      setError(presetNameMessage(result.problem));
    } else {
      // The settings changed or the list filled up meanwhile; nothing to save.
      setNaming(false);
    }
  };
  const remove = (preset: PracticePreset) => {
    const gone = onDelete(preset.id);
    if (!gone) return;
    setDeleted(gone);
    AccessibilityInfo.announceForAccessibility(`Deleted preset ${preset.name}. Undo is available.`);
  };
  const undo = () => {
    if (deleted) onRestore(deleted);
    setDeleted(null);
  };

  let note: string;
  if (current) note = `${current.description} · ${current.bpm} BPM to start`;
  else if (savable) note = 'Custom settings — save them to come back to them in one tap.';
  else
    note = `Custom settings. You have ${MAX_CUSTOM_PRESETS} presets of your own — delete one to save these.`;

  return (
    <View style={styles.block}>
      <Text style={styles.heading} accessibilityRole="header">
        Presets
      </Text>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Presets">
        {allPresets(customPresets).map((preset) => {
          const selected = preset.id === current?.id;
          const custom = isCustomPreset(preset);
          return (
            <Pressable
              key={preset.id}
              style={[
                styles.chip,
                custom && styles.chipCustom,
                selected && styles.chipSelected,
                disabled && styles.disabled,
              ]}
              onPress={() => onApply(preset)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              aria-checked={selected}
              accessibilityLabel={custom ? `${preset.name}, your preset` : preset.name}
              accessibilityHint={`${preset.description}, ${preset.bpm} BPM`}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {preset.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.description}>{note}</Text>

      {current && isCustomPreset(current) ? (
        <Pressable
          style={styles.linkButton}
          testID="preset-delete"
          onPress={() => remove(current)}
          accessibilityRole="button"
          accessibilityLabel={`Delete preset ${current.name}`}
          hitSlop={8}
        >
          <Text style={styles.deleteText}>Delete “{current.name}”</Text>
        </Pressable>
      ) : null}

      {!current && savable && !naming ? (
        <Pressable
          style={styles.button}
          testID="preset-save"
          onPress={startNaming}
          accessibilityRole="button"
          accessibilityLabel="Save as preset"
          accessibilityHint="Saves the tempo, phrase and calls under a name"
        >
          <Text style={styles.buttonText}>Save as preset…</Text>
        </Pressable>
      ) : null}

      {naming && !current ? (
        <View style={styles.form}>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError(null);
            }}
            testID="preset-name"
            onSubmitEditing={save}
            maxLength={MAX_PRESET_NAME_LENGTH}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            placeholder="Preset name"
            placeholderTextColor={theme.textMuted}
            accessibilityLabel="Preset name"
          />
          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <View style={styles.formButtons}>
            <Pressable
              style={[styles.button, styles.primaryButton]}
              testID="preset-save-confirm"
              onPress={save}
              accessibilityRole="button"
              accessibilityLabel="Save preset"
            >
              <Text style={[styles.buttonText, styles.primaryButtonText]}>Save</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={cancelNaming} accessibilityRole="button">
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {deleted ? (
        <View style={styles.undoBar}>
          <Text style={styles.undoText} numberOfLines={1}>
            Deleted “{deleted.preset.name}”
          </Text>
          <Pressable
            testID="preset-undo"
            onPress={undo}
            accessibilityRole="button"
            accessibilityLabel={`Undo delete ${deleted.preset.name}`}
            hitSlop={8}
          >
            <Text style={styles.undoButton}>Undo</Text>
          </Pressable>
        </View>
      ) : null}
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
      borderWidth: 2,
      borderColor: t.control,
      backgroundColor: t.control,
    },
    // The performer's own presets: outlined, so they read as "yours" at a glance.
    chipCustom: { backgroundColor: t.background, borderColor: t.textMuted },
    chipSelected: { backgroundColor: t.primary, borderColor: t.primary },
    chipText: { fontSize: 15, fontWeight: '600', color: t.text },
    chipTextSelected: { color: t.onPrimary },
    disabled: { opacity: 0.4 },
    description: { fontSize: 14, color: t.textMuted, marginTop: 8 },
    linkButton: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 4 },
    deleteText: { fontSize: 15, fontWeight: '600', color: t.dangerText },
    button: {
      alignSelf: 'flex-start',
      marginTop: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: t.control,
    },
    buttonText: { fontSize: 15, fontWeight: '600', color: t.text },
    primaryButton: { backgroundColor: t.primary },
    primaryButtonText: { color: t.onPrimary },
    form: { marginTop: 10 },
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
    error: { fontSize: 14, color: t.dangerText, marginTop: 6 },
    formButtons: { flexDirection: 'row', gap: 8 },
    undoBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 10,
      padding: 8,
      paddingLeft: 12,
      borderRadius: 12,
      backgroundColor: t.control,
    },
    undoText: { flexShrink: 1, fontSize: 14, color: t.text },
    // Same look as History's Undo: underlined text, AA on the control color in both themes.
    undoButton: {
      fontSize: 15,
      fontWeight: '700',
      color: t.text,
      textDecorationLine: 'underline',
      paddingHorizontal: 6,
      paddingVertical: 8,
    },
  }),
);
