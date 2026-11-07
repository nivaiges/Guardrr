import { CallSequence, DEFAULT_TOSS_SETTINGS, TossSettings } from '../announce';
import { LiveCueTimeline, liveSettingsNote } from '../liveSettings';
import { PracticeCue, cueForTick, speechTextForCall } from '../practice';
import { createRng } from '../random';

const SIXTEEN: TossSettings = DEFAULT_TOSS_SETTINGS; // 16 counts, called 4 early, 1–7
const EIGHT: TossSettings = { ...SIXTEEN, phraseLength: 8, leadCounts: 2 };

/** Feed `counts` counts (count + "and" ticks) into the timeline, from where it left off. */
function play(timeline: LiveCueTimeline, from: number, counts: number): PracticeCue[] {
  const cues: PracticeCue[] = [];
  for (let c = from; c < from + counts; c++) {
    for (let sub = 0; sub < 2; sub++) {
      cues.push(timeline.cueAt({ tick: c * 2 + sub, countIndex: c, subdivision: sub }));
    }
  }
  return cues;
}

const onCounts = (cues: PracticeCue[]) => cues.filter((c) => c.subdivision === 0);

describe('LiveCueTimeline without changes', () => {
  it('gives the same cues as cueForTick', () => {
    const timeline = new LiveCueTimeline(SIXTEEN, createRng(3));
    const calls = new CallSequence(SIXTEEN, createRng(3));
    const cues = play(timeline, 0, 64);
    cues.forEach((cue, tick) => {
      const expected = cueForTick(
        { tick, countIndex: Math.floor(tick / 2), subdivision: tick % 2 },
        SIXTEEN,
        calls,
      );
      expect(cue).toEqual(expected);
    });
    expect(timeline.callHistory()).toEqual(calls.history());
    expect(timeline.pendingChange()).toBeNull();
  });

  it('keeps the count-in offset in tick and count numbers', () => {
    const timeline = new LiveCueTimeline(SIXTEEN, createRng(3), 8);
    const [first] = play(timeline, 0, 1);
    expect(first.countIndex).toBe(8);
    expect(first.tick).toBe(16);
    expect(first.count).toBe(9);
  });
});

describe('LiveCueTimeline.scheduleSettings', () => {
  it('switches at the next release whose call has not been spoken', () => {
    const timeline = new LiveCueTimeline(SIXTEEN, createRng(1));
    play(timeline, 0, 18); // into toss 1 (count 3 of phrase 1)
    const change = timeline.scheduleSettings(EIGHT);
    // Toss 2's call is spoken on count 28 (16 × 2 − 4): still ahead, so toss 2 is the first.
    expect(change).toMatchObject({ phrase: 2, startsAtCountIndex: 32, committed: false });
    const cues = onCounts(play(timeline, 18, 14 + 8 * 3));
    // Old phrase plays out: 16 counts, then 8-count phrases.
    const releases = cues.filter((c) => c.release).map((c) => c.countIndex);
    expect(releases).toEqual([32, 40, 48]);
    expect(cues.find((c) => c.countIndex === 32)).toMatchObject({ count: 1, phrase: 2 });
    expect(cues.find((c) => c.countIndex === 39)).toMatchObject({ count: 8, phrase: 2 });
    expect(timeline.activeSettings()).toBe(EIGHT);
    expect(timeline.pendingChange()).toBeNull();
  });

  it('speaks the first new call with the new lead counts, and not the old one', () => {
    const timeline = new LiveCueTimeline(SIXTEEN, createRng(1));
    play(timeline, 0, 18);
    timeline.scheduleSettings(EIGHT);
    const cues = onCounts(play(timeline, 18, 30));
    const spoken = cues.filter((c) => c.speak !== null);
    // Old lead (4) would speak on 28; the new lead (2) speaks on 30, then every 8 counts.
    expect(spoken.map((c) => c.countIndex)).toEqual([30, 38, 46]);
    expect(spoken.map((c) => c.announcedPhrase)).toEqual([2, 3, 4]);
    // The call spoken is the call tossed (and caught) in that phrase.
    for (const s of spoken) {
      const release = cues.find((c) => c.release && c.phrase === s.announcedPhrase);
      if (release) expect(speechTextForCall(release.currentCall as number)).toBe(s.speak);
    }
  });

  it('shows the next call only once the new settings have spoken it', () => {
    const timeline = new LiveCueTimeline(SIXTEEN, createRng(1));
    play(timeline, 0, 18);
    timeline.scheduleSettings(EIGHT);
    const cues = onCounts(play(timeline, 18, 14));
    expect(cues.find((c) => c.countIndex === 29)?.nextCall).toBeNull();
    const at30 = cues.find((c) => c.countIndex === 30);
    expect(at30?.nextCall).not.toBeNull();
    expect(at30?.speak).toBe(speechTextForCall(at30?.nextCall as number));
  });

  it('uses the larger lead counts to decide which release is still free', () => {
    const longLead = { ...EIGHT, leadCounts: 8 };
    const timeline = new LiveCueTimeline(SIXTEEN, createRng(1));
    play(timeline, 0, 25); // count 10 of toss 1: release 32 − 8 = 24 is already past
    expect(timeline.scheduleSettings(longLead)).toMatchObject({
      phrase: 3,
      startsAtCountIndex: 48,
    });
    const cues = onCounts(play(timeline, 25, 31));
    const spoken = cues.filter((c) => c.speak !== null);
    // Toss 2 still called the old way on 28; tosses 3 and 4 called 8 early, on 40 and 48.
    expect(spoken.map((c) => [c.countIndex, c.announcedPhrase])).toEqual([
      [28, 2],
      [40, 3],
      [48, 4],
    ]);
  });

  it('can switch during the lead-in, before the first call', () => {
    const timeline = new LiveCueTimeline(SIXTEEN, createRng(1));
    play(timeline, 0, 4);
    expect(timeline.scheduleSettings(EIGHT)).toMatchObject({ phrase: 1, startsAtCountIndex: 16 });
    const cues = onCounts(play(timeline, 4, 20));
    expect(cues.filter((c) => c.release).map((c) => c.countIndex)).toEqual([16]);
    expect(cues.filter((c) => c.speak).map((c) => c.countIndex)).toEqual([14, 22]);
  });

  it('replaces a change whose call has not been spoken, and cancels it by going back', () => {
    const timeline = new LiveCueTimeline(SIXTEEN, createRng(1));
    play(timeline, 0, 18);
    timeline.scheduleSettings(EIGHT);
    const three = { ...SIXTEEN, allowedTossCounts: [3] };
    expect(timeline.scheduleSettings(three)).toMatchObject({ settings: three, phrase: 2 });
    expect(timeline.scheduleSettings(SIXTEEN)).toBeNull();
    expect(timeline.latestSettings()).toBe(SIXTEEN);
  });

  it('queues a change behind one whose call is already spoken', () => {
    const timeline = new LiveCueTimeline(SIXTEEN, createRng(1));
    play(timeline, 0, 18);
    timeline.scheduleSettings(EIGHT);
    play(timeline, 18, 13); // past count 30: the first 8-count call is spoken
    expect(timeline.pendingChange()?.committed).toBe(true);
    const threes = { ...EIGHT, allowedTossCounts: [3] };
    timeline.scheduleSettings(threes);
    // The 8-count change still happens first.
    expect(timeline.pendingChange()).toMatchObject({ settings: EIGHT, phrase: 2 });
    const cues = onCounts(play(timeline, 31, 40));
    // Toss 3's call (count 38) was due too soon for the queued change: it starts at toss 4.
    const tossed = cues.filter((c) => c.release).map((c) => [c.phrase, c.currentCall]);
    expect(tossed.slice(2).every(([, call]) => call === 3)).toBe(true);
    expect(tossed[2][0]).toBe(4);
  });

  it('keeps no-repeat across the change', () => {
    for (let seed = 0; seed < 30; seed++) {
      const timeline = new LiveCueTimeline(
        { ...SIXTEEN, allowedTossCounts: [4, 5], allowRepeats: false },
        createRng(seed),
      );
      play(timeline, 0, 18);
      timeline.scheduleSettings({ ...EIGHT, allowedTossCounts: [4, 5], allowRepeats: false });
      play(timeline, 18, 40);
      const calls = timeline.callHistory();
      for (let i = 1; i < calls.length; i++) expect(calls[i]).not.toBe(calls[i - 1]);
    }
  });

  it('lists each toss once in the call history, across changes', () => {
    const timeline = new LiveCueTimeline(SIXTEEN, createRng(9));
    play(timeline, 0, 18);
    timeline.scheduleSettings(EIGHT);
    const cues = play(timeline, 18, 54); // up to count 71: tosses 1 (16), 2–6 (8 each)
    const tossed = cues.filter((c) => c.release).map((c) => c.currentCall);
    const history = timeline.callHistory();
    // Toss 1 was released before this slice; the last entry is the next, already spoken call.
    expect(history.slice(1, 1 + tossed.length)).toEqual(tossed);
    expect(history).toHaveLength(1 + tossed.length + 1);
  });

  it('rejects invalid settings without changing anything', () => {
    const timeline = new LiveCueTimeline(SIXTEEN, createRng(1));
    play(timeline, 0, 4);
    expect(() => timeline.scheduleSettings({ ...SIXTEEN, allowedTossCounts: [] })).toThrow();
    expect(timeline.pendingChange()).toBeNull();
  });

  it('ignores settings equal to what is playing', () => {
    const timeline = new LiveCueTimeline(SIXTEEN, createRng(1));
    expect(
      timeline.scheduleSettings({
        ...SIXTEEN,
        allowedTossCounts: [...SIXTEEN.allowedTossCounts].reverse(),
      }),
    ).toBeNull();
  });
});

describe('liveSettingsNote', () => {
  const pending = { settings: EIGHT, phrase: 3, startsAtCountIndex: 48, committed: false };

  it('says nothing when stopped', () => {
    expect(liveSettingsNote(false, null)).toBeNull();
    expect(liveSettingsNote(false, pending)).toBeNull();
  });

  it('explains when changes will be heard while practicing', () => {
    expect(liveSettingsNote(true, null)).toBe(
      'Changes start with the next toss that hasn’t been called yet.',
    );
    expect(liveSettingsNote(true, pending)).toBe('Your changes start with toss 3.');
    expect(liveSettingsNote(true, { ...pending, committed: true })).toBe(
      'Your changes start with toss 3 — its call is in.',
    );
  });
});
