/**
 * Non-fatal problems with a settings combination, for the settings UI to
 * show. Fatal problems (nothing fits, bad numbers) still throw from
 * validateTossSettings.
 */

import { TossSettings, announceCountInPhrase, tossCountsThatFit } from './announce';
import { catchPositionOf } from './calls';
import { normalizeTossCounts } from './random';

export type SettingsWarning =
  | {
      /** These calls are caught on/after the count the next call is spoken. */
      code: 'call-before-catch';
      calls: number[];
      announceCount: number;
    }
  | {
      /** These calls can't be caught inside the phrase and will never be called. */
      code: 'calls-dropped';
      calls: number[];
    }
  | {
      /** No-repeat is on but there's only one call, so it will repeat anyway. */
      code: 'no-repeat-ignored';
    };

export function settingsWarnings(settings: TossSettings): SettingsWarning[] {
  const warnings: SettingsWarning[] = [];
  const requested = normalizeTossCounts(settings.allowedTossCounts);
  const fitting = tossCountsThatFit(requested, settings.phraseLength);

  const dropped = requested.filter((n) => !fitting.includes(n));
  if (dropped.length > 0) warnings.push({ code: 'calls-dropped', calls: dropped });

  const announceCount = announceCountInPhrase(settings.phraseLength, settings.leadCounts);
  const overlapping = fitting.filter((n) => catchPositionOf(n) >= announceCount);
  if (overlapping.length > 0) {
    warnings.push({ code: 'call-before-catch', calls: overlapping, announceCount });
  }

  if (!settings.allowRepeats && fitting.length === 1) {
    warnings.push({ code: 'no-repeat-ignored' });
  }
  return warnings;
}
