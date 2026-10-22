import {
  CallSequence,
  DEFAULT_TOSS_SETTINGS,
  TossSettings,
  announceCountInPhrase,
  announcementCountIndex,
  eventsAtCount,
  phraseAnnouncedAt,
  tossCountsThatFit,
  validateTossSettings,
} from '../announce';
import { createRng } from '../random';
import { countIndexOf } from '../timing';

const settings = (overrides: Partial<TossSettings> = {}): TossSettings => ({
  ...DEFAULT_TOSS_SETTINGS,
  ...overrides,
});

describe('announcement timing', () => {
  it('speaks the call on count 13 of 16 with the default 4 lead counts', () => {
    expect(announceCountInPhrase(16, 4)).toBe(13);
    expect(announceCountInPhrase(8, 2)).toBe(7);
    expect(announceCountInPhrase(8, 8)).toBe(1);
  });

  it('places the announcement leadCounts before the release', () => {
    for (const [L, lead] of [
      [16, 4],
      [8, 1],
      [32, 10],
    ]) {
      for (let phrase = 1; phrase < 5; phrase++) {
        const release = countIndexOf(phrase, 1, L);
        expect(announcementCountIndex(phrase, L, lead)).toBe(release - lead);
        expect(phraseAnnouncedAt(release - lead, L, lead)).toBe(phrase);
      }
    }
  });

  it('returns null on counts without an announcement', () => {
    expect(phraseAnnouncedAt(0, 16, 4)).toBeNull();
    expect(phraseAnnouncedAt(13, 16, 4)).toBeNull();
    expect(phraseAnnouncedAt(12, 16, 4)).toBe(1);
  });

  it('rejects invalid lead counts and phrases', () => {
    expect(() => announceCountInPhrase(16, 0)).toThrow(RangeError);
    expect(() => announceCountInPhrase(16, 17)).toThrow(RangeError);
    expect(() => announcementCountIndex(0, 16, 4)).toThrow(RangeError);
    expect(() => phraseAnnouncedAt(-1, 16, 4)).toThrow(RangeError);
  });
});

describe('toss settings validation', () => {
  it('drops toss counts that cannot be caught inside the phrase', () => {
    expect(tossCountsThatFit([1, 3, 5, 7], 4)).toEqual([1, 3]);
    expect(tossCountsThatFit([7], 8)).toEqual([7]);
  });

  it('throws when nothing fits', () => {
    expect(() => tossCountsThatFit([5, 6], 4)).toThrow(RangeError);
    expect(() =>
      validateTossSettings(settings({ phraseLength: 4, allowedTossCounts: [5] })),
    ).toThrow(RangeError);
  });

  it('accepts the defaults', () => {
    expect(validateTossSettings(DEFAULT_TOSS_SETTINGS)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('CallSequence', () => {
  it('is reproducible for a seed and memoizes calls', () => {
    const a = new CallSequence(DEFAULT_TOSS_SETTINGS, createRng(5));
    const b = new CallSequence(DEFAULT_TOSS_SETTINGS, createRng(5));
    // Ask out of order: a jumps ahead, b goes in order.
    const a10 = a.callFor(10);
    const bCalls = Array.from({ length: 10 }, (_, i) => b.callFor(i + 1));
    expect(a10).toBe(bCalls[9]);
    expect(a.history()).toEqual(bCalls);
    expect(a.callFor(3)).toBe(bCalls[2]);
  });

  it('honors the no-repeat option across phrases', () => {
    const seq = new CallSequence(
      settings({ allowRepeats: false, allowedTossCounts: [1, 2] }),
      createRng(11),
    );
    for (let p = 2; p <= 200; p++) {
      expect(seq.callFor(p)).not.toBe(seq.callFor(p - 1));
    }
  });

  it('only calls counts that fit in the phrase', () => {
    const seq = new CallSequence(
      settings({ phraseLength: 4, leadCounts: 2, allowedTossCounts: [1, 2, 3, 4, 5, 6, 7] }),
      createRng(3),
    );
    for (let p = 1; p <= 100; p++) {
      expect(seq.callFor(p)).toBeLessThanOrEqual(4);
    }
  });

  it('rejects the lead-in phrase', () => {
    const seq = new CallSequence(DEFAULT_TOSS_SETTINGS, createRng(1));
    expect(() => seq.callFor(0)).toThrow(RangeError);
  });
});

describe('eventsAtCount', () => {
  it('walks a full 16-count cycle with a 4-count lead', () => {
    const s = settings({ allowedTossCounts: [5] });
    const seq = new CallSequence(s, createRng(1));
    const events = Array.from({ length: 48 }, (_, i) => eventsAtCount(i, s, seq));

    // Lead-in phrase: no release, no catch, no current call.
    for (const e of events.slice(0, 16)) {
      expect(e.release).toBe(false);
      expect(e.catch).toBe(false);
      expect(e.currentCall).toBeNull();
    }

    const announced = events.filter((e) => e.announce).map((e) => [e.countIndex, e.position.count]);
    // Count 13 of phrases 0 and 1 (and 2, for phrase 3).
    expect(announced).toEqual([
      [12, 13],
      [28, 13],
      [44, 13],
    ]);
    expect(events[12].announce).toEqual({ phrase: 1, call: 5 });

    const releases = events.filter((e) => e.release).map((e) => e.countIndex);
    expect(releases).toEqual([16, 32]);

    const catches = events.filter((e) => e.catch).map((e) => [e.countIndex, e.position.count]);
    expect(catches).toEqual([
      [20, 5],
      [36, 5],
    ]);
  });

  it('announces the same call that is later caught', () => {
    const s = settings({ phraseLength: 8, leadCounts: 3 });
    const seq = new CallSequence(s, createRng(2024));
    const announcements = new Map<number, number>();
    for (let i = 0; i < 8 * 30; i++) {
      const e = eventsAtCount(i, s, seq);
      if (e.announce) announcements.set(e.announce.phrase, e.announce.call);
      if (e.catch) {
        expect(e.position.count).toBe(announcements.get(e.position.phrase));
      }
      if (e.release) {
        expect(announcements.has(e.position.phrase)).toBe(true);
      }
    }
  });

  it('lets a lead equal to the phrase length announce on the previous count 1', () => {
    const s = settings({ phraseLength: 8, leadCounts: 8, allowedTossCounts: [3] });
    const seq = new CallSequence(s, createRng(1));
    expect(eventsAtCount(0, s, seq).announce).toEqual({ phrase: 1, call: 3 });
    const e8 = eventsAtCount(8, s, seq);
    expect(e8.release).toBe(true);
    expect(e8.announce).toEqual({ phrase: 2, call: 3 });
  });

  it('flags release and catch together for a 1-count call', () => {
    const s = settings({ phraseLength: 8, leadCounts: 4, allowedTossCounts: [1] });
    const seq = new CallSequence(s, createRng(1));
    const e = eventsAtCount(8, s, seq);
    expect(e.release).toBe(true);
    expect(e.catch).toBe(true);
  });
});
