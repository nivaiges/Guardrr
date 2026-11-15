/**
 * Appearance: follow the phone's light/dark setting, or force one.
 *
 * A performer may want the dark theme in a bright gym (less glare on the
 * practice display at night, or to save battery on OLED) without switching
 * the whole phone to dark mode, or the light theme outdoors in sunlight.
 */

export type AppearancePreference = 'system' | 'light' | 'dark';

/** In the order the Settings chips show them. */
export const APPEARANCE_PREFERENCES: readonly AppearancePreference[] = ['system', 'light', 'dark'];

export const DEFAULT_APPEARANCE: AppearancePreference = 'system';

export function isAppearancePreference(value: unknown): value is AppearancePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

/** Chip text: "System", "Light", "Dark". */
export function appearanceLabel(preference: AppearancePreference): string {
  return preference === 'system' ? 'System' : preference === 'light' ? 'Light' : 'Dark';
}

/** Screen-reader label of each chip. */
export function appearanceAccessibilityLabel(preference: AppearancePreference): string {
  return preference === 'system'
    ? "Match the phone's appearance"
    : preference === 'light'
      ? 'Always light'
      : 'Always dark';
}

/**
 * Whether to show the dark theme, given the preference and the phone's
 * current color scheme (`useColorScheme()`: 'light', 'dark', or null/
 * 'unspecified' when the platform doesn't say, which means light).
 */
export function resolveDark(
  preference: AppearancePreference,
  systemScheme: string | null | undefined,
): boolean {
  if (preference === 'system') return systemScheme === 'dark';
  return preference === 'dark';
}

/** The note under the chips, saying what "System" currently resolves to. */
export function appearanceNote(
  preference: AppearancePreference,
  systemScheme: string | null | undefined,
): string {
  if (preference !== 'system') return 'Sounds, haptics and the camera are unaffected.';
  return `Following the phone: ${systemScheme === 'dark' ? 'dark' : 'light'} right now.`;
}
