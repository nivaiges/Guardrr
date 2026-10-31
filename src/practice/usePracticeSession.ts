import { useCallback, useEffect, useRef, useState } from 'react';

import { ClickPlayer, configurePracticeAudio, createClickPlayer, createVoice } from '../audio';
import {
  CueOptions,
  EMPTY_STATS,
  PracticeCue,
  SessionStats,
  TossSettings,
  recordCue,
  toggleDrop,
} from '../engine';
import { createHapticPlayer, useKeepAwakeWhile } from '../feedback';
import { PracticeSession, createPracticeSession } from './session';

export interface PracticeSessionState {
  running: boolean;
  /** Latest cue on a count (not updated on silent "and" ticks unless something happens). */
  cue: PracticeCue | null;
  /** Stats of the current run, or of the last one after Stop (reset on Start). */
  stats: SessionStats;
  start(): void;
  stop(): void;
  /** Mark (or un-mark) the latest toss as dropped; also works after Stop. */
  toggleDrop(): void;
}

/**
 * React wrapper around createPracticeSession. Changing `bpm` while running
 * re-tempos smoothly; changing settings takes effect on the next start.
 */
export function usePracticeSession(
  bpm: number,
  settings: TossSettings,
  cueOptions?: CueOptions,
  countIn?: number,
  voiceRate?: number,
  /** Voice identifier (already checked against the phone's voices); undefined = system default. */
  voice?: string,
): PracticeSessionState {
  const [running, setRunning] = useState(false);
  const [cue, setCue] = useState<PracticeCue | null>(null);
  const [stats, setStats] = useState<SessionStats>(EMPTY_STATS);
  const session = useRef<PracticeSession | null>(null);
  const clicks = useRef<ClickPlayer | null>(null);
  const bpmRef = useRef(bpm);
  useKeepAwakeWhile(running);

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
    setStats(EMPTY_STATS);
    const s = createPracticeSession({
      bpm: bpmRef.current,
      settings,
      cueOptions,
      countIn,
      clicks: clicks.current,
      voice: createVoice({ rate: voiceRate, voice }),
      haptics: createHapticPlayer(),
      onCue: (c) => {
        // recordCue returns the same object for silent ticks, so this only
        // re-renders when something was counted.
        const now = performance.now();
        setStats((prev) => recordCue(prev, c, now));
        // Re-render on counts, and on an "and" only when a catch lands there.
        if (c.subdivision === 0 || c.catch) setCue(c);
      },
    });
    session.current = s;
    s.start();
    setRunning(true);
  }, [settings, cueOptions, countIn, voiceRate, voice]);

  const toggleLatestDrop = useCallback(() => setStats((prev) => toggleDrop(prev)), []);

  return { running, cue, stats, start, stop, toggleDrop: toggleLatestDrop };
}
