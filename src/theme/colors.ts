/**
 * Light and dark palettes. Every color the UI uses comes from here so the
 * two themes stay in sync; `colors.test.ts` checks their contrast.
 */

import type { DisplayPhase } from '../engine';

export interface Theme {
  dark: boolean;
  /** Screen background. */
  background: string;
  /** Cards and the practice display at rest. */
  surface: string;
  /** Buttons, chips, stepper buttons. */
  control: string;
  controlPressed: string;
  text: string;
  /** Secondary text (labels, hints). */
  textMuted: string;
  primary: string;
  onPrimary: string;
  danger: string;
  warningBackground: string;
  warningText: string;
  /** Empty bar/track behind progress bars. */
  track: string;
  /** Practice display background per phase. */
  phase: Record<DisplayPhase, string>;
  /** Phrase-strip dots. */
  marker: { release: string; catch: string; call: string; idle: string };
}

export const lightTheme: Theme = {
  dark: false,
  background: '#ffffff',
  surface: '#f1f3f6',
  control: '#e2e6ec',
  controlPressed: '#c9d1dc',
  text: '#16191d',
  textMuted: '#57606a',
  primary: '#1f6feb',
  onPrimary: '#ffffff',
  danger: '#cf222e',
  warningBackground: '#fff4d6',
  warningText: '#5c4400',
  track: '#d5dae1',
  phase: {
    ready: '#f1f3f6',
    'lead-in': '#f1f3f6',
    release: '#ffd76a',
    'in-air': '#dbe9ff',
    catch: '#b4efbe',
    marking: '#f1f3f6',
  },
  marker: { release: '#b07d00', catch: '#1a7f37', call: '#1f6feb', idle: '#77808a' },
};

export const darkTheme: Theme = {
  dark: true,
  background: '#0d1117',
  surface: '#161b22',
  control: '#262c36',
  controlPressed: '#3a414c',
  text: '#f0f3f6',
  textMuted: '#9da7b3',
  primary: '#1f6feb',
  onPrimary: '#ffffff',
  danger: '#cf222e',
  warningBackground: '#3b2e00',
  warningText: '#f2cc60',
  track: '#21262d',
  phase: {
    ready: '#161b22',
    'lead-in': '#161b22',
    release: '#4a3700',
    'in-air': '#132c52',
    catch: '#0b3d1e',
    marking: '#161b22',
  },
  marker: { release: '#e3b341', catch: '#3fb950', call: '#58a6ff', idle: '#6e7681' },
};

export function themeFor(scheme: string | null | undefined): Theme {
  return scheme === 'dark' ? darkTheme : lightTheme;
}
