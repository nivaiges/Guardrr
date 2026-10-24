import { useCallback, useEffect, useRef, useState } from 'react';

import { ClickPlayer, configurePracticeAudio, createClickPlayer, createVoice } from '../audio';
import { CueOptions, PracticeCue, TossSettings } from '../engine';
import { PracticeSession, createPracticeSession } from './session';

export interface PracticeSessionState {
  running: boolean;
  /** Latest cue on a count (not updated on silent "and" ticks unless something happens). */
  cue: PracticeCue | null;
  start(): void;
  stop(): void;
}

/**
 * React wrapper around createPracticeSession. Changing `bpm` while running
 * re-tempos smoothly; changing settings takes effect on the next start.
 */
export function usePracticeSession(
  bpm: number,
  settings: TossSettings,
  cueOptions?: CueOptions,
): PracticeSessionState {
  const [running, setRunning] = useState(false);
  const [cue, setCue] = useState<PracticeCue | null>(null);
  const session = useRef<PracticeSession | null>(null);
  const clicks = useRef<ClickPlayer | null>(null);
  const bpmRef = useRef(bpm);

  useEffect(() => {
    void configurePracticeAudio();
    clicks.current = createClickPlayer();
    return () => {
      session.current?.stop();
      clicks.current?.release();
      clicks.current = null;
    };
  }, []);

  useEffect(() => {
    bpmRef.current = bpm;
    session.current?.setBpm(bpm);
  }, [bpm]);

  const stop = useCallback(() => {
    session.current?.stop();
    session.current = null;
    setRunning(false);
    setCue(null);
  }, []);

  const start = useCallback(() => {
    if (session.current?.running || !clicks.current) return;
    const s = createPracticeSession({
      bpm: bpmRef.current,
      settings,
      cueOptions,
      clicks: clicks.current,
      voice: createVoice(),
      onCue: (c) => {
        // Re-render on counts, and on an "and" only when a catch lands there.
        if (c.subdivision === 0 || c.catch) setCue(c);
      },
    });
    session.current = s;
    s.start();
    setRunning(true);
  }, [settings, cueOptions]);

  return { running, cue, start, stop };
}
