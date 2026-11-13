import { CueOptions, DEFAULT_TOSS_SETTINGS, PracticeCue, speechTextForCall } from '../../engine';
import { createPracticeSession } from '../session';

jest.mock('expo-audio', () => ({}));
jest.mock('expo-speech', () => ({}));
jest.mock('expo-haptics', () => ({}));

beforeEach(() => {
  jest.useFakeTimers({ now: 0 });
});

afterEach(() => {
  jest.useRealTimers();
});

function setup(bpm = 120, countIn?: number, cueOptions?: CueOptions) {
  const clicks = { play: jest.fn() };
  const voice = { say: jest.fn(), stop: jest.fn() };
  const haptics = { play: jest.fn() };
  const cues: PracticeCue[] = [];
  const session = createPracticeSession({
    bpm,
    settings: DEFAULT_TOSS_SETTINGS,
    clicks,
    voice,
    haptics,
    seed: 42,
    countIn,
    cueOptions,
    onCue: (c) => cues.push(c),
    schedulerOverrides: { now: () => Date.now() },
  });
  return { session, clicks, voice, haptics, cues };
}

describe('createPracticeSession', () => {
  it('buzzes on each release, starting with the first toss phrase', () => {
    const { session, haptics } = setup();
    session.start();
    jest.advanceTimersByTime(16 * 500 - 1);
    expect(haptics.play).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(haptics.play).toHaveBeenCalledWith('release');
    jest.advanceTimersByTime(16 * 500);
    expect(haptics.play).toHaveBeenCalledTimes(2);
    session.stop();
  });

  it('clicks every count at tempo with count 1 accented', () => {
    const { session, clicks } = setup();
    session.start();
    jest.advanceTimersByTime(16 * 500 - 1);
    const kinds = clicks.play.mock.calls.map((c) => c[0]);
    expect(kinds).toHaveLength(16);
    expect(kinds[0]).toBe('accent');
    expect(kinds.slice(1).every((k) => k === 'count')).toBe(true);
    session.stop();
  });

  it('speaks the first call on count 13 (6 s in at 120 BPM)', () => {
    const { session, voice } = setup();
    session.start();
    jest.advanceTimersByTime(5999);
    expect(voice.say).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(voice.say).toHaveBeenCalledTimes(1);
    const [first] = session.callHistory();
    expect(voice.say).toHaveBeenCalledWith(speechTextForCall(first));
    session.stop();
  });

  it('reports a release and a catch for each toss phrase', () => {
    const { session, cues } = setup();
    session.start();
    jest.advanceTimersByTime(48 * 500 - 1);
    expect(cues.filter((c) => c.release)).toHaveLength(2);
    expect(cues.filter((c) => c.catch)).toHaveLength(2);
    expect(session.callHistory().length).toBeGreaterThanOrEqual(2);
    session.stop();
  });

  it('stops ticking and silences the voice on stop', () => {
    const { session, clicks, voice } = setup();
    session.start();
    jest.advanceTimersByTime(1000);
    session.stop();
    const played = clicks.play.mock.calls.length;
    jest.advanceTimersByTime(5000);
    expect(clicks.play.mock.calls.length).toBe(played);
    expect(voice.stop).toHaveBeenCalled();
    expect(session.running).toBe(false);
  });

  it('changes tempo while running', () => {
    const { session, clicks } = setup(120);
    session.start();
    jest.advanceTimersByTime(999); // counts at 0, 500
    session.setBpm(60);
    jest.advanceTimersByTime(3001); // next at 1000, then 2000, 3000, 4000
    expect(clicks.play).toHaveBeenCalledTimes(6);
    session.stop();
  });

  describe('count-in', () => {
    it('releases 8 counts (4 s at 120 BPM) after Start with an 8-count count-in', () => {
      const { session, haptics, cues } = setup(120, 8);
      session.start();
      expect(cues[0]).toMatchObject({ phrase: 0, count: 9, click: 'count' });
      jest.advanceTimersByTime(8 * 500 - 1);
      expect(haptics.play).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(haptics.play).toHaveBeenCalledWith('release');
      expect(cues[cues.length - 1]).toMatchObject({ phrase: 1, count: 1, release: true });
      session.stop();
    });

    it('still speaks the first call 4 counts before the first release', () => {
      const { session, voice } = setup(120, 8);
      session.start();
      jest.advanceTimersByTime(4 * 500 - 1);
      expect(voice.say).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(voice.say).toHaveBeenCalledWith(speechTextForCall(session.callHistory()[0]));
      session.stop();
    });

    it('speaks the count-off over the count-in, then the call', () => {
      // 16 counts, lead 4: the call is on count 13, so the count-off is "5 6," on 9 and 11.
      const { session, voice } = setup(120, 8, { countOff: true });
      session.start();
      expect(voice.say).toHaveBeenNthCalledWith(1, 'five');
      jest.advanceTimersByTime(2 * 500);
      expect(voice.say).toHaveBeenNthCalledWith(2, 'six');
      jest.advanceTimersByTime(2 * 500);
      expect(voice.say).toHaveBeenNthCalledWith(3, speechTextForCall(session.callHistory()[0]));
      // Nothing else is said until the next call: no count-off after the first toss.
      jest.advanceTimersByTime(16 * 500 - 1);
      expect(voice.say).toHaveBeenCalledTimes(3);
      jest.advanceTimersByTime(1);
      expect(voice.say).toHaveBeenCalledTimes(4);
      session.stop();
    });

    it('uses the chosen count-off pattern', () => {
      // Straight count with lead 4: "one two three four" on counts 9–12, then the call on 13.
      const { session, voice } = setup(120, 8, { countOff: true, countOffPattern: 'straight' });
      session.start();
      jest.advanceTimersByTime(3 * 500);
      expect(voice.say.mock.calls.map((c) => c[0])).toEqual(['one', 'two', 'three', 'four']);
      jest.advanceTimersByTime(500);
      expect(voice.say).toHaveBeenLastCalledWith(speechTextForCall(session.callHistory()[0]));
      session.stop();
    });

    it('counts off again on the next start', () => {
      const { session, voice } = setup(120, 8, { countOff: true });
      session.start();
      jest.advanceTimersByTime(10 * 500);
      session.stop();
      voice.say.mockClear();
      session.start();
      expect(voice.say).toHaveBeenCalledWith('five');
      session.stop();
    });

    it('stays silent on the count-in when the count-off is off', () => {
      const { session, voice } = setup(120, 8);
      session.start();
      jest.advanceTimersByTime(4 * 500 - 1);
      expect(voice.say).not.toHaveBeenCalled();
      session.stop();
    });

    it('keeps the same tick numbering as a full lead-in, just shifted', () => {
      const { session, cues } = setup(120, 4);
      session.start();
      jest.advanceTimersByTime(20 * 500 - 1);
      expect(cues[0]).toMatchObject({ tick: 24, countIndex: 12, subdivision: 0 });
      expect(cues.filter((c) => c.release)).toHaveLength(1);
      expect(cues.filter((c) => c.click === 'accent')).toHaveLength(1);
      session.stop();
    });

    it('uses a full phrase when the count-in is 0 or omitted', () => {
      for (const countIn of [0, undefined]) {
        const { session, cues } = setup(120, countIn);
        session.start();
        expect(cues[0]).toMatchObject({ phrase: 0, count: 1 });
        session.stop();
      }
    });
  });

  it('throws on start with settings where nothing fits', () => {
    const clicks = { play: jest.fn() };
    const voice = { say: jest.fn(), stop: jest.fn() };
    const session = createPracticeSession({
      bpm: 120,
      settings: {
        ...DEFAULT_TOSS_SETTINGS,
        phraseLength: 4,
        leadCounts: 2,
        allowedTossCounts: [7],
      },
      clicks,
      voice,
    });
    expect(() => session.start()).toThrow(RangeError);
    expect(clicks.play).not.toHaveBeenCalled();
  });

  describe('changing settings while running', () => {
    const EIGHT = { ...DEFAULT_TOSS_SETTINGS, phraseLength: 8, leadCounts: 2 };

    it('keeps the toss in the air, then plays the new phrase length', () => {
      const { session, cues } = setup();
      session.start();
      jest.advanceTimersByTime(18 * 500); // count 3 of toss 1
      session.setSettings(EIGHT);
      expect(session.pendingChange()).toMatchObject({ phrase: 2, committed: false });
      expect(session.activeSettings()).toBe(DEFAULT_TOSS_SETTINGS);
      jest.advanceTimersByTime(14 * 500 + 8 * 500 * 2);
      const releases = cues.filter((c) => c.release).map((c) => c.countIndex);
      expect(releases).toEqual([16, 32, 40, 48]);
      expect(session.activeSettings()).toBe(EIGHT);
      expect(session.pendingChange()).toBeNull();
      session.stop();
    });

    it('applies new click options from the next tick', () => {
      const { session, clicks } = setup();
      session.start();
      jest.advanceTimersByTime(16 * 500 - 1);
      session.setCueOptions({ accentDownbeat: false });
      clicks.play.mockClear();
      jest.advanceTimersByTime(1);
      expect(clicks.play).toHaveBeenLastCalledWith('count');
      session.stop();
    });

    it('speaks the next call in a new voice', () => {
      const { session, voice } = setup();
      const other = { say: jest.fn(), stop: jest.fn() };
      session.start();
      session.setVoice(other);
      jest.advanceTimersByTime(13 * 500);
      expect(voice.say).not.toHaveBeenCalled();
      expect(other.say).toHaveBeenCalledTimes(1);
      session.stop();
      expect(other.stop).toHaveBeenCalled();
    });

    it('rejects invalid settings, running or not', () => {
      const { session } = setup();
      const bad = { ...DEFAULT_TOSS_SETTINGS, allowedTossCounts: [] };
      expect(() => session.setSettings(bad)).toThrow();
      session.start();
      expect(() => session.setSettings(bad)).toThrow();
      expect(session.activeSettings()).toBe(DEFAULT_TOSS_SETTINGS);
      session.stop();
    });

    it('uses settings changed while stopped on the next start', () => {
      const { session, cues } = setup();
      session.setSettings(EIGHT);
      session.start();
      jest.advanceTimersByTime(8 * 500 * 2 - 1);
      expect(cues.filter((c) => c.release).map((c) => c.countIndex)).toEqual([8]);
      session.stop();
    });
  });
});
