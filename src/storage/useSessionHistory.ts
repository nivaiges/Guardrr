import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  EMPTY_HISTORY_STATE,
  HistoryState,
  SessionRecord,
  clearHistory as clearAll,
  deleteFromHistory,
  restoreToHistory,
  saveToHistory,
  upsertSession,
} from '../engine';
import { HistoryStore, createHistoryStore } from './historyStore';

export interface SessionHistory {
  /** Past sessions, newest first. */
  history: readonly SessionRecord[];
  /**
   * Add a session, or replace the one with the same start time; saved right
   * away. Ignored for a session deleted since the app opened (until Undo).
   */
  saveSession: (record: SessionRecord) => void;
  /** Delete one session; returns the removed records for `restoreSessions`. */
  deleteSession: (startedAt: number) => SessionRecord[];
  /** Delete every session; returns the removed records for `restoreSessions`. */
  clearHistory: () => SessionRecord[];
  /** Undo a delete. */
  restoreSessions: (records: readonly SessionRecord[]) => void;
  /** When the history was last loaded or changed (epoch ms), for "Today"/"Yesterday". */
  updatedAt: number;
  /** False until the saved history has been read. */
  loaded: boolean;
}

/** Past practice sessions that survive app restarts. */
export function useSessionHistory(): SessionHistory {
  const store = useRef<HistoryStore | null>(null);
  const [history, setHistory] = useState<readonly SessionRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(0);
  // Sessions saved before the stored history finished loading.
  const early = useRef<SessionRecord[]>([]);
  const stateRef = useRef<HistoryState>(EMPTY_HISTORY_STATE);

  useEffect(() => {
    const s = createHistoryStore({
      backend: AsyncStorage,
      onError: (e) => console.warn('Guardrr: could not access session history', e),
    });
    store.current = s;
    let cancelled = false;
    void s.load().then((saved) => {
      if (cancelled) return;
      const merged = early.current.reduce((h, r) => upsertSession(h, r), saved);
      stateRef.current = { sessions: merged, deleted: [] };
      early.current = [];
      setHistory(merged);
      setUpdatedAt(Date.now());
      setLoaded(true);
      if (merged !== saved) void s.save(merged);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback((next: HistoryState) => {
    if (next === stateRef.current) return;
    const changed = next.sessions !== stateRef.current.sessions;
    stateRef.current = next;
    if (!changed) return;
    setHistory(next.sessions);
    setUpdatedAt(Date.now());
    void store.current?.save(next.sessions);
  }, []);

  const saveSession = useCallback(
    (record: SessionRecord) => {
      if (!loaded) {
        early.current = upsertSession(early.current, record);
        return;
      }
      commit(saveToHistory(stateRef.current, record));
    },
    [loaded, commit],
  );

  const deleteSession = useCallback(
    (startedAt: number) => {
      const { state, removed } = deleteFromHistory(stateRef.current, [startedAt]);
      commit(state);
      return removed;
    },
    [commit],
  );

  const clearHistory = useCallback(() => {
    const { state, removed } = clearAll(stateRef.current);
    commit(state);
    return removed;
  }, [commit]);

  const restoreSessions = useCallback(
    (records: readonly SessionRecord[]) => commit(restoreToHistory(stateRef.current, records)),
    [commit],
  );

  return {
    history,
    saveSession,
    deleteSession,
    clearHistory,
    restoreSessions,
    updatedAt,
    loaded,
  };
}
