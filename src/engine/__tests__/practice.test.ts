import { CallSequence, DEFAULT_TOSS_SETTINGS, TossSettings } from '../announce';
import {
  PracticeCue,
  cueForTick,
  displayLabelForCall,
  numberWord,
  speechTextForCall,
} from '../practice';
import { createRng } from '../random';

function walk(
  settings: TossSettings,
  counts: number,
  options = {},
  seed = 7,
): { cues: PracticeCue[]; calls: CallSequence } {
  const calls = new CallSequence(settings, createRng(seed));
  const cues: PracticeCue[] = [];
  for (let tick = 0; tick < counts * 2; tick++) {
    cues.push(
      cueForTick(
        { tick, countIndex: Math.floor(tick / 2), subdivision: tick % 2 },
        settings,
        calls,
        options,
      ),
    );
  }
  return { cues, calls };
}

describe('numberWord', () => {
  it('spells 0..64', () => {
    expect(numberWord(0)).toBe('zero');
    expect(numberWord(7)).toBe('seven');
    expect(numberWord(16)).toBe('sixteen');
    expect(numberWord(20)).toBe('twenty');
    expect(numberWord(21)).toBe('twenty-one');
    expect(numberWord(32)).toBe('thirty-two');
    expect(numberWord(64)).toBe('sixty-four');
  });

  it('rejects out-of-range and fractional numbers', () => {
    expect(() => numberWord(65)).toThrow(RangeError);
    expect(() => numberWord(-1)).toThrow(RangeError);
    expect(() => numberWord(2.5)).toThrow(RangeError);
  });
});

describe('call text', () => {
  it('speaks whole and "and" calls as words', () => {
    expect(speechTextForCall(1)).toBe('one');
    expect(speechTextForCall(5)).toBe('five');
    expect(speechTextForCall(2.5)).toBe('two and');
    expect(speechTextForCall(16)).toBe('sixteen');
  });

  it('labels calls compactly for the display', () => {
    expect(displayLabelForCall(5)).toBe('5');
    expect(displayLabelForCall(2.5)).toBe('2&');
  });
});

describe('cueForTick', () => {
  const settings = DEFAULT_TOSS_SETTINGS;

  it('accents count 1 of every phrase and clicks the other counts', () => {
    const { cues } = walk(settings, 48);
    const onCounts = cues.filter((c) => c.subdivision === 0);
    expect(onCounts.filter((c) => c.click === 'accent').map((c) => c.countIndex)).toEqual([
      0, 16, 32,
    ]);
    expect(onCounts.filter((c) => c.click === 'count')).toHaveLength(45);
  });

  it('is silent on "and"s unless andClicks is on', () => {
    expect(
      walk(settings, 16)
        .cues.filter((c) => c.subdivision === 1)
        .every((c) => c.click === null),
    ).toBe(true);
    const withAnds = walk(settings, 16, { andClicks: true }).cues;
    expect(withAnds.filter((c) => c.subdivision === 1).every((c) => c.click === 'and')).toBe(true);
  });

  it('can turn the downbeat accent off', () => {
    const { cues } = walk(settings, 32, { accentDownbeat: false });
    expect(cues.some((c) => c.click === 'accent')).toBe(false);
  });

  it('speaks each call once, on count 13 of the previous phrase, and that call is tossed', () => {
    const { cues } = walk(settings, 88);
    const spoken = cues.filter((c) => c.speak !== null);
    expect(spoken.map((c) => c.countIndex)).toEqual([12, 28, 44, 60, 76]);
    expect(spoken.every((c) => c.count === 13 && c.subdivision === 0)).toBe(true);
    for (const s of spoken) {
      const release = cues.find((c) => c.release && c.phrase === s.announcedPhrase);
      expect(release).toBeDefined();
      expect(s.speak).toBe(speechTextForCall(release!.currentCall!));
    }
  });

  it('shows the next call from its announcement until the release', () => {
    const { cues, calls } = walk(settings, 40);
    const count = (i: number) => cues[i * 2];
    expect(count(11).nextCall).toBeNull();
    expect(count(12).nextCall).toBe(calls.callFor(1));
    expect(count(15).nextCall).toBe(calls.callFor(1));
    expect(count(16).nextCall).toBeNull();
    expect(count(16).currentCall).toBe(calls.callFor(1));
    expect(count(28).nextCall).toBe(calls.callFor(2));
  });

  it('releases on count 1 of every toss phrase, never in the lead-in', () => {
    const { cues } = walk(settings, 48);
    expect(cues.filter((c) => c.release).map((c) => c.countIndex)).toEqual([16, 32]);
  });

  it('buzzes on every release by default, and never in the lead-in', () => {
    const { cues } = walk(settings, 48);
    const buzzes = cues.filter((c) => c.haptic !== null);
    expect(buzzes.map((c) => [c.countIndex, c.subdivision, c.haptic])).toEqual([
      [16, 0, 'release'],
      [32, 0, 'release'],
    ]);
    expect(buzzes.every((c) => c.release)).toBe(true);
  });

  it('can turn haptics off', () => {
    expect(walk(settings, 48, { haptics: false }).cues.some((c) => c.haptic !== null)).toBe(false);
  });

  it('catches on the called count', () => {
    const fives: TossSettings = { ...settings, allowedTossCounts: [5] };
    const { cues } = walk(fives, 48);
    const catches = cues.filter((c) => c.catch);
    expect(catches.map((c) => [c.countIndex, c.subdivision])).toEqual([
      [20, 0],
      [36, 0],
    ]);
  });

  it('catches "and" calls and pop tosses on the "and" tick', () => {
    const ands: TossSettings = { ...settings, allowedTossCounts: [2.5] };
    expect(
      walk(ands, 32)
        .cues.filter((c) => c.catch)
        .map((c) => [c.count, c.subdivision]),
    ).toEqual([[2, 1]]);

    const pops: TossSettings = { ...settings, allowedTossCounts: [1] };
    expect(
      walk(pops, 32)
        .cues.filter((c) => c.catch)
        .map((c) => [c.count, c.subdivision]),
    ).toEqual([[1, 1]]);
  });

  it('works with a short phrase and a long lead', () => {
    const quick: TossSettings = {
      phraseLength: 8,
      leadCounts: 8,
      allowedTossCounts: [2, 3, 4],
      allowRepeats: false,
    };
    const { cues, calls } = walk(quick, 32);
    const spoken = cues.filter((c) => c.speak);
    // Lead of a full phrase: each call is spoken on count 1 of the previous phrase.
    expect(spoken.map((c) => c.countIndex)).toEqual([0, 8, 16, 24]);
    const history = calls.history();
    for (let i = 1; i < history.length; i++) expect(history[i]).not.toBe(history[i - 1]);
  });
});
