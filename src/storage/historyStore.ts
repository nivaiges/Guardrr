/**
 * Loads and saves the past-session history (see engine/history.ts) through
 * a key-value backend (AsyncStorage in the app, a map in tests).
 *
 * Sessions are saved rarely (on Stop, or a Drop marked after Stop), so each
 * save writes right away; writes run one at a time in order so an older
 * history can never land after a newer one. Errors are reported, never
 * thrown: a failed save must not stop practice.
 */

import {
  HISTORY_STORAGE_KEY,
  SessionRecord,
  parseStoredHistory,
  serializeHistory,
} from '../engine';
import { KeyValueBackend } from './settingsStore';

export interface HistoryStoreOptions {
  backend: KeyValueBackend;
  onError?: (error: unknown) => void;
}

export interface HistoryStore {
  load(): Promise<SessionRecord[]>;
  /** Write the whole history; resolves once this (and any earlier) write is done. */
  save(history: readonly SessionRecord[]): Promise<void>;
}

export function createHistoryStore(options: HistoryStoreOptions): HistoryStore {
  const { backend, onError } = options;
  let queue: Promise<void> = Promise.resolve();
  let lastWritten: string | null = null;

  return {
    async load() {
      try {
        const json = await backend.getItem(HISTORY_STORAGE_KEY);
        lastWritten = json;
        return parseStoredHistory(json);
      } catch (error) {
        onError?.(error);
        return [];
      }
    },
    save(history) {
      const json = serializeHistory(history);
      queue = queue.then(async () => {
        if (json === lastWritten) return;
        try {
          await backend.setItem(HISTORY_STORAGE_KEY, json);
          lastWritten = json;
        } catch (error) {
          onError?.(error);
        }
      });
      return queue;
    },
  };
}
