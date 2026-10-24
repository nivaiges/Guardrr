import { DEFAULT_TOSS_SETTINGS, PracticeCue, speechTextForCall } from '../../engine';
import { createPracticeSession } from '../session';

jest.mock('expo-audio', () => ({}));
jest.mock('expo-speech', () => ({}));

beforeEach(() => {
  jest.useFakeTimers({ now: 0 });
});

afterEach(() => {
  jest.useRealTimers();
});

function setup(bpm = 120) {
  const clicks = { play: jest.fn() };
  const voice = { say: jest.fn(), stop: jest.fn() };
  const cues: PracticeCue[] = [];
  const session = createPracticeSession({
    bpm,
    settings: DEFAULT_TOSS_SETTINGS,
    clicks,
    voice,
    seed: 42,
    onCue: (c) => cues.push(c),
    schedulerOverrides: { now: () => Date.now() },
  });
  return { session, clicks, voice, cues };
}

describe('createPracticeSession', () => {
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
});
