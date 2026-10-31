import {
  FALLBACK_CALL_LANGUAGE,
  VoiceInfo,
  callLanguage,
  callVoices,
  isStoredVoiceId,
  normalizeLanguageTag,
  resolveVoice,
  voiceLabel,
} from '../voices';

const v = (identifier: string, language: string, quality = 'Default', name = identifier) =>
  ({ identifier, name, language, quality }) satisfies VoiceInfo;

describe('normalizeLanguageTag', () => {
  it('normalizes separators and case', () => {
    expect(normalizeLanguageTag('en_us')).toBe('en-US');
    expect(normalizeLanguageTag('EN-gb')).toBe('en-GB');
    expect(normalizeLanguageTag('en')).toBe('en');
    expect(normalizeLanguageTag('zh-Hant-TW')).toBe('zh-Hant-TW');
  });
});

describe('callLanguage', () => {
  it("uses the phone's English", () => {
    expect(callLanguage('en-GB')).toBe('en-GB');
    expect(callLanguage('en_AU')).toBe('en-AU');
    expect(callLanguage('en')).toBe('en');
  });

  it('falls back to US English for other languages or no locale', () => {
    expect(callLanguage('de-DE')).toBe(FALLBACK_CALL_LANGUAGE);
    expect(callLanguage(undefined)).toBe(FALLBACK_CALL_LANGUAGE);
  });
});

describe('callVoices', () => {
  const all = [
    v('fr-voice', 'fr-FR'),
    v('com.apple.voice.Daniel', 'en-GB', 'Default', 'Daniel'),
    v('com.apple.voice.Samantha', 'en-US', 'Default', 'Samantha'),
    v('com.apple.voice.enhanced.Ava', 'en-US', 'Enhanced', 'Ava'),
    v('en-us-x-sfg-network', 'en-US'),
    v('en-us-x-sfg-local', 'en_US'),
    v('com.apple.voice.Samantha', 'en-US', 'Default', 'Samantha'),
  ];

  it('keeps English, offline, unique voices', () => {
    const ids = callVoices(all, 'en-US').map((x) => x.identifier);
    expect(ids).not.toContain('fr-voice');
    expect(ids).not.toContain('en-us-x-sfg-network');
    expect(ids.filter((id) => id === 'com.apple.voice.Samantha')).toHaveLength(1);
    expect(ids).toHaveLength(4);
  });

  it("puts the phone's region and enhanced voices first", () => {
    expect(callVoices(all, 'en-US').map((x) => x.identifier)).toEqual([
      'com.apple.voice.enhanced.Ava',
      'com.apple.voice.Samantha',
      'en-us-x-sfg-local',
      'com.apple.voice.Daniel',
    ]);
    expect(callVoices(all, 'en-GB')[0].identifier).toBe('com.apple.voice.Daniel');
  });

  it('prefers US English on a non-English phone', () => {
    expect(callVoices(all, 'de-DE')[0].identifier).toBe('com.apple.voice.enhanced.Ava');
  });

  it('does not mutate its input', () => {
    const copy = [...all];
    callVoices(all, 'en-GB');
    expect(all).toEqual(copy);
  });
});

describe('voiceLabel', () => {
  it('keeps friendly names and adds the region', () => {
    expect(voiceLabel(v('x', 'en-US', 'Default', 'Samantha'))).toBe('Samantha (US)');
    expect(voiceLabel(v('x', 'en-GB', 'Enhanced', 'Daniel'))).toBe('Daniel (UK, enhanced)');
  });

  it('tidies Android voice ids', () => {
    expect(voiceLabel(v('en-us-x-sfg-local', 'en-US'))).toBe('Voice SFG (US)');
    expect(voiceLabel(v('en-in-x-ene-local', 'en_IN'))).toBe('Voice ENE (India)');
  });

  it('shows unknown regions as their code', () => {
    expect(voiceLabel(v('x', 'en-JM', 'Default', 'Kai'))).toBe('Kai (JM)');
    expect(voiceLabel(v('x', 'en', 'Default', 'Plain'))).toBe('Plain');
  });
});

describe('resolveVoice', () => {
  const available = [v('a', 'en-US'), v('b', 'en-GB')];

  it('keeps a voice the phone still has', () => {
    expect(resolveVoice('b', available)).toBe('b');
  });

  it('falls back to the system voice otherwise', () => {
    expect(resolveVoice('gone', available)).toBeUndefined();
    expect(resolveVoice(null, available)).toBeUndefined();
    expect(resolveVoice(undefined, available)).toBeUndefined();
  });
});

describe('isStoredVoiceId', () => {
  it('accepts null and short strings only', () => {
    expect(isStoredVoiceId(null)).toBe(true);
    expect(isStoredVoiceId('com.apple.voice.Ava')).toBe(true);
    expect(isStoredVoiceId('')).toBe(false);
    expect(isStoredVoiceId(42)).toBe(false);
    expect(isStoredVoiceId('x'.repeat(300))).toBe(false);
  });
});
