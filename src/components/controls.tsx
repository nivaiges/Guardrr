/** Small, accessible form controls for the settings panel (core RN only). */

import { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.control}>{children}</View>
    </View>
  );
}

function StepButton({
  text,
  onPress,
  disabled,
  accessibilityLabel,
}: {
  text: string;
  onPress: () => void;
  disabled: boolean;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      style={[styles.stepButton, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={6}
    >
      <Text style={styles.stepText}>{text}</Text>
    </Pressable>
  );
}

export interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Extra coarse step shown as an outer pair of buttons (e.g. 5 for BPM). */
  bigStep?: number;
  format?: (value: number) => string;
  disabled?: boolean;
}

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  bigStep,
  format = String,
  disabled = false,
}: StepperProps) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <Row label={label}>
      {bigStep ? (
        <StepButton
          text={`−${bigStep}`}
          onPress={() => set(value - bigStep)}
          disabled={disabled || value <= min}
          accessibilityLabel={`${label} minus ${bigStep}`}
        />
      ) : null}
      <StepButton
        text="−"
        onPress={() => set(value - 1)}
        disabled={disabled || value <= min}
        accessibilityLabel={`${label} minus 1`}
      />
      <Text
        style={styles.value}
        accessibilityLabel={`${label}: ${format(value)}`}
        accessibilityLiveRegion="polite"
      >
        {format(value)}
      </Text>
      <StepButton
        text="+"
        onPress={() => set(value + 1)}
        disabled={disabled || value >= max}
        accessibilityLabel={`${label} plus 1`}
      />
      {bigStep ? (
        <StepButton
          text={`+${bigStep}`}
          onPress={() => set(value + bigStep)}
          disabled={disabled || value >= max}
          accessibilityLabel={`${label} plus ${bigStep}`}
        />
      ) : null}
    </Row>
  );
}

export function Toggle({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Row label={label}>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={label}
      />
    </Row>
  );
}

export function Segmented({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: readonly number[];
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.segmentedBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              style={[
                styles.segment,
                selected && styles.segmentSelected,
                disabled && styles.disabled,
              ]}
              onPress={() => onChange(option)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={`${option} counts`}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 12,
  },
  label: { fontSize: 16, color: '#222', flexShrink: 1 },
  control: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepButton: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: '#e2e6ec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 18, fontWeight: '600' },
  value: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 56,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  disabled: { opacity: 0.4 },
  segmentedBlock: { paddingVertical: 8, gap: 8 },
  segmented: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segment: {
    minWidth: 48,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#e2e6ec',
    alignItems: 'center',
  },
  segmentSelected: { backgroundColor: '#1f6feb' },
  segmentText: { fontSize: 16, fontWeight: '600', color: '#222' },
  segmentTextSelected: { color: '#fff' },
});
