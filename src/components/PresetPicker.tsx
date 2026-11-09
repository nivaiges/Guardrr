import { useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Theme, themed, useTheme } from '../theme';
import {
  ChangePresetResult,
  DeletedPreset,
  MAX_CUSTOM_PRESETS,
  MAX_PRESET_NAME_LENGTH,
  PracticePreset,
  PracticeSettings,
  PresetMove,
  SavePresetResult,
  allPresets,
  canSavePreset,
  isCustomPreset,
  matchingAnyPreset,
  presetMoves,
  presetNameMessage,
  presetUpdateOffer,
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
  onRename: (id: string, name: string) => ChangePresetResult;
  /** Overwrite a custom preset with the current tempo and toss settings. */
  onUpdate: (id: string) => ChangePresetResult;
  /** Swap a custom preset with its neighbour in the chip row. */
  onMove?: (id: string, direction: PresetMove) => void;
  /**
   * Lock applying presets (saving, renaming and deleting stay available).
   * Not used while practicing any more: a preset applied mid-practice starts
   * with the next toss that hasn't been called, like any settings change.
   */
  disabled?: boolean;
}

/**
 * One-tap practice setups, built-in and the performer's own. The preset the
 * settings still match is highlighted; settings that match none can be
 * saved under a name, and a selected custom preset can be renamed, moved
 * earlier or later, or deleted (with Undo). A custom preset can be updated in place: with a new tempo
 * while its settings still match, or with tweaked settings after it was
 * applied here.
 */
export function PresetPicker({
  settings,
  customPresets,
  onApply,
  onSave,
  onDelete,
  onRestore,
  onRename,
  onUpdate,
  onMove,
  disabled = false,
}: PresetPickerProps) {
  const styles = getStyles(useTheme());
  const theme = useTheme();
  const current = matchingAnyPreset(settings, customPresets);
  // The open name form: saving the settings as a new preset, or renaming one.
  const [form, setForm] = useState<{ mode: 'save' } | { mode: 'rename'; id: string } | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<DeletedPreset | null>(null);
  // The custom preset applied (or saved) last, so tweaks can be written back to it.
  const [lastCustomId, setLastCustomId] = useState<string | null>(null);
  const savable = canSavePreset(settings, customPresets);
  const offer = presetUpdateOffer(settings, customPresets, lastCustomId);
  const naming = form?.mode === 'save' && !current;
  const renaming = form?.mode === 'rename' && current?.id === form.id;

  const apply = (preset: PracticePreset) => {
    setLastCustomId(isCustomPreset(preset) ? preset.id : null);
    setForm(null);
    onApply(preset);
  };
  const openForm = (next: { mode: 'save' } | { mode: 'rename'; id: string }, prefill: string) => {
    setName(prefill);
    setError(null);
    setForm(next);
  };
  const closeForm = () => {
    setForm(null);
    setError(null);
  };
  const showNameError = (problem: string | null) => {
    if (problem === 'empty' || problem === 'taken') {
      setError(presetNameMessage(problem));
      return true;
    }
    return false;
  };
  const save = () => {
    const result = onSave(name);
    if (result.saved) {
      closeForm();
      setDeleted(null);
      setLastCustomId(result.saved.id);
      AccessibilityInfo.announceForAccessibility(`Saved preset ${result.saved.name}`);
    } else if (!showNameError(result.problem)) {
      // The settings changed or the list filled up meanwhile; nothing to save.
      closeForm();
    }
  };
  const rename = () => {
    if (form?.mode !== 'rename') return;
    const result = onRename(form.id, name);
    if (result.changed) {
      closeForm();
      AccessibilityInfo.announceForAccessibility(`Renamed preset to ${result.changed.name}`);
    } else if (!showNameError(result.problem)) {
      closeForm();
    }
  };
  const update = () => {
    if (!offer) return;
    const result = onUpdate(offer.preset.id);
    if (result.changed) {
      setLastCustomId(result.changed.id);
      AccessibilityInfo.announceForAccessibility(`Updated preset ${result.changed.name}`);
    }
  };
  const remove = (preset: PracticePreset) => {
    const gone = onDelete(preset.id);
    if (!gone) return;
    setDeleted(gone);
    closeForm();
    AccessibilityInfo.announceForAccessibility(`Deleted preset ${preset.name}. Undo is available.`);
  };
  const move = (preset: PracticePreset, direction: PresetMove) => {
    if (!onMove) return;
    onMove(preset.id, direction);
    const index = customPresets.findIndex((p) => p.id === preset.id);
    const place = index + (direction === 'earlier' ? 0 : 2);
    AccessibilityInfo.announceForAccessibility(
      `Moved ${preset.name} ${direction}: ${place} of ${customPresets.length} of your presets`,
    );
  };
  const moves = current && onMove ? presetMoves(customPresets, current.id) : [];
  const undo = () => {
    if (deleted) onRestore(deleted);
    setDeleted(null);
  };

  let note: string;
  if (current) note = `${current.description} · ${current.bpm} BPM to start`;
  else if (offer)
    note = `Changed from “${offer.preset.name}” — update it, or save these as a new preset.`;
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
              onPress={() => apply(preset)}
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

      {current && isCustomPreset(current) && !renaming ? (
        <View style={styles.linkRow}>
          <Pressable
            style={styles.linkButton}
            testID="preset-rename"
            onPress={() => openForm({ mode: 'rename', id: current.id }, current.name)}
            accessibilityRole="button"
            accessibilityLabel={`Rename preset ${current.name}`}
            hitSlop={8}
          >
            <Text style={styles.linkText}>Rename</Text>
          </Pressable>
          {moves.map((direction) => (
            <Pressable
              key={direction}
              style={styles.linkButton}
              testID={`preset-move-${direction}`}
              onPress={() => move(current, direction)}
              accessibilityRole="button"
              accessibilityLabel={`Move preset ${current.name} ${direction}`}
              hitSlop={8}
            >
              <Text style={styles.linkText}>
                {direction === 'earlier' ? '‹ Move earlier' : 'Move later ›'}
              </Text>
            </Pressable>
          ))}
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
        </View>
      ) : null}

      {(offer || (!current && savable)) && !naming && !renaming ? (
        <View style={styles.buttonRow}>
          {offer ? (
            <Pressable
              style={styles.button}
              testID="preset-update"
              onPress={update}
              accessibilityRole="button"
              accessibilityLabel={
                offer.kind === 'tempo'
                  ? `Save ${settings.bpm} BPM to preset ${offer.preset.name}`
                  : `Update preset ${offer.preset.name} with these settings`
              }
            >
              <Text style={styles.buttonText} numberOfLines={1}>
                {offer.kind === 'tempo'
                  ? `Save ${settings.bpm} BPM to “${offer.preset.name}”`
                  : `Update “${offer.preset.name}”`}
              </Text>
            </Pressable>
          ) : null}
          {!current && savable ? (
            <Pressable
              style={styles.button}
              testID="preset-save"
              onPress={() => openForm({ mode: 'save' }, suggestPresetName(customPresets))}
              accessibilityRole="button"
              accessibilityLabel="Save as preset"
              accessibilityHint="Saves the tempo, phrase and calls under a name"
            >
              <Text style={styles.buttonText}>{offer ? 'Save as new…' : 'Save as preset…'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {naming || renaming ? (
        <View style={styles.form}>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError(null);
            }}
            testID="preset-name"
            onSubmitEditing={renaming ? rename : save}
            maxLength={MAX_PRESET_NAME_LENGTH}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            placeholder="Preset name"
            placeholderTextColor={theme.textMuted}
            accessibilityLabel={renaming ? 'New preset name' : 'Preset name'}
          />
          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, styles.primaryButton]}
              testID="preset-save-confirm"
              onPress={renaming ? rename : save}
              accessibilityRole="button"
              accessibilityLabel={renaming ? 'Rename preset' : 'Save preset'}
            >
              <Text style={[styles.buttonText, styles.primaryButtonText]}>
                {renaming ? 'Rename' : 'Save'}
              </Text>
            </Pressable>
            <Pressable style={styles.button} onPress={closeForm} accessibilityRole="button">
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
    linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 8 },
    linkButton: { paddingVertical: 4 },
    linkText: { fontSize: 15, fontWeight: '600', color: t.text, textDecorationLine: 'underline' },
    deleteText: { fontSize: 15, fontWeight: '600', color: t.dangerText },
    button: {
      flexShrink: 1,
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
    buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
