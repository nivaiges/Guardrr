import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ChangePresetResult,
  DeletedPreset,
  PracticePreset,
  PracticeSettings,
  PresetMove,
  SavePresetResult,
  deleteCustomPreset,
  moveCustomPreset,
  renameCustomPreset,
  restoreCustomPreset,
  saveCustomPreset,
  updateCustomPreset,
} from '../engine';
import { CustomPresetStore, createCustomPresetStore } from './customPresetStore';

export interface CustomPresets {
  /** The performer's presets, in the order they were saved (or moved to). */
  presets: readonly PracticePreset[];
  /** Save the settings under a name; saved right away when it works. */
  savePreset: (settings: PracticeSettings, name: string) => SavePresetResult;
  /** Delete a preset; returns what Undo (`restorePreset`) needs, or null. */
  deletePreset: (id: string) => DeletedPreset | null;
  restorePreset: (deleted: DeletedPreset) => void;
  /** Give a preset a new name; saved right away when it works. */
  renamePreset: (id: string, name: string) => ChangePresetResult;
  /** Overwrite a preset with these settings (tempo + toss). */
  updatePreset: (id: string, settings: PracticeSettings) => ChangePresetResult;
  /** Swap a preset with its neighbour; saved right away. */
  movePreset: (id: string, direction: PresetMove) => void;
  /** False until the saved presets have been read. */
  loaded: boolean;
}

/** The performer's own presets, kept across app restarts. */
export function useCustomPresets(): CustomPresets {
  const store = useRef<CustomPresetStore | null>(null);
  const [presets, setPresets] = useState<readonly PracticePreset[]>([]);
  const [loaded, setLoaded] = useState(false);
  const current = useRef<readonly PracticePreset[]>([]);

  useEffect(() => {
    const s = createCustomPresetStore({
      backend: AsyncStorage,
      onError: (e) => console.warn('Guardrr: could not access saved presets', e),
    });
    store.current = s;
    let cancelled = false;
    void s.load().then((saved) => {
      if (cancelled) return;
      current.current = saved;
      setPresets(saved);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback((next: readonly PracticePreset[]) => {
    current.current = next;
    setPresets(next);
    void store.current?.save(next);
  }, []);

  const savePreset = useCallback(
    (settings: PracticeSettings, name: string) => {
      const result = saveCustomPreset(current.current, settings, name, Date.now());
      if (result.saved) commit(result.presets);
      return result;
    },
    [commit],
  );

  const deletePreset = useCallback(
    (id: string) => {
      const { presets: next, deleted } = deleteCustomPreset(current.current, id);
      if (deleted) commit(next);
      return deleted;
    },
    [commit],
  );

  const restorePreset = useCallback(
    (deleted: DeletedPreset) => commit(restoreCustomPreset(current.current, deleted)),
    [commit],
  );

  const renamePreset = useCallback(
    (id: string, name: string) => {
      const result = renameCustomPreset(current.current, id, name);
      if (result.changed) commit(result.presets);
      return result;
    },
    [commit],
  );

  const updatePreset = useCallback(
    (id: string, settings: PracticeSettings) => {
      const result = updateCustomPreset(current.current, id, settings);
      if (result.changed) commit(result.presets);
      return result;
    },
    [commit],
  );

  const movePreset = useCallback(
    (id: string, direction: PresetMove) => {
      const result = moveCustomPreset(current.current, id, direction);
      if (result.moved) commit(result.presets);
    },
    [commit],
  );

  return {
    presets,
    savePreset,
    deletePreset,
    restorePreset,
    renamePreset,
    updatePreset,
    movePreset,
    loaded,
  };
}
