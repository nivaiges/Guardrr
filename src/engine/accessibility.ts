/**
 * Screen-reader text (VoiceOver / TalkBack).
 *
 * The practice cues are already audible — the metronome and the spoken call —
 * so a screen reader must not narrate every count on top of them. Instead:
 *
 * - the big display is one accessible element whose label describes the
 *   current state when the performer focuses it (`displayAccessibilityLabel`);
 * - Start and Stop each make one short announcement
 *   (`practiceStartedAnnouncement`, `practiceStoppedAnnouncement`).
 *
 * Pure strings, framework-free, so they're unit tested.
 */

import { TossSettings, announceCountInPhrase } from './announce';
import { PracticeDisplay } from './display';
import { StatsSummary } from './stats';

function plural(n: number, word: string, many = `${word}s`): string {
  return `${n} ${n === 1 ? word : many}`;
}

/** Display label ("2&") as it should be read ("2 and"). */
export function spokenCallLabel(label: string): string {
  return label.replace('&', ' and');
}

/** Elapsed time read aloud: "45 seconds", "4 minutes 5 seconds", "1 hour 2 minutes". */
export function spokenDuration(ms: number): string {
  const total = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return m > 0 ? `${plural(h, 'hour')} ${plural(m, 'minute')}` : plural(h, 'hour');
  if (m > 0) return s > 0 ? `${plural(m, 'minute')} ${plural(s, 'second')}` : plural(m, 'minute');
  return plural(s, 'second');
}

function sentence(text: string): string {
  const t = text.trim().replace(/[.!]+$/, '');
  return t ? `${t}.` : '';
}

/** One label for the whole practice display, read when it is focused. */
export function displayAccessibilityLabel(model: PracticeDisplay): string {
  if (model.phase === 'ready' || model.count === null) {
    return `Ready. ${model.beats.length}-count phrase. Press Start to practice.`;
  }
  const parts = [
    `Count ${model.count} of ${model.beats.length}.`,
    sentence(spokenCallLabel(model.headline)),
    sentence(spokenCallLabel(model.detail)),
  ];
  if (model.countsToCatch === 0.5) parts.push('Catch on the next and.');
  else if (model.countsToCatch !== null) {
    const whole = Math.floor(model.countsToCatch);
    const counts =
      whole === model.countsToCatch ? plural(whole, 'count') : `${whole} and a half counts`;
    parts.push(`${counts} to the catch.`);
  }
  if (model.callLabel !== null) parts.push(`Toss: ${spokenCallLabel(model.callLabel)}.`);
  if (model.nextCallLabel !== null) {
    parts.push(`Next toss: ${spokenCallLabel(model.nextCallLabel)}.`);
  }
  return parts.filter(Boolean).join(' ');
}

/** Said once when practice starts: tempo and where the call will come. */
export function practiceStartedAnnouncement(bpm: number, settings: TossSettings): string {
  const callCount = announceCountInPhrase(settings.phraseLength, settings.leadCounts);
  return `Started. ${bpm} BPM, ${settings.phraseLength}-count phrase, call on count ${callCount}.`;
}

/** Said once when practice stops: how many tosses and how long. */
export function practiceStoppedAnnouncement(summary: StatsSummary): string {
  if (summary.tosses === 0) return 'Stopped before the first toss.';
  const drops =
    summary.drops > 0
      ? `, ${plural(summary.drops, 'drop')}, ${summary.catchRateLabel} caught,`
      : '';
  return `Stopped. ${plural(summary.tosses, 'toss', 'tosses')}${drops} in ${spokenDuration(summary.durationMs)}.`;
}
