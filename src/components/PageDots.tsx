import { Pressable, StyleSheet, View } from 'react-native';

import { PAGES, PageIndex, pageDotsHint, pageDotsLabel } from '../engine';
import { Theme, themed, useTheme } from '../theme';

/**
 * Which of the two pages is showing, as dots at the bottom of the screen.
 * Tapping them switches to the other page (one target for both dots, so it
 * is easy to hit without looking).
 */
export function PageDots({ page, onPress }: { page: PageIndex; onPress?: () => void }) {
  const styles = getStyles(useTheme());
  return (
    <Pressable
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={8}
      testID="page-dots"
      accessibilityRole="button"
      accessibilityLabel={pageDotsLabel(page)}
      accessibilityHint={onPress ? pageDotsHint(page) : undefined}
    >
      {PAGES.map((name, i) => (
        <View key={name} style={[styles.dot, i === page && styles.dotActive]} />
      ))}
    </Pressable>
  );
}

const getStyles = themed((t: Theme) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderRadius: 10,
      backgroundColor: t.background + 'CC',
    },
    pressed: { opacity: 0.6 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.textMuted, opacity: 0.45 },
    dotActive: { backgroundColor: t.text, opacity: 1 },
  }),
);
