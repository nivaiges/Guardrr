/**
 * Loads and saves PracticeSettings through a key-value backend
 * (AsyncStorage in the app, an in-memory map in tests).
 *
 * Saves are debounced so dragging through BPM steps or tapping tempo
 * writes once, and storage errors are reported but never thrown: losing a
 * save must not stop practice.
 */

import {
  PracticeSettings,
  SETTINGS_STORAGE_KEY,
  parseStoredSettings,
  serializeSettings,
} from '../engine';

export interface KeyValueBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface SettingsStoreOptions {
  backend: KeyValueBackend;
  /** Wait this long after the last change before writing. Default 500 ms. */
  debounceMs?: number;
  onError?: (error: unknown) => void;
}

export interface SettingsStore {
  load(): Promise<PracticeSettings>;
  /** Schedule a (debounced) save. */
  save(settings: PracticeSettings): void;
  /** Write any pending save now. */
  flush(): Promise<void>;
}

export function createSettingsStore(options: SettingsStoreOptions): SettingsStore {
  const { backend, debounceMs = 500, onError } = options;
  let pending: PracticeSettings | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastWritten: string | null = null;

  async function write(): Promise<void> {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!pending) return;
    const json = serializeSettings(pending);
    pending = null;
    if (json === lastWritten) return;
    try {
      await backend.setItem(SETTINGS_STORAGE_KEY, json);
      lastWritten = json;
    } catch (error) {
      onError?.(error);
    }
  }

  return {
    async load() {
      try {
        const json = await backend.getItem(SETTINGS_STORAGE_KEY);
        lastWritten = json;
        return parseStoredSettings(json);
      } catch (error) {
        onError?.(error);
        return parseStoredSettings(null);
      }
    },
    save(settings) {
      pending = settings;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void write(), debounceMs);
    },
    flush: write,
  };
}
