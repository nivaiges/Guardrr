import {
  displayAccessibilityLabel,
  practiceStartedAnnouncement,
  practiceStoppedAnnouncement,
  spokenCallLabel,
  spokenDuration,
} from '../accessibility';
import { CallSequence, DEFAULT_TOSS_SETTINGS, TossSettings } from '../announce';
import { PracticeDisplay, practiceDisplay } from '../display';
import { cueForTick } from '../practice';
import { EMPTY_STATS, summarizeStats } from '../stats';

function displayAt(settings: TossSettings, tick: number): PracticeDisplay {
  const calls = new CallSequence(settings, () => 0);
  const cue = cueForTick(
    { tick, countIndex: Math.floor(tick / 2), subdivision: tick % 2 },
    settings,
    calls,
  );
  return practiceDisplay(cue, settings);
}

describe('spokenCallLabel', () => {
  it('reads "&" as "and"', () => {
    expect(spokenCallLabel('5')).toBe('5');
    expect(spokenCallLabel('2&')).toBe('2 and');
    expect(spokenCallLabel('2& count')).toBe('2 and count');
  });
});

describe('spokenDuration', () => {
  it.each([
    [0, '0 seconds'],
    [-5, '0 seconds'],
    [NaN, '0 seconds'],
    [1000, '1 second'],
    [45_900, '45 seconds'],
    [60_000, '1 minute'],
    [245_000, '4 minutes 5 seconds'],
    [3_600_000, '1 hour'],
    [3_720_000, '1 hour 2 minutes'],
    [7_261_000, '2 hours 1 minute'],
  ])('%p ms → %p', (ms, text) => {
    expect(spokenDuration(ms)).toBe(text);
  });
});

describe('displayAccessibilityLabel', () => {
  it('describes the ready state', () => {
    expect(displayAccessibilityLabel(practiceDisplay(null, DEFAULT_TOSS_SETTINGS))).toBe(
      'Ready. 16-count phrase. Press Start to practice.',
    );
  });

  const five: TossSettings = { ...DEFAULT_TOSS_SETTINGS, allowedTossCounts: [5] };

  it('describes the lead-in before and after the call', () => {
    expect(displayAccessibilityLabel(displayAt(five, 0))).toBe(
      'Count 1 of 16. Lead-in. Listen for the call.',
    );
    // Count 13 of the lead-in: the "5" has just been called.
    expect(displayAccessibilityLabel(displayAt(five, 24))).toBe(
      'Count 13 of 16. 5 count. Release in 4 counts. Next toss: 5.',
    );
  });

  it('describes the release, the toss in the air and the catch', () => {
    expect(displayAccessibilityLabel(displayAt(five, 32))).toBe(
      'Count 1 of 16. Release. Catch on 5. Toss: 5.',
    );
    expect(displayAccessibilityLabel(displayAt(five, 34))).toBe(
      'Count 2 of 16. 5 count. Catch on 5. 3 counts to the catch. Toss: 5.',
    );
    expect(displayAccessibilityLabel(displayAt(five, 33))).toContain(
      '3 and a half counts to the catch.',
    );
    expect(displayAccessibilityLabel(displayAt(five, 40))).toBe(
      'Count 5 of 16. Catch. Mark time. Toss: 5.',
    );
  });

  it('reads "and" calls with words, never "&"', () => {
    const twoAnd: TossSettings = { ...DEFAULT_TOSS_SETTINGS, allowedTossCounts: [2.5] };
    const release = displayAccessibilityLabel(displayAt(twoAnd, 32));
    expect(release).toBe('Count 1 of 16. Release. Catch on 2 and. Toss: 2 and.');
    expect(displayAccessibilityLabel(displayAt(twoAnd, 34))).toContain('Catch on the next and.');
    for (let tick = 0; tick < 64; tick++) {
      expect(displayAccessibilityLabel(displayAt(twoAnd, tick))).not.toContain('&');
    }
  });
});

describe('practice announcements', () => {
  it('says the tempo and the call count on start', () => {
    expect(practiceStartedAnnouncement(120, DEFAULT_TOSS_SETTINGS)).toBe(
      'Started. 120 BPM, 16-count phrase, call on count 13.',
    );
    expect(
      practiceStartedAnnouncement(96, { ...DEFAULT_TOSS_SETTINGS, phraseLength: 8, leadCounts: 2 }),
    ).toBe('Started. 96 BPM, 8-count phrase, call on count 7.');
  });

  it('summarizes the session on stop', () => {
    expect(practiceStoppedAnnouncement(summarizeStats(EMPTY_STATS))).toBe(
      'Stopped before the first toss.',
    );
    const one = summarizeStats({
      ...EMPTY_STATS,
      startedAtMs: 0,
      lastCueAtMs: 20_000,
      tosses: 1,
      recent: [{ phrase: 1, call: 5 }],
      timesCalled: { '5': 1 },
    });
    expect(practiceStoppedAnnouncement(one)).toBe('Stopped. 1 toss in 20 seconds.');
    const many = summarizeStats({
      ...EMPTY_STATS,
      startedAtMs: 0,
      lastCueAtMs: 125_000,
      tosses: 7,
      timesCalled: { '5': 7 },
    });
    expect(practiceStoppedAnnouncement(many)).toBe('Stopped. 7 tosses in 2 minutes 5 seconds.');
  });
});
