import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { SessionRecord, upsertSession } from '../engine';
import { HistoryStore, createHistoryStore } from './historyStore';

export interface SessionHistory {
  /** Past sessions, newest first. */
  history: readonly SessionRecord[];
  /** Add a session, or replace the one with the same start time; saved right away. */
  saveSession: (record: SessionRecord) => void;
  /** False until the saved history has been read. */
  loaded: boolean;
}

/** Past practice sessions that survive app restarts. */
export function useSessionHistory(): SessionHistory {
  const store = useRef<HistoryStore | null>(null);
  const [history, setHistory] = useState<readonly SessionRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Sessions saved before the stored history finished loading.
  const early = useRef<SessionRecord[]>([]);
  const historyRef = useRef<readonly SessionRecord[]>([]);

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
      historyRef.current = merged;
      early.current = [];
      setHistory(merged);
      setLoaded(true);
      if (merged !== saved) void s.save(merged);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveSession = useCallback(
    (record: SessionRecord) => {
      if (!loaded) {
        early.current = upsertSession(early.current, record);
        return;
      }
      const next = upsertSession(historyRef.current, record);
      historyRef.current = next;
      setHistory(next);
      void store.current?.save(next);
    },
    [loaded],
  );

  return { history, saveSession, loaded };
}
