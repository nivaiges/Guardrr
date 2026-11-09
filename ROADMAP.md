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
  - [x] Voice choice: picker of the phone's offline English voices (calls are English words), phone's region and enhanced voices first, tap to preview.
  - [ ] Custom prep patterns.
  - [ ] Background audio (keep the metronome going with the screen locked).
  - [ ] Recorded voice option.

- [x] **Niv's feedback 2026-11-05:** front camera on by default behind the practice display, with a
      flip button (top right) for the back camera; move stats, History, presets and settings to a second
      page you swipe to; default to **Quads 155** (155 BPM, calls 3, 3&, 4, 4&, 5).
- [ ] Camera: check on device that the preview doesn't add audio/haptic latency or drain the
      battery too fast in a long session; consider a "dim display" option.
- [ ] Camera: optional recording of a session (needs microphone permission decision, storage).
- [x] Practice page: page dots / a swipe hint the first time the app opens.

## Discovered along the way

- [x] Morning check: typecheck, lint, unit tests, iOS/Android/web bundles and a headless web smoke test, every morning (GitHub workflow + scheduled task that notifies on failure).
- [x] Display: the 16-dot phrase strip wrapped onto a second line on a 390-pt-wide phone — dots now shrink to fit, long phrases split into even rows (`phraseStripLayout`).
- [ ] Morning check on real platforms: Maestro flows on an Android emulator in CI (free), and iOS simulator later (needs macOS runners).
- [ ] Extend the smoke test as features land (e.g. voice picker, count-in options). Hand-picked calls, call shortcuts, History editing and custom presets: done.

- [x] Validate that a called toss count fits inside the phrase (e.g. a 7-count toss in an 8-count phrase is fine; in a 4-count phrase it isn't).
- [ ] Decide whether TTS lead time needs compensation for speech-engine latency (measure on device).
- [x] Engine support for settings warnings (`settingsWarnings`): call spoken before the current toss is caught, calls dropped for not fitting, no-repeat with one call. Settings UI (#7) must display them.
- [x] "1"-count semantics: decided from research — a "1" is a pop toss caught on the "and" of 1 (see `docs/colorguard-research.md`).
- [x] Settings UI: toggle for "and" calls and a toss range up to the phrase length (engine supports both).
- [x] Audio (#5) should tick with `ticksPerCount: 2` so "and" catches get a cue; consider an optional quieter "and" click. (Engine/audio support `andClicks`; needs a toggle in #7.)
- [x] Settings UI: toggles for the count-1 accent and the quiet "and" click (`CueOptions`).
- [ ] Measure click latency on device; if expo-audio player start jitter is audible, move clicks to react-native-audio-api with lookahead scheduling (the scheduler already supports `lookaheadMs`).
- [ ] Optional preset mapping rotation names (single/double/triple/quad) to count calls.
- [x] Settings UI: hand-pick a non-contiguous set of calls (e.g. only 3, 5 and 7) — call chips in Settings → Calls.
- [x] Apply phrase/call settings changes while practicing at the next phrase boundary instead of requiring Stop → Start (`LiveCueTimeline`; sounds and voice speed apply at once).
- [ ] Settings UI: a real BPM slider if the stepper + tap tempo isn't enough (needs `@react-native-community/slider`, a native module).
- [ ] UI component tests (needs `@testing-library/react-native`); today only the pure logic behind the UI is tested.
- [ ] Display: optional full-screen "practice mode" (hide settings, larger count) for propping the phone up across the floor.
- [ ] Display: flash/animate on "and" ticks too (today the screen only re-renders on counts and on "and" catches).
- [ ] Saved settings: migrate by `version` if the stored shape ever changes (v1 today; unknown fields are ignored).
- [x] Save past sessions (date, tosses, duration, tally) so stats survive Stop → Start and app restarts; a simple history list (History card).
- [x] User-saved custom presets ("save current settings as…") — Presets → Save as preset…, delete with Undo, up to 12.
- [x] Optional light haptic on the catch count (Settings → Sound → "Light tap on the catch").
- [ ] Optional haptic on the call too (for performers who can't hear the voice), if the catch tap proves useful.
- [x] Calls: quick All / Odd / Even shortcuts above the call chips (no "Clear": a session needs at least one call).
- [x] Calls: reword the "Picked by hand" note per shortcut ("Odd counts only." / "Even counts only.").
- [ ] In-app theme override (System / Light / Dark) if following the system isn't enough.
- [ ] iOS: dark and tinted app-icon variants (iOS 18+); today the one icon is used everywhere.
- [ ] Accessibility on device: check VoiceOver/TalkBack announcements don't collide with the spoken call when Start is pressed close to a call, and whether a screen-reader user would want an option to hear the phase changes too.
- [ ] Respect reduce-motion once anything animates (e.g. the "and"-tick flash idea above).
- [ ] Count-in: optionally speak the count-off ("5 6, 5 6 7 8") over the count-in clicks instead of clicks alone.
- [ ] Check on device that a "Slow" call still finishes before the release at high tempos with 1–2 lead counts; if not, warn in Settings.
- [x] Stats: let the performer mark drops (e.g. a big "Drop" button) to track a catch rate, not just calls made.
- [ ] Drop button: a grace period (or "drop the previous toss") for drops marked just after the next release — today Drop always marks the latest released toss.
- [x] Save drops with past sessions, to show the catch rate per call over time (History → "Dropped most").
- [ ] Voice picker: check on device how long the iOS English voice list is (novelty voices like "Bubbles" included) and whether it needs a search box or a "hide novelty voices" filter.
- [ ] Localized calls (speak the numbers in the phone's language) — today calls are always English words.
- [x] History: delete one session / clear all (Edit → Delete per session, "Clear all history" with an inline confirm; Undo after every delete).
- [ ] History: catch-rate trend per call over time (e.g. a small chart per call, last 10 sessions).
- [x] History: export/share sessions (CSV) for a coach — History → Share (share sheet; a .csv download on the web).
- [ ] History: swipe a row to delete (today: Edit → ✕), if Edit mode feels slow on device.
- [ ] History: filter by tempo / phrase length (e.g. only sessions at 120 BPM, 16 counts).
- [x] Accessibility (web): radio/checkbox chips expose `aria-checked` (RN Web ignores `accessibilityState`).
- [x] Custom presets: rename, and "update preset with current settings" (also "Save N BPM to …").
- [x] Custom presets: reorder — Move earlier / Move later on a selected preset of your own.
- [ ] Custom presets: drag to reorder, if Move earlier / later feels slow with many presets.
- [x] Page dots: tap to switch pages.
- [ ] Page dots: check on device they don't sit under the iOS home indicator (safe-area insets).
- [ ] Custom presets: optionally include sound options (accent, "and" clicks, voice) — today a preset is tempo + toss settings only, like the built-ins.
- [x] Show which preset a History session used (the preset's name at save time, under each session's date).
- [ ] History: a session whose phrase length changed mid-practice is saved with the last phrase length; consider saving each segment.
- [ ] Live changes: choose a voice while practicing (today voice previews wait for Stop because they'd talk over the calls) — e.g. pick without previewing.
- [ ] Live changes: optional "apply now" that restarts the phrase immediately, for a performer who wants the new drill without finishing the current toss.
- [x] History: changing the tempo or preset after Stop no longer relabels the finished session.
- [ ] History share: check on device what Messages/Mail/Notes do with the CSV text; if a coach
      needs a real attachment, share a .csv file instead (needs `expo-sharing` + `expo-file-system`).
- [x] History: filter by preset (e.g. catch rate on Quads 155 only) — chips above the totals;
      Share sends only the filtered sessions.
- [ ] History: remember the chosen filter across app restarts (today it resets to All).
- [ ] Smoke test: the live-change check ("changes start with toss 2") failed once on a busy
      machine (the 8-count tap landed in a different count than planned) and passed on a re-run;
      make it wait for a known count instead of a fixed delay.
