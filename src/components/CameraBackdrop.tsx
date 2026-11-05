import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { CameraFacing } from '../engine';
import { Theme, themed, useTheme } from '../theme';

export interface CameraBackdropProps {
  enabled: boolean;
  facing: CameraFacing;
  /** False while another page is showing: the camera is paused to save battery. */
  active: boolean;
}

/**
 * Full-screen camera preview behind the practice display, so performers can
 * watch their own toss (front camera, mirrored) or prop the phone up facing
 * them with the back camera. Asks for camera access the first time; if it's
 * refused, the screen falls back to the plain background with a way back in.
 */
export function CameraBackdrop({ enabled, facing, active }: CameraBackdropProps) {
  const styles = getStyles(useTheme());
  const [permission, requestPermission] = useCameraPermissions();
  const undecided = permission !== null && !permission.granted && permission.canAskAgain;

  // Camera is on by default: ask once, as soon as the practice screen shows.
  useEffect(() => {
    if (enabled && undecided && permission?.status === 'undetermined') void requestPermission();
  }, [enabled, undecided, permission?.status, requestPermission]);

  if (!enabled || permission === null) return null;

  if (!permission.granted) {
    return (
      <View style={styles.blocked} pointerEvents="box-none">
        <Pressable
          style={styles.allowButton}
          onPress={() =>
            undecided || Platform.OS === 'web'
              ? void requestPermission()
              : void Linking.openSettings()
          }
          accessibilityRole="button"
          accessibilityHint="Shows you on screen while you practice"
        >
          <Text style={styles.allowText}>
            {undecided || Platform.OS === 'web' ? 'Turn on camera' : 'Allow camera in Settings'}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      testID={`camera-preview-${facing}`}
      style={StyleSheet.absoluteFill}
      accessibilityLabel={`${facing === 'front' ? 'Front' : 'Back'} camera preview`}
    >
      <CameraView
        style={StyleSheet.absoluteFill}
        facing={facing}
        active={active}
        mirror={facing === 'front'}
        // Preview only: nothing is recorded or saved.
        mode="picture"
        animateShutter={false}
      />
    </View>
  );
}

const getStyles = themed((t: Theme) =>
  StyleSheet.create({
    blocked: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 120,
    },
    allowButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: t.control,
    },
    allowText: { fontSize: 15, fontWeight: '600', color: t.text },
  }),
);
