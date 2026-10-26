import { CallSequence, DEFAULT_TOSS_SETTINGS, TossSettings } from '../announce';
import { PracticeDisplay, practiceDisplay } from '../display';
import { PracticeCue, cueForTick } from '../practice';
import { Rng } from '../random';

/** Calls are predictable here: each test allows a single call. */
const fixedCallRng = (): Rng => () => 0;

function displays(settings: TossSettings, counts: number): PracticeDisplay[] {
  const calls = new CallSequence(settings, fixedCallRng());
  const out: PracticeDisplay[] = [];
  for (let tick = 0; tick < counts * 2; tick++) {
    const cue: PracticeCue = cueForTick(
      { tick, countIndex: Math.floor(tick / 2), subdivision: tick % 2 },
      settings,
      calls,
    );
    out.push(practiceDisplay(cue, settings));
  }
  return out;
}

/** Display on the count (not its "and") at 0-based countIndex. */
const onCount = (all: PracticeDisplay[], countIndex: number) => all[countIndex * 2];
const onAnd = (all: PracticeDisplay[], countIndex: number) => all[countIndex * 2 + 1];

describe('practiceDisplay', () => {
  it('is "ready" with no cue and shows the call count in the strip', () => {
    const d = practiceDisplay(null, DEFAULT_TOSS_SETTINGS);
    expect(d.phase).toBe('ready');
    expect(d.count).toBeNull();
    expect(d.beats).toHaveLength(16);
    expect(d.beats.filter((b) => b.marker === 'call').map((b) => b.count)).toEqual([13]);
    expect(d.beats.some((b) => b.current || b.past)).toBe(false);
  });

  describe('with a 5 count in a 16-count phrase', () => {
    const settings: TossSettings = { ...DEFAULT_TOSS_SETTINGS, allowedTossCounts: [5] };
    const all = displays(settings, 48);

    it('shows lead-in until the call, then the upcoming toss and a release countdown', () => {
      expect(onCount(all, 0)).toMatchObject({ phase: 'lead-in', headline: 'Lead-in' });
      expect(onCount(all, 11).nextCallLabel).toBeNull();
      expect(onCount(all, 12)).toMatchObject({
        phase: 'lead-in',
        headline: '5 count',
        nextCallLabel: '5',
        countsToRelease: 4,
        detail: 'Release in 4 counts',
      });
      expect(onCount(all, 15)).toMatchObject({ countsToRelease: 1, detail: 'Release in 1 count' });
    });

    it('cues the release on count 1 and counts down to the catch', () => {
      expect(onCount(all, 16)).toMatchObject({
        phase: 'release',
        headline: 'Release!',
        detail: 'Catch on 5',
        callLabel: '5',
        nextCallLabel: null,
      });
      expect(onAnd(all, 16)).toMatchObject({ phase: 'in-air', countsToCatch: 3.5 });
      expect(onCount(all, 17)).toMatchObject({ phase: 'in-air', countsToCatch: 3 });
      expect(onCount(all, 19)).toMatchObject({ phase: 'in-air', countsToCatch: 1 });
    });

    it('cues the catch on 5 and marks time after it', () => {
      expect(onCount(all, 20)).toMatchObject({ phase: 'catch', headline: 'Catch!', count: 5 });
      expect(onCount(all, 21)).toMatchObject({ phase: 'marking', headline: 'Mark time' });
      expect(onCount(all, 21).countsToCatch).toBeNull();
      expect(onCount(all, 28)).toMatchObject({ phase: 'marking', headline: '5 count' });
    });

    it('marks release, catch and call in the phrase strip and tracks progress', () => {
      const d = onCount(all, 22); // count 7 of phrase 1
      expect(d.beats[0].marker).toBe('release');
      expect(d.beats[4].marker).toBe('catch');
      expect(d.beats[12].marker).toBe('call');
      expect(d.beats.filter((b) => b.past)).toHaveLength(6);
      expect(d.beats.find((b) => b.current)?.count).toBe(7);
    });
  });

  it('handles catches on the "and"', () => {
    const settings: TossSettings = { ...DEFAULT_TOSS_SETTINGS, allowedTossCounts: [2.5] };
    const all = displays(settings, 20);
    expect(onCount(all, 16)).toMatchObject({ phase: 'release', detail: 'Catch on 2&' });
    expect(onCount(all, 17)).toMatchObject({ phase: 'in-air', countsToCatch: 0.5 });
    expect(onAnd(all, 17)).toMatchObject({ phase: 'catch' });
    expect(onCount(all, 18).phase).toBe('marking');
    const catchBeat = onCount(all, 17).beats[1];
    expect(catchBeat).toMatchObject({ marker: 'catch', catchOnAnd: true });
  });

  it('handles a pop toss (1), caught on the "and" of the release count', () => {
    const settings: TossSettings = { ...DEFAULT_TOSS_SETTINGS, allowedTossCounts: [1] };
    const all = displays(settings, 18);
    expect(onCount(all, 16).phase).toBe('release');
    expect(onAnd(all, 16).phase).toBe('catch');
    expect(onCount(all, 17).phase).toBe('marking');
    // The catch marker wins over the release marker on count 1.
    expect(onCount(all, 16).beats[0]).toMatchObject({ marker: 'catch', catchOnAnd: true });
  });

  it('works with a short phrase where the call comes during the toss', () => {
    const settings: TossSettings = {
      phraseLength: 8,
      leadCounts: 4,
      allowedTossCounts: [6],
      allowRepeats: true,
    };
    const all = displays(settings, 24);
    // Count 5 of phrase 1: next call spoken while the 6 is still in the air.
    expect(onCount(all, 12)).toMatchObject({
      phase: 'in-air',
      callLabel: '6',
      nextCallLabel: '6',
      countsToRelease: 4,
    });
    expect(onCount(all, 13).phase).toBe('catch');
    expect(onCount(all, 13).detail).toBe('Release in 3 counts');
  });
});
