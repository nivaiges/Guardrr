import { StyleSheet, View } from 'react-native';

import { PAGES, PageIndex, pageDotsLabel } from '../engine';
import { Theme, themed, useTheme } from '../theme';

/** Which of the two pages is showing, as dots at the bottom of the screen. */
export function PageDots({ page }: { page: PageIndex }) {
  const styles = getStyles(useTheme());
  return (
    <View
      style={styles.pill}
      pointerEvents="none"
      testID="page-dots"
      accessible
      accessibilityRole="text"
      accessibilityLabel={pageDotsLabel(page)}
    >
      {PAGES.map((name, i) => (
        <View key={name} style={[styles.dot, i === page && styles.dotActive]} />
      ))}
    </View>
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
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.textMuted, opacity: 0.45 },
    dotActive: { backgroundColor: t.text, opacity: 1 },
  }),
);
