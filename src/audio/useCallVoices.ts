import { useCallback, useEffect, useState } from 'react';

import type { VoiceInfo } from '../engine/voices';
import { loadCallVoices } from './voice';

export interface CallVoices {
  /** English voices on this phone, best first (empty until loaded or if none). */
  voices: readonly VoiceInfo[];
  /** Read the list again (e.g. when the picker opens, after a voice download). */
  reload(): void;
}

export function useCallVoices(): CallVoices {
  const [voices, setVoices] = useState<readonly VoiceInfo[]>([]);
  const reload = useCallback(() => {
    void loadCallVoices().then(setVoices);
  }, []);
  useEffect(() => {
    let cancelled = false;
    void loadCallVoices().then((v) => {
      if (!cancelled) setVoices(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return { voices, reload };
}
