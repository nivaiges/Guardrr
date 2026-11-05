import { StyleSheet, Text, View } from 'react-native';

import { CameraSettings as Camera } from '../engine';
import { Theme, themed, useTheme } from '../theme';
import { Segmented, Toggle } from './controls';

const FACINGS = ['front', 'back'] as const;

/** Settings → Camera: preview on/off and which camera. */
export function CameraSettings({
  camera,
  onChange,
}: {
  camera: Camera;
  onChange: (camera: Camera) => void;
}) {
  const styles = getStyles(useTheme());
  return (
    <View style={styles.block}>
      <Text style={styles.heading} accessibilityRole="header">
        Camera
      </Text>
      <Toggle
        label="Show the camera while practicing"
        value={camera.enabled}
        onChange={(enabled) => onChange({ ...camera, enabled })}
      />
      <Segmented
        label="Camera"
        options={[0, 1]}
        value={FACINGS.indexOf(camera.facing)}
        onChange={(i) => onChange({ ...camera, facing: FACINGS[i] })}
        disabled={!camera.enabled}
        optionLabel={(i) => (i === 0 ? 'Front' : 'Back')}
        optionAccessibilityLabel={(i) => (i === 0 ? 'Front camera' : 'Back camera')}
      />
      <Text style={styles.note}>
        Preview only — nothing is recorded. Use the back camera with the phone propped up facing
        you.
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
