/**
 * Choosing the voice that speaks the toss call.
 *
 * The calls are English words ("five", "two and"), so only English voices are
 * offered, whatever the phone's language. Voices in the phone's own English
 * (en-GB on a British phone) come first, then higher-quality ("Enhanced")
 * voices, then by name. Android "-network" voices are left out: they stream
 * from a server, so their start delay is unpredictable, which is the one
 * thing a timed call can't afford.
 *
 * Pure and framework-free: the app maps `expo-speech`'s Voice objects to
 * VoiceInfo (same shape) and stores only the chosen `identifier`.
 */

export interface VoiceInfo {
  /** What `Speech.speak({ voice })` takes. */
  identifier: string;
  name: string;
  /** "Default" or "Enhanced" (expo-speech VoiceQuality). */
  quality: string;
  /** BCP 47 tag, e.g. "en-US" (Android reports "en_US" on some engines). */
  language: string;
}

/** Language used when no voice is chosen and the phone isn't set to English. */
export const FALLBACK_CALL_LANGUAGE = 'en-US';

/** "en_us" / "EN-us" → "en-US". */
export function normalizeLanguageTag(tag: string): string {
  const [lang = '', region, ...rest] = tag.trim().replace(/_/g, '-').split('-');
  const parts = [lang.toLowerCase()];
  if (region) parts.push(region.length === 2 ? region.toUpperCase() : region);
  return [...parts, ...rest].join('-');
}

function primaryLanguage(tag: string): string {
  return normalizeLanguageTag(tag).split('-')[0];
}

function region(tag: string): string | undefined {
  return normalizeLanguageTag(tag).split('-')[1];
}

/** Language for the call when no voice is chosen: the phone's English, or US English. */
export function callLanguage(deviceLocale: string | undefined): string {
  if (deviceLocale && primaryLanguage(deviceLocale) === 'en') {
    const r = region(deviceLocale);
    return r ? `en-${r}` : 'en';
  }
  return FALLBACK_CALL_LANGUAGE;
}

const isNetworkVoice = (v: VoiceInfo) => /-network$/i.test(v.identifier);

/**
 * English voices worth offering, best first for this phone's locale.
 * Duplicate identifiers (some engines list a voice twice) are dropped.
 */
export function callVoices(voices: readonly VoiceInfo[], deviceLocale?: string): VoiceInfo[] {
  const wantedRegion = deviceLocale && region(callLanguage(deviceLocale));
  const seen = new Set<string>();
  const english = voices.filter((v) => {
    if (!v.identifier || seen.has(v.identifier)) return false;
    seen.add(v.identifier);
    return primaryLanguage(v.language) === 'en' && !isNetworkVoice(v);
  });
  const rank = (v: VoiceInfo) =>
    (wantedRegion && region(v.language) === wantedRegion ? 0 : 2) +
    (v.quality === 'Enhanced' ? 0 : 1);
  return english.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      normalizeLanguageTag(a.language).localeCompare(normalizeLanguageTag(b.language)) ||
      voiceLabel(a).localeCompare(voiceLabel(b)),
  );
}

const REGION_NAMES: Record<string, string> = {
  US: 'US',
  GB: 'UK',
  AU: 'Australia',
  CA: 'Canada',
  IE: 'Ireland',
  IN: 'India',
  NZ: 'New Zealand',
  ZA: 'South Africa',
  NG: 'Nigeria',
  SG: 'Singapore',
};

/**
 * A readable name. iOS names are already friendly ("Samantha"); Android
 * names are ids like "en-us-x-sfg-local", shown as "Voice SFG".
 */
export function voiceLabel(v: VoiceInfo): string {
  const androidId = /^[a-z]{2,3}[-_][a-z]{2,3}-x-([a-z0-9]+)(?:-local)?$/i.exec(v.name);
  const base = androidId ? `Voice ${androidId[1].toUpperCase()}` : v.name.trim() || v.identifier;
  const r = region(v.language);
  const place = r ? (REGION_NAMES[r] ?? r) : undefined;
  const parts = [place, v.quality === 'Enhanced' ? 'enhanced' : undefined].filter(Boolean);
  return parts.length > 0 ? `${base} (${parts.join(', ')})` : base;
}

/**
 * The stored voice if this phone still has it; otherwise undefined (the
 * system default speaks). Voices disappear when the user removes a download
 * or restores settings onto another phone.
 */
export function resolveVoice(
  stored: string | null | undefined,
  available: readonly VoiceInfo[],
): string | undefined {
  if (!stored) return undefined;
  return available.some((v) => v.identifier === stored) ? stored : undefined;
}

/** Whether a stored voice id is plausible (stored settings are untrusted). */
export function isStoredVoiceId(v: unknown): v is string | null {
  return v === null || (typeof v === 'string' && v.length > 0 && v.length <= 256);
}
