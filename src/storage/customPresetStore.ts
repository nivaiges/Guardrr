/**
 * Loads and saves the performer's own presets (see engine/customPresets.ts)
 * through a key-value backend (AsyncStorage in the app, a map in tests).
 *
 * Presets change rarely (Save / Delete / Undo), so each change writes right
 * away; writes run one at a time in order so an older list can never land
 * after a newer one. Errors are reported, never thrown.
 */

import {
  CUSTOM_PRESETS_STORAGE_KEY,
  PracticePreset,
  parseStoredCustomPresets,
  serializeCustomPresets,
} from '../engine';
import { KeyValueBackend } from './settingsStore';

export interface CustomPresetStoreOptions {
  backend: KeyValueBackend;
  onError?: (error: unknown) => void;
}

export interface CustomPresetStore {
  load(): Promise<PracticePreset[]>;
  /** Write the whole list; resolves once this (and any earlier) write is done. */
  save(presets: readonly PracticePreset[]): Promise<void>;
}

export function createCustomPresetStore(options: CustomPresetStoreOptions): CustomPresetStore {
  const { backend, onError } = options;
  let queue: Promise<void> = Promise.resolve();
  let lastWritten: string | null = null;

  return {
    async load() {
      try {
        const json = await backend.getItem(CUSTOM_PRESETS_STORAGE_KEY);
        lastWritten = json;
        return parseStoredCustomPresets(json);
      } catch (error) {
        onError?.(error);
        return [];
      }
    },
    save(presets) {
      const json = serializeCustomPresets(presets);
      queue = queue.then(async () => {
        if (json === lastWritten) return;
        try {
          await backend.setItem(CUSTOM_PRESETS_STORAGE_KEY, json);
          lastWritten = json;
        } catch (error) {
          onError?.(error);
        }
      });
      return queue;
    },
  };
}
