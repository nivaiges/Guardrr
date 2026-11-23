import { StyleSheet, Text, View, useColorScheme } from 'react-native';

import {
  APPEARANCE_PREFERENCES,
  AppearancePreference,
  DISPLAY_SIZES,
  DisplaySize,
  appearanceAccessibilityLabel,
  appearanceLabel,
  appearanceNote,
  displaySizeAccessibilityLabel,
  displaySizeLabel,
  displaySizeNote,
} from '../engine';
import { Theme, themed, useTheme } from '../theme';
import { Segmented } from './controls';

/**
 * Settings → Appearance: follow the phone's light/dark setting, or force
 * one; and the practice display's size (Big for across the floor).
 */
export function AppearanceSettings({
  value,
  onChange,
  displaySize,
  onDisplaySizeChange,
}: {
  value: AppearancePreference;
  onChange: (value: AppearancePreference) => void;
  displaySize: DisplaySize;
  onDisplaySizeChange: (value: DisplaySize) => void;
}) {
  const styles = getStyles(useTheme());
  const systemScheme = useColorScheme();
  return (
    <View style={styles.block}>
      <Text style={styles.heading} accessibilityRole="header">
        Appearance
      </Text>
      <Segmented<AppearancePreference>
        label="Theme"
        options={APPEARANCE_PREFERENCES}
        value={value}
        onChange={onChange}
        optionLabel={appearanceLabel}
        optionAccessibilityLabel={appearanceAccessibilityLabel}
        testID="appearance"
      />
      <Text style={styles.note} testID="appearance-note">
        {appearanceNote(value, systemScheme)}
      </Text>
      <View style={styles.gap} />
      <Segmented<DisplaySize>
        label="Practice display"
        options={DISPLAY_SIZES}
        value={displaySize}
        onChange={onDisplaySizeChange}
        optionLabel={displaySizeLabel}
        optionAccessibilityLabel={displaySizeAccessibilityLabel}
        testID="display-size"
      />
      <Text style={styles.note} testID="display-size-note">
        {displaySizeNote(displaySize)}
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
    note: { fontSize: 14, color: t.textMuted, marginTop: 4 },
    gap: { height: 12 },
  }),
);
