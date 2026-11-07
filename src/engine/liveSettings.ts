/**
 * Changing the toss settings while practicing.
 *
 * The cue for a tick depends on the phrase length, the lead counts and the
 * calls, so new settings can't simply replace the old ones mid-phrase: the
 * count display would jump and a call could be spoken under one set of rules
 * and caught under another. Instead a change starts at a phrase boundary — a
 * release — and early enough that the call for that first phrase is spoken
 * under the NEW settings (their lead counts before the release). The toss in
 * the air keeps its old call and finishes its old phrase.
 *
 * The timeline is a list of segments, each one set of settings with its own
 * call sequence. Ticks come in with the session's count index (counting from
 * Start); each segment maps that to its own local count index, where the
 * first segment starts part-way into its lead-in phrase (the count-in) and
 * every later one starts on count 1 of its phrase 1. Phrase numbers in the
 * cues stay continuous across segments (phrase N = the session's Nth toss).
 *
 * Pure and framework-free: the practice session feeds it ticks.
 */

import { CallSequence, FIRST_TOSS_PHRASE, TossSettings } from './announce';
import { CueOptions, PracticeCue, cueForTick } from './practice';
import { sameTossSettings } from './presets';
import { Rng } from './random';

interface Segment {
  settings: TossSettings;
  calls: CallSequence;
  /** Session count index where this segment takes over. */
  startIndex: number;
  /** This segment's local count index at `startIndex`. */
  localStart: number;
  /** Added to local phrase numbers to get session phrase numbers. */
  phraseBase: number;
}

/** A settings change that is scheduled but hasn't taken over yet. */
export interface PendingSettingsChange {
  settings: TossSettings;
  /** Session phrase (toss number, 1 = first toss) that is the first under the new settings. */
  phrase: number;
  /** Session count index of that phrase's release. */
  startsAtCountIndex: number;
  /** Whether its first call has been spoken (it can no longer be cancelled or replaced). */
  committed: boolean;
}

export interface TimelineTick {
  /** Ticks since Start (scheduler numbering). */
  tick: number;
  /** Counts since Start (scheduler numbering). */
  countIndex: number;
  /** 0 on the count, 1 on its "and". */
  subdivision: number;
}

export class LiveCueTimeline {
  private segments: Segment[];
  /** Calls of segments that have ended, oldest first. */
  private finishedCalls: number[] = [];
  /** Session count index of the next count to be cued. */
  private nextCountIndex = 0;

  /**
   * @param firstLocalIndex local count index of the first count (where the
   *   count-in starts inside the lead-in phrase; see `firstCountIndex`).
   * @param ticksPerCount scheduler ticks per count (to keep `cue.tick` continuous).
   */
  constructor(
    settings: TossSettings,
    private readonly rng: Rng,
    private readonly firstLocalIndex = 0,
    private readonly ticksPerCount = 2,
  ) {
    this.segments = [
      {
        settings,
        calls: new CallSequence(settings, rng),
        startIndex: 0,
        localStart: firstLocalIndex,
        phraseBase: 0,
      },
    ];
  }

  /** The settings the latest cue was played with. */
  activeSettings(): TossSettings {
    return this.segments[0].settings;
  }

  /** The newest settings: what will be playing once every pending change took over. */
  latestSettings(): TossSettings {
    return this.segments[this.segments.length - 1].settings;
  }

  /** The next settings change that hasn't taken over yet, or null. */
  pendingChange(): PendingSettingsChange | null {
    const next = this.segments[1];
    if (!next) return null;
    return {
      settings: next.settings,
      phrase: next.phraseBase + FIRST_TOSS_PHRASE,
      startsAtCountIndex: next.startIndex,
      committed: this.isCommitted(1),
    };
  }

  /**
   * Switch to `next` at the earliest phrase boundary whose call hasn't been
   * spoken yet. Changing again before that call is spoken replaces the
   * pending change (going back to the playing settings cancels it). Throws
   * (and changes nothing) if `next` is invalid.
   */
  scheduleSettings(next: TossSettings): PendingSettingsChange | null {
    // Validate before touching any state.
    const probe = new CallSequence(next, this.rng);
    void probe;
    const last = this.segments.length - 1;
    if (last > 0 && !this.isCommitted(last)) this.segments.pop();
    const from = this.segments[this.segments.length - 1];
    if (sameTossSettings(from.settings, next)) return this.pendingChange();
    this.segments.push(this.planAfter(from, next));
    return this.pendingChange();
  }

  /** The cue for one scheduler tick. Ticks must come in order. */
  cueAt(raw: TimelineTick, options: CueOptions = {}): PracticeCue {
    const index = raw.countIndex;
    while (this.segments.length > 1 && index >= this.segments[1].startIndex) {
      const ended = this.segments.shift() as Segment;
      const ruled = this.segments[0].phraseBase - ended.phraseBase;
      this.finishedCalls.push(...ended.calls.history().slice(0, ruled));
    }
    const active = this.segments[0];
    const cue = this.localCue(active, raw, options);
    const upcoming = this.segments[1];
    if (upcoming) {
      const switchPhrase = upcoming.phraseBase + FIRST_TOSS_PHRASE;
      // The old settings never announce the phrases the new ones take over.
      if (cue.announcedPhrase !== null && cue.announcedPhrase >= switchPhrase) {
        cue.speak = null;
        cue.announcedPhrase = null;
      }
      const local = index - upcoming.startIndex + upcoming.localStart;
      const early = local >= 0 ? this.localCue(upcoming, raw, options) : null;
      if (early?.speak) {
        cue.speak = early.speak;
        cue.announcedPhrase = early.announcedPhrase;
      }
      if (cue.phrase + 1 >= switchPhrase) cue.nextCall = early?.nextCall ?? null;
    }
    if (raw.subdivision === 0) this.nextCountIndex = index + 1;
    return cue;
  }

  /** Calls made (or already spoken for the next toss), oldest first. */
  callHistory(): readonly number[] {
    const calls = [...this.finishedCalls];
    this.segments.forEach((segment, i) => {
      const next = this.segments[i + 1];
      const own = segment.calls.history();
      calls.push(...(next ? own.slice(0, next.phraseBase - segment.phraseBase) : own));
    });
    return calls;
  }

  private localCue(segment: Segment, raw: TimelineTick, options: CueOptions): PracticeCue {
    const local = raw.countIndex - segment.startIndex + segment.localStart;
    const cue = cueForTick(
      {
        tick: local * this.ticksPerCount + raw.subdivision,
        countIndex: local,
        subdivision: raw.subdivision,
      },
      segment.settings,
      segment.calls,
      options,
    );
    return {
      ...cue,
      tick: raw.tick + this.firstLocalIndex * this.ticksPerCount,
      countIndex: raw.countIndex + this.firstLocalIndex,
      phrase: cue.phrase + segment.phraseBase,
      announcedPhrase:
        cue.announcedPhrase === null ? null : cue.announcedPhrase + segment.phraseBase,
    };
  }

  /**
   * Whether segment i's first call is spoken (or would have been by now under
   * the previous segment's lead): from then on the switch is fixed.
   */
  private isCommitted(i: number): boolean {
    const segment = this.segments[i];
    const before = this.segments[i - 1];
    const lead = Math.max(segment.settings.leadCounts, before.settings.leadCounts);
    return this.nextCountIndex > segment.startIndex - lead;
  }

  private planAfter(from: Segment, next: TossSettings): Segment {
    const length = from.settings.phraseLength;
    const lead = Math.max(from.settings.leadCounts, next.leadCounts);
    // Neither set of settings may have announced the first new phrase yet,
    // and the switch can't land inside an earlier pending change.
    const base = Math.max(this.nextCountIndex, from.startIndex);
    const phrase = Math.max(
      FIRST_TOSS_PHRASE,
      Math.ceil((base + lead - from.startIndex + from.localStart) / length),
    );
    const startIndex = from.startIndex + phrase * length - from.localStart;
    const previousPhrase = phrase - 1;
    const previous =
      previousPhrase >= FIRST_TOSS_PHRASE ? from.calls.callFor(previousPhrase) : undefined;
    return {
      settings: next,
      calls: new CallSequence(next, this.rng, previous),
      startIndex,
      localStart: next.phraseLength,
      phraseBase: from.phraseBase + phrase - FIRST_TOSS_PHRASE,
    };
  }
}

/**
 * Note under the Phrase settings while practicing: when changes to the
 * phrase and calls will be heard. Null when stopped (changes apply on Start).
 */
export function liveSettingsNote(
  running: boolean,
  pending: PendingSettingsChange | null,
): string | null {
  if (!running) return null;
  if (!pending) return 'Changes start with the next toss that hasn’t been called yet.';
  return pending.committed
    ? `Your changes start with toss ${pending.phrase} — its call is in.`
    : `Your changes start with toss ${pending.phrase}.`;
}
