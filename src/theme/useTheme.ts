import { useColorScheme } from 'react-native';

import { Theme, themeFor } from './colors';

/** The palette for the system appearance (light/dark), updating live. */
export function useTheme(): Theme {
  return themeFor(useColorScheme());
}

/**
 * Wrap a `(theme) => StyleSheet.create(...)` factory so each theme's styles
 * are built once, not on every render.
 */
export function themed<T>(factory: (theme: Theme) => T): (theme: Theme) => T {
  const cache = new Map<Theme, T>();
  return (theme) => {
    let styles = cache.get(theme);
    if (styles === undefined) {
      styles = factory(theme);
      cache.set(theme, styles);
    }
    return styles;
  };
}
