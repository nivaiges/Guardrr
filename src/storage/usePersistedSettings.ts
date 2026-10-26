import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { DEFAULT_PRACTICE_SETTINGS, PracticeSettings } from '../engine';
import { SettingsStore, createSettingsStore } from './settingsStore';

export interface PersistedSettings {
  settings: PracticeSettings;
  setSettings: (update: (previous: PracticeSettings) => PracticeSettings) => void;
  /** False until the saved settings have been read (defaults are shown meanwhile). */
  loaded: boolean;
}

/**
 * Practice settings that survive app restarts. Starts with the defaults,
 * swaps in the saved settings once read, and saves every change (debounced,
 * flushed when the app goes to the background).
 */
export function usePersistedSettings(): PersistedSettings {
  const store = useRef<SettingsStore | null>(null);
  const [settings, setState] = useState<PracticeSettings>(DEFAULT_PRACTICE_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const touched = useRef(false);

  useEffect(() => {
    const s = createSettingsStore({
      backend: AsyncStorage,
      onError: (e) => console.warn('Guardrr: could not access saved settings', e),
    });
    store.current = s;
    let cancelled = false;
    void s.load().then((saved) => {
      if (cancelled) return;
      // Don't overwrite a change the user already made while loading.
      if (!touched.current) setState(saved);
      setLoaded(true);
    });
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void s.flush();
    });
    return () => {
      cancelled = true;
      sub.remove();
      void s.flush();
    };
  }, []);

  // Save user changes (not the initial defaults or the loaded settings).
  useEffect(() => {
    if (touched.current) store.current?.save(settings);
  }, [settings]);

  const setSettings = useCallback((update: (previous: PracticeSettings) => PracticeSettings) => {
    touched.current = true;
    setState(update);
  }, []);

  return { settings, setSettings, loaded };
}
