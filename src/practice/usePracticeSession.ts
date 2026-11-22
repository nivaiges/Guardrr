import { useCallback, useEffect, useRef, useState } from 'react';

import { ClickPlayer, configurePracticeAudio, createClickPlayer, createVoice } from '../audio';
import {
  CueOptions,
  EMPTY_STATS,
  PendingSettingsChange,
  PracticeCue,
  SessionStats,
  TossSettings,
  recordCue,
  resumeStats,
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
  /** Wall-clock time (epoch ms) of the latest Start, or null before the first. */
  startedAt: number | null;
  /** Toss settings of the phrase being played (the given settings when stopped). */
  activeSettings: TossSettings;
  /** Settings changed while practicing that wait for their phrase, or null. */
  pendingChange: PendingSettingsChange | null;
  /** Session count index of the next count (counts played since the latest Start). */
  nextCountIndex: number;
  start(): void;
  /**
   * Start a new run that continues the last session's stats (same start
   * time, tosses, drops; the time stopped isn't counted), with a fresh
   * count-in. Used after leaving the screen stopped practice.
   */
  resume(): void;
  /**
   * While practicing, restart the phrase now with the latest settings: a
   * fresh count-in, the same session (like resume, without stopping), so a
   * pending change doesn't wait for its toss. See applyNowOffer.
   */
  applyNow(): void;
  stop(): void;
  /** Mark (or un-mark) the latest toss as dropped; also works after Stop. */
  toggleDrop(): void;
}

/**
 * React wrapper around createPracticeSession. Changing `bpm` while running
 * re-tempos smoothly; click options and the voice apply right away; toss
 * settings start at the next phrase whose call hasn't been spoken.
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
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const session = useRef<PracticeSession | null>(null);
  const clicks = useRef<ClickPlayer | null>(null);
  const bpmRef = useRef(bpm);
  const [activeSettings, setActiveSettings] = useState(settings);
  const [pendingChange, setPendingChange] = useState<PendingSettingsChange | null>(null);
  const [nextCountIndex, setNextCountIndex] = useState(0);
  useKeepAwakeWhile(running);

  // Keep the latest pending change object only when it differs, so ticks don't re-render.
  const syncFromSession = useCallback((s: PracticeSession) => {
    setActiveSettings(s.activeSettings());
    const next = s.pendingChange();
    setPendingChange((prev) =>
      prev?.phrase === next?.phrase &&
      prev?.committed === next?.committed &&
      prev?.settings === next?.settings
        ? prev
        : next,
    );
  }, []);

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

  useEffect(() => {
    const s = session.current;
    if (!s) {
      setActiveSettings(settings);
      return;
    }
    try {
      s.setSettings(settings);
    } catch {
      // The settings screen only produces valid settings; keep playing the old ones.
    }
    syncFromSession(s);
  }, [settings, syncFromSession]);

  useEffect(() => {
    session.current?.setCueOptions(cueOptions);
  }, [cueOptions]);

  useEffect(() => {
    session.current?.setVoice(createVoice({ rate: voiceRate, voice }));
  }, [voiceRate, voice]);

  const stop = useCallback(() => {
    session.current?.stop();
    session.current = null;
    setRunning(false);
    setCue(null);
    setPendingChange(null);
  }, []);

  const begin = useCallback(
    (continueSession: boolean) => {
      if (session.current?.running || !clicks.current) return;
      if (continueSession) {
        setStats((prev) => resumeStats(prev));
        setStartedAt((prev) => prev ?? Date.now());
      } else {
        setStats(EMPTY_STATS);
        setStartedAt(Date.now());
      }
      setNextCountIndex(0);
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
          if (c.subdivision === 0) {
            setNextCountIndex((n) => n + 1);
            syncFromSession(s);
          }
        },
      });
      session.current = s;
      s.start();
      setRunning(true);
      syncFromSession(s);
    },
    [settings, cueOptions, countIn, voiceRate, voice, syncFromSession],
  );
  const start = useCallback(() => begin(false), [begin]);
  const resume = useCallback(() => begin(true), [begin]);
  const applyNow = useCallback(() => {
    if (!session.current?.running) return;
    // Not stop(): `running` stays true, so the session isn't saved or ended.
    session.current.stop();
    session.current = null;
    setCue(null);
    setPendingChange(null);
    begin(true);
  }, [begin]);

  const toggleLatestDrop = useCallback(() => setStats((prev) => toggleDrop(prev)), []);

  return {
    running,
    cue,
    stats,
    startedAt,
    activeSettings: running ? activeSettings : settings,
    pendingChange,
    nextCountIndex,
    start,
    resume,
    applyNow,
    stop,
    toggleDrop: toggleLatestDrop,
  };
}
