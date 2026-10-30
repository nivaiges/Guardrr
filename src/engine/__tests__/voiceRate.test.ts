import { parseStoredSettings } from '../storedSettings';
import {
  DEFAULT_VOICE_RATE,
  VOICE_RATE_OPTIONS,
  isVoiceRateOption,
  voiceRateLabel,
} from '../voiceRate';

describe('voice rate', () => {
  it('offers increasing, distinct speeds including the default', () => {
    const rates = VOICE_RATE_OPTIONS.map((o) => o.rate);
    expect([...rates].sort((a, b) => a - b)).toEqual(rates);
    expect(new Set(rates).size).toBe(rates.length);
    expect(rates).toContain(DEFAULT_VOICE_RATE);
    expect(rates).toContain(1);
  });

  it('keeps the previous fixed rate (1.1) as the default', () => {
    expect(DEFAULT_VOICE_RATE).toBe(1.1);
    expect(voiceRateLabel(DEFAULT_VOICE_RATE)).toBe('Fast');
  });

  it('recognizes only the offered speeds', () => {
    expect(isVoiceRateOption(0.8)).toBe(true);
    expect(isVoiceRateOption(0.9)).toBe(false);
    expect(isVoiceRateOption('1')).toBe(false);
    expect(isVoiceRateOption(Number.NaN)).toBe(false);
  });

  it('labels unknown rates with the number', () => {
    expect(voiceRateLabel(1.3)).toBe('Faster');
    expect(voiceRateLabel(2)).toBe('2×');
  });

  it('is saved with the settings and repaired when invalid', () => {
    const parse = (voiceRate: unknown) =>
      parseStoredSettings(JSON.stringify({ voiceRate })).voiceRate;
    expect(parse(0.8)).toBe(0.8);
    expect(parse(1.3)).toBe(1.3);
    expect(parse(5)).toBe(DEFAULT_VOICE_RATE);
    expect(parse('fast')).toBe(DEFAULT_VOICE_RATE);
    expect(parseStoredSettings(JSON.stringify({ bpm: 90 })).voiceRate).toBe(DEFAULT_VOICE_RATE);
  });
});
