/**
 * Settings → Calls → "Say calls as": counts ("two and") or rotation names
 * ("double"). With rotations, each name gets a stepper for the count it's
 * caught on, and "Use these calls" practices only the named calls.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  CALL_NAMINGS,
  CallNaming,
  DEFAULT_CALL_NAMING,
  DEFAULT_ROTATION_MAP,
  ROTATIONS,
  ROTATION_CALL_CHOICES,
  RotationMap,
  TossSettings,
  callLabel,
  callNamingLabel,
  displayLabelForCall,
  rotationCalls,
  rotationChoiceIndex,
  rotationChoiceLimits,
  rotationLabel,
  unnamedCallsNote,
  usesRotationCalls,
  withRotationCalls,
  withRotationChoice,
} from '../engine';
import { Theme, themed, useTheme } from '../theme';
import { Segmented, Stepper } from './controls';

export interface RotationNamesSettingsProps {
  naming: CallNaming | undefined;
  map: RotationMap | undefined;
  onChange: (naming: CallNaming, map: RotationMap) => void;
  settings: TossSettings;
  onSettingsChange: (settings: TossSettings) => void;
}

const NAMING_A11Y: Record<CallNaming, string> = {
  counts: 'Say calls as counts, for example "two and"',
  rotations: 'Say calls as rotations, for example "double"',
};

export function RotationNamesSettings({
  naming = DEFAULT_CALL_NAMING,
  map = DEFAULT_ROTATION_MAP,
  onChange,
  settings,
  onSettingsChange,
}: RotationNamesSettingsProps) {
  const styles = getStyles(useTheme());
  const named = rotationCalls(map, settings.phraseLength);
  const using = usesRotationCalls(settings, map);
  const unnamed = naming === 'rotations' ? unnamedCallsNote(settings, map, callLabel) : null;
  const longer = ROTATIONS.length - named.length;
  return (
    <View testID="rotation-names">
      <Segmented<CallNaming>
        label="Say calls as"
        options={CALL_NAMINGS}
        value={naming}
        onChange={(next) => onChange(next, map)}
        optionLabel={callNamingLabel}
        optionAccessibilityLabel={(n) => NAMING_A11Y[n]}
        testID="call-naming"
      />
      {naming === 'counts' ? (
        <Text style={styles.note}>
          Calls are counts: &quot;five&quot; is caught on 5. Pick Rotations to hear
          &quot;double&quot; instead.
        </Text>
      ) : (
        <>
          <Text style={styles.note}>
            Set the count each toss is caught on at your tempo. The voice says the name, the screen
            still shows the catch count.
          </Text>
          {ROTATIONS.map((rotation) => {
            const { min, max } = rotationChoiceLimits(map, rotation);
            const name = rotationLabel(rotation);
            return (
              <Stepper
                key={rotation}
                label={name}
                value={rotationChoiceIndex(map, rotation)}
                min={min}
                max={max}
                format={(i) => displayLabelForCall(ROTATION_CALL_CHOICES[i])}
                stepLabels={{ minus: `${name} earlier`, plus: `${name} later` }}
                onChange={(i) => onChange(naming, withRotationChoice(map, rotation, i))}
              />
            );
          })}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              using && styles.buttonSelected,
              pressed && !using && styles.buttonPressed,
            ]}
            onPress={() => onSettingsChange(withRotationCalls(settings, map))}
            disabled={using || named.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Use these calls"
            accessibilityHint="Practice only the named tosses"
            accessibilityState={{ disabled: using || named.length === 0 }}
            testID="use-rotation-calls"
          >
            <Text style={[styles.buttonText, using && styles.buttonTextSelected]}>
              {using ? 'Practicing these calls' : 'Use these calls'}
            </Text>
          </Pressable>
          {longer > 0 ? (
            <Text style={styles.note}>
              {longer === 1 ? 'One name needs' : `${longer} names need`} a longer phrase.
            </Text>
          ) : null}
          {unnamed ? (
            <Text style={styles.note} testID="unnamed-calls-note">
              {unnamed}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const getStyles = themed((t: Theme) =>
  StyleSheet.create({
    note: { fontSize: 14, color: t.textMuted, marginBottom: 4 },
    button: {
      marginTop: 4,
      marginBottom: 4,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: t.control,
      alignItems: 'center',
    },
    buttonPressed: { backgroundColor: t.controlPressed },
    buttonSelected: { backgroundColor: t.primary },
    buttonText: { fontSize: 16, fontWeight: '700', color: t.text },
    buttonTextSelected: { color: t.onPrimary },
  }),
);
