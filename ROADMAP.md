# Guardrr Roadmap

## Next up (priority)

- [x] **Research colorguard toss technique, then generalize toss counts.** Feedback from Niv (2026-10-22): "toss counts can be on any count ideally." Before coding, do web research on colorguard toss technique and counting conventions (how tosses are named/counted — singles, doubles, triples, quads, "5 count", etc.; where release happens relative to count 1 and "and" counts; how air time maps to the catch count; typical toss lengths; prep patterns like "5 6, 5 6 7 8"). Write findings to `docs/colorguard-research.md` with sources, infer the right model without asking Niv, and record the decisions in CHANGELOG. Then update the engine so toss counts aren't artificially limited (any count the phrase allows; resolves the "1"-count question below) and adjust tests.

- [x] 1. Scaffold Expo TS app, README with the premise, ROADMAP.md, CHANGELOG.md, Jest + ESLint + Prettier configured, CI workflow (`.github/workflows/ci.yml` running typecheck + tests).
- [x] 2. Engine: count/phrase model (bpm → ms per count, phrase position, count 1 detection) + tests.
- [x] 3. Engine: announcement scheduling (lead counts before release) + random toss-count picker (range, no-repeat option, seedable) + tests.
- [x] 4. Drift-correcting scheduler/clock + tests with fake timers.
- [x] 5. Metronome audio playback with accent on count 1; start/stop button.
- [x] 6. TTS announcement of the called count wired to the engine.
- [x] 7. Settings UI: BPM (stepper + tap tempo), phrase length, lead counts, toss range.
- [x] 8. Big visual display: current count, called toss count, "release"/"catch" cues.
- [x] 9. Persist settings (AsyncStorage).
- [x] 10. Practice presets (e.g. "Standard 16", "Quick 8"), session stats (tosses called, history).
- [x] 11. Polish: haptics on count 1, keep-awake during practice, dark theme, app icon/splash, accessibility.
  - [x] Haptics on every release (count 1), toggle in Settings → Sound.
  - [x] Keep the screen awake while practicing.
  - [x] Dark theme following the system appearance (WCAG AA contrast tested).
  - [x] App icon and splash screen (generated flag-and-toss artwork, `scripts/generate-icons.js`).
  - [x] Accessibility pass: one screen-reader label for the display, Start/Stop announcements (no per-count narration over the TTS call), headers, larger-text layout. Reduce-motion: nothing animates yet, so nothing to reduce.
- [ ] 12. Later ideas: voice choice/rate, count-in, custom prep patterns, background audio, recorded voice option.
  - [x] Count-in: 4 counts, 8 counts (default) or a full phrase before the first toss; never shorter than the lead counts.
  - [x] Voice rate: Slow / Normal / Fast (default, the old fixed 1.1) / Faster, plus a Test voice button.
  - [ ] Voice choice (`Speech.getAvailableVoicesAsync()` picker, filtered to the phone's language).
  - [ ] Custom prep patterns.
  - [ ] Background audio (keep the metronome going with the screen locked).
  - [ ] Recorded voice option.

## Discovered along the way

- [x] Validate that a called toss count fits inside the phrase (e.g. a 7-count toss in an 8-count phrase is fine; in a 4-count phrase it isn't).
- [ ] Decide whether TTS lead time needs compensation for speech-engine latency (measure on device).
- [x] Engine support for settings warnings (`settingsWarnings`): call spoken before the current toss is caught, calls dropped for not fitting, no-repeat with one call. Settings UI (#7) must display them.
- [x] "1"-count semantics: decided from research — a "1" is a pop toss caught on the "and" of 1 (see `docs/colorguard-research.md`).
- [x] Settings UI: toggle for "and" calls and a toss range up to the phrase length (engine supports both).
- [x] Audio (#5) should tick with `ticksPerCount: 2` so "and" catches get a cue; consider an optional quieter "and" click. (Engine/audio support `andClicks`; needs a toggle in #7.)
- [x] Settings UI: toggles for the count-1 accent and the quiet "and" click (`CueOptions`).
- [ ] Measure click latency on device; if expo-audio player start jitter is audible, move clicks to react-native-audio-api with lookahead scheduling (the scheduler already supports `lookaheadMs`).
- [ ] Optional preset mapping rotation names (single/double/triple/quad) to count calls.
- [ ] Settings UI: hand-pick a non-contiguous set of calls (e.g. only 3, 5 and 7); the engine supports any set, the UI only edits a range.
- [ ] Apply phrase/call settings changes while practicing at the next phrase boundary instead of requiring Stop → Start.
- [ ] Settings UI: a real BPM slider if the stepper + tap tempo isn't enough (needs `@react-native-community/slider`, a native module).
- [ ] UI component tests (needs `@testing-library/react-native`); today only the pure logic behind the UI is tested.
- [ ] Display: optional full-screen "practice mode" (hide settings, larger count) for propping the phone up across the floor.
- [ ] Display: flash/animate on "and" ticks too (today the screen only re-renders on counts and on "and" catches).
- [ ] Saved settings: migrate by `version` if the stored shape ever changes (v1 today; unknown fields are ignored).
- [ ] Save past sessions (date, tosses, duration, tally) so stats survive Stop → Start and app restarts; a simple history list.
- [ ] User-saved custom presets ("save current settings as…").
- [ ] Optional light haptic on the catch count (and/or on the call) — today only the release buzzes.
- [ ] In-app theme override (System / Light / Dark) if following the system isn't enough.
- [ ] iOS: dark and tinted app-icon variants (iOS 18+); today the one icon is used everywhere.
- [ ] Accessibility on device: check VoiceOver/TalkBack announcements don't collide with the spoken call when Start is pressed close to a call, and whether a screen-reader user would want an option to hear the phase changes too.
- [ ] Respect reduce-motion once anything animates (e.g. the "and"-tick flash idea above).
- [ ] Count-in: optionally speak the count-off ("5 6, 5 6 7 8") over the count-in clicks instead of clicks alone.
- [ ] Check on device that a "Slow" call still finishes before the release at high tempos with 1–2 lead counts; if not, warn in Settings.
- [ ] Stats: let the performer mark drops (e.g. a big "Drop" button) to track a catch rate, not just calls made.
