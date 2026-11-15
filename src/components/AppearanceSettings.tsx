import { StyleSheet, Text, View, useColorScheme } from 'react-native';

import {
  APPEARANCE_PREFERENCES,
  AppearancePreference,
  appearanceAccessibilityLabel,
  appearanceLabel,
  appearanceNote,
} from '../engine';
import { Theme, themed, useTheme } from '../theme';
import { Segmented } from './controls';

/** Settings → Appearance: follow the phone's light/dark setting, or force one. */
export function AppearanceSettings({
  value,
  onChange,
}: {
  value: AppearancePreference;
  onChange: (value: AppearancePreference) => void;
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
  }),
);
