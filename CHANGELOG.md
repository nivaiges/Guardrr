# Changelog

## 2026-10-31

### Added

- **Voice choice** (roadmap #12): Settings → Voice now has a **Voice** row that opens the phone's
  English voices; tapping one selects it and speaks a sample call, so voices can be compared by
  ear. "System default" is always first. `src/engine/voices.ts` (`callVoices`, `voiceLabel`,
  `resolveVoice`, `callLanguage`) keeps the filtering, ranking and naming pure and tested;
  `loadCallVoices`/`useCallVoices` read the list through `Speech.getAvailableVoicesAsync()` and
  re-read it each time the picker opens. The choice is saved with the other settings.
- **Drop button and catch rate** (discovered item): once the first toss is released a **Drop**
  button appears under Start. It marks the latest toss as dropped and turns into **Undo drop**
  for a mis-tap. The stats card then shows the **catch rate** (tosses not marked dropped), drops
  per call next to the tally (✗2) and ✗ on dropped tosses in the latest list; the screen-reader
  Stop summary mentions drops ("Stopped. 4 tosses, 1 drop, 75% caught, in 1 minute.").
- New `dangerText` theme color for drop marks (AA contrast in light and dark, tested).
- 26 new tests (252 total).

### Changed

- With no voice chosen, the call is now spoken in the phone's English (en-GB, en-AU, …) or US
  English, instead of the phone's language: on a phone set to e.g. Spanish the old code asked a
  Spanish voice to read "five".

### Decisions

- **Only English voices are offered**, not "the phone's language" as the roadmap first said:
  the calls are English words ("five", "two and"). Localized calls are a separate roadmap item.
- **Android "-network" voices are hidden**: they stream from a server, so their start delay is
  unpredictable — the one thing a timed call can't afford. Android voice ids like
  `en-us-x-sfg-local` are shown as "Voice SFG (US)".
- A saved voice the phone no longer has (deleted download, settings on another phone) silently
  falls back to the system default; while the voice list is still loading the saved one is used.
- **Drop marks only the latest released toss.** Simple and predictable; a drop noticed after the
  next release would mark the new toss (tap again to undo). A grace period is on the roadmap if
  this turns out to be a problem in practice. Drop also works after Stop, for the last toss.
- Catch rate = tosses not marked dropped ÷ tosses released; it only appears once something was
  dropped, so sessions where nobody uses the button look as before.

### To test on your phone

- Settings → Voice → Voice: check the list looks sensible (iOS may list many novelty voices),
  tap a few to hear them, pick one, press Start and confirm the call uses it. Restart the app and
  check the choice is remembered. Voice lists and TTS can't be checked headless.
- Android: check the list isn't empty on first open (some engines report voices only after the
  first utterance — reopening the list re-reads it).
- Practice a few phrases, tap **Drop** after one toss, check the ✗ and catch rate in the stats
  card, then tap **Undo drop** and check it disappears.

## 2026-10-30

### Added

- **Count-in** (roadmap #12): choose 4 counts, 8 counts or a full phrase of metronome before the
  first toss (Settings → Phrase). `src/engine/countIn.ts` (`effectiveCountIn`, `firstCountIndex`)
  keeps the phrase model as is and simply starts the clock part-way through the lead-in phrase:
  with 16 counts and an 8-count count-in the first click is count 9 and the first release comes
  8 counts after Start. The practice session shifts the scheduler's ticks by that offset.
- **Call speed** (roadmap #12): Slow (0.8) / Normal (1.0) / Fast (1.1) / Faster (1.3) in
  Settings → Voice, and a **Test voice** button that says "five" at the chosen speed.
- Both are saved with the other settings (missing or invalid stored values fall back to the
  defaults, so settings saved yesterday still load). `Segmented` now takes custom option labels.
- 20 new tests (226 total).

### Decisions

- **Default count-in is 8 counts**, not a full phrase: 8 counts is the length of the usual
  "5 6, 5 6 7 8" count-off, and with the defaults the first release is now 4 s after Start
  instead of 8 s. "Phrase" in the picker restores the old behavior.
- The count-in is **never shorter than the lead counts** (the first call must be spoken after
  the metronome starts) and never longer than a phrase; the setting label shows the count-in
  actually used.
- Presets don't change the count-in or the voice speed — like the sound options, they're
  personal.
- Named speeds rather than a free rate slider: TTS rates sound different per engine, and a few
  clearly different steps are easier to choose by ear. Fast stays the default (it was the fixed
  rate until now). Voice _choice_ is next on the list.

### To test on your phone

- Press Start with the defaults: the first click should be an unaccented count, the call on the
  5th click, and the first release (accented click + buzz) on the 9th click.
- Try the 4-count count-in with 4 lead counts: the call is spoken on the very first click.
- Settings → Voice: try each speed with Test voice, then practice at a fast tempo (e.g. 160 BPM)
  with Slow to see whether the call still lands before the release. TTS timing can't be checked
  headless.

## 2026-10-29

### Added

- **App icon and splash screen** (roadmap #11): a gold flag on a tilted white pole with a dotted
  toss arc, on the app blue. `scripts/generate-icons.js` draws it with no dependencies (pure
  Node + zlib, 4×4 supersampled, deterministic) into `assets/`: the iOS icon, Android adaptive
  foreground/background/monochrome layers (art kept inside the mask's safe zone), the splash
  image and the favicon.
- Splash via the **`expo-splash-screen` config plugin** (SDK 58 has no top-level native `splash`
  key anymore): blue background in light mode, the app's dark background in dark mode.
- **Accessibility pass** (roadmap #11):
  - `src/engine/accessibility.ts`: one screen-reader label for the whole practice display
    ("Count 2 of 16. 5 count. Catch on 5. 3 counts to the catch. Toss: 5."), "&" always read as
    "and", spoken durations, and Start/Stop announcements ("Started. 120 BPM, 16-count phrase,
    call on count 13." / "Stopped. 7 tosses in 2 minutes 5 seconds.").
  - Start/Stop announce through `AccessibilityInfo.announceForAccessibility`; the button has a
    label and hint.
  - Section titles are headers; settings warnings are a polite live region read as
    "Warning: …".
  - Large text: the giant count ignores the font-size setting (it's already 120 pt), the
    headline and call row cap their scaling and wrap instead of overflowing.
- 17 new tests (206 total).

### Changed

- Removed the live region on the display headline: TalkBack read it on every count, on top of
  the metronome and the spoken call.

### Decisions

- **No per-count screen-reader narration.** The click and the spoken call are the real-time
  cues; a screen reader reading counts would collide with them. The display is still fully
  readable on focus.
- Reduce-motion has nothing to act on yet (nothing animates); it's on the roadmap for when
  something does.
- The icon is generated from code rather than drawn in an editor, so it's easy to tweak and
  reproducible; swap in designed artwork any time by replacing the PNGs in `assets/`.
- Installed `expo-splash-screen@~58.0.10` with `npm install` at the SDK 58 pinned version
  (same reason as before: `npx expo install` can't reach the Expo API from the build
  environment). Checked with `npx expo prebuild` in a scratch copy that the plugin writes the
  light/dark splash colors, and that the Android bundle still exports. Roadmap #11 is done.

### To test on your phone

- The new icon and splash only show in a **development build** (`eas build --profile
development`) — Expo Go shows its own icon and splash.
- Turn on VoiceOver/TalkBack: Start should say "Started. 120 BPM…", Stop should give the
  summary, and swiping to the big display should read the current count and call. Check that
  the Start announcement doesn't overlap the first spoken call badly.
- Set the largest text size: the screen should stay readable without the count clipping.

## 2026-10-28

### Added

- **Haptics on the release** (roadmap #11): the engine marks `haptic: 'release'` on every count 1
  once tosses start (never in the lead-in); the practice session plays a heavy impact through
  `expo-haptics` (`src/feedback/haptics.ts`). New **"Vibrate on the release (count 1)"** toggle
  under Sound, saved with the other sound options (default on; older saved settings pick up the
  default).
- **Keep-awake while practicing** (roadmap #11): `expo-keep-awake` is activated on Start and
  released on Stop/unmount (`src/feedback/keepAwake.ts`).
- **Dark theme** (roadmap #11): every color now comes from light/dark palettes in `src/theme/`,
  picked from the system appearance (`useColorScheme`); `app.json` uses
  `userInterfaceStyle: "automatic"`, and `expo-system-ui` sets the root background so there's no
  white flash in dark mode. The status bar follows the theme.
- `src/theme/contrast.ts` (WCAG contrast ratio) and tests that check both palettes: 4.5:1 for
  text on every background it sits on (each display phase included) and 3:1 for the phrase-strip
  dots and stats bars.
- 20 new tests (189 total).

### Changed

- A few light-theme colors moved to pass the contrast tests: the "catch" display background is a
  lighter green, the idle phrase-strip dot is darker, and the legend under the strip is now muted
  text with a colored bullet (the yellow "release" label was hard to read).

### Decisions

- Only the release buzzes, not the catch or every count: one strong, predictable pulse is easier to
  feel through a pocket or the floor; a lighter catch buzz is a roadmap idea.
- Haptics are on by default (they cost nothing on phones without a haptic engine — errors are
  swallowed) and, like the other sound options, change on the next Start.
- Followed the system appearance rather than adding an in-app theme switch for now.
- App icon/splash and the accessibility pass are still open under #11.
- Verified the Android bundle builds with `npx expo export`. Haptics, keep-awake and the dark
  theme can't be seen or felt headless.

### To test on your phone

- `npm install` first (new native modules: `expo-haptics`, `expo-keep-awake`, `expo-system-ui`;
  all are in Expo Go).
- Start practice: the phone should buzz on each release (count 1 of every phrase after the
  lead-in). Turn "Vibrate on the release" off and Start again — no buzz.
- Leave the phone untouched past its auto-lock time while practicing — the screen should stay on;
  after Stop it should lock normally.
- Switch the phone to dark mode: the app should turn dark (including the release/in-air/catch
  colors on the big display) without restarting.

## 2026-10-27

### Added

- **Practice presets** (roadmap #10), `src/engine/presets.ts` + `src/components/PresetPicker.tsx`:
  - _Standard 16_ (120 BPM, calls 1–7 on the "5" of 5-6-7-8 — same as the defaults), _Quick 8_
    (120 BPM, 8-count phrase, calls 2–5), _Singles & doubles_ (112 BPM, 8 counts, 2–4 with "and"
    calls, no repeats), _Big tosses_ (108 BPM, calls 5–8 spoken 8 counts early, no repeats),
    _Slow 32_ (96 BPM, 32-count phrase, calls 1–7).
  - `applyPreset` sets tempo, phrase, lead counts, calls and repeats; `matchingPreset` highlights
    the preset the settings still match.
- **Session stats** (roadmap #10), `src/engine/stats.ts` + `src/components/SessionStatsCard.tsx`:
  tosses called, elapsed time, the most called count(s), a bar per call and the latest calls.
  `recordCue` folds the same per-tick cues that drive the click, voice and display; history keeps
  the last 50 tosses, the tally covers the whole session.
- `usePracticeSession` now also returns `stats` (reset on Start, kept after Stop).
- 28 new tests (169 total).

### Decisions

- Presets set the tempo too, but leave the sound options (accent, "and" clicks) alone — those are
  personal, not part of a drill.
- A preset stays highlighted when only the BPM changes (tap tempo shouldn't "lose" the preset);
  changing phrase, lead counts, calls or repeats switches the label to "Custom settings".
- Every preset is built only from what the settings editor can show (a contiguous range), checked
  by a test, so applying one never shows something the editor can't represent. The first draft of
  _Singles & doubles_ (2, 2&, 3, 3&) failed that test and became 2–4.
- Presets are locked while practicing, like the other phrase/call settings.
- A toss counts as soon as it's released on count 1, even if you press Stop before the catch.
  "Called most" lists ties together.
- Stats live only in memory for now; saving past sessions is on the roadmap. No "drop" tracking
  yet — the app can't know whether you caught it (roadmap idea: a Drop button).
- Verified the Android bundle builds with `npx expo export`.

### To test on your phone

- Tap each preset and check the settings below change to match (and the BPM). Then nudge the BPM —
  the preset should stay highlighted; change the phrase length — it should switch to "Custom".
- Practice a few phrases and watch the stats card: the toss count should go up exactly on each
  "Release!", the bars should match the calls you heard, and the card should still be there after
  Stop.
- Audio, speech and on-device timing couldn't be checked in this headless environment.

## 2026-10-26

### Added

- **Big practice display** (roadmap #8), `src/components/PracticeDisplay.tsx`:
  - Current toss and next call ("Toss 5 · Next 3"), the count in large type, and a headline:
    "Lead-in", "Release!", "5 count" while the flag is in the air, "Catch!", "Mark time".
  - Background color per phase (yellow on release, blue in the air, green on the catch).
  - "3 to catch" countdown in the air (or 'catch on the "and"'), "Release in 4 counts" once the
    next call has been spoken.
  - A strip with one dot per count of the phrase: played counts fill in, the current one is
    larger, and the release (yellow), call (blue) and catch (green) counts are marked; an "and"
    catch gets a small extra dot.
- `src/engine/display.ts` — `practiceDisplay(cue, settings)`: the pure view model behind it
  (phase, headline, detail, countdowns, phrase strip).
- **Settings are saved** (roadmap #9): BPM, phrase, calls and sound options persist across app
  restarts.
  - `src/engine/storedSettings.ts` — versioned `serializeSettings` / `parseStoredSettings`. Parsing
    never throws: corrupt JSON gives defaults, each missing/invalid field falls back to its
    default, BPM is clamped, calls that no longer fit are dropped.
  - `src/storage/` — `createSettingsStore` (debounced 500 ms writes, skips unchanged writes,
    reports storage errors instead of throwing) and the `usePersistedSettings` hook (loads on
    launch, flushes when the app goes to the background).
  - Dependency: `@react-native-async-storage/async-storage` 2.2.0 (included in Expo Go).
- 29 new tests (141 total).

### Decisions

- The display is driven by the same per-tick cues as audio and speech, so what you see can't
  disagree with what you hear. It re-renders on counts and on "and" catches only, to keep React
  work off the "and" ticks.
- On count 1 of a pop toss ("1") the strip marks the catch rather than the release, since both
  land on count 1.
- AsyncStorage over expo-sqlite's key-value store: it's the roadmap's choice, tiny, and in Expo Go.
  `npx expo install` couldn't reach the Expo API from this unattended run, so the version is
  pinned from `expo/bundledNativeModules.json` (as before). Verified the Android bundle builds with
  `npx expo export`.
- If the saved settings are still loading when you change something, your change wins.

### To test on your phone

- Press Start and watch a few phrases: does the color flip to yellow on "Release!" and green on
  "Catch!" exactly with the click? Is the count readable from across the floor?
- Check the dot strip on an 8-count and a 32-count phrase (32 dots wrap onto two rows).
- Change BPM, phrase length and the call range, force-quit the app and reopen it — the settings
  should be the same.
- Audio, speech and the visual timing on a device couldn't be checked in this headless environment.

## 2026-10-25

### Added

- **Settings screen** (roadmap #7), below the display (the screen now scrolls):
  - Tempo: BPM stepper with ±1 / ±5 buttons and a **Tap tempo** button. Both change the tempo live while practicing.
  - Phrase: counts per phrase (4 / 8 / 12 / 16 / 24 / 32) and lead counts, labelled with the count the call lands on ("Call 4 before release (on count 13)").
  - Calls: shortest / longest toss (up to the phrase length), "and" calls toggle, repeats toggle.
  - Sound: accent on count 1, quiet click on the "and"s.
  - Settings warnings shown in plain English under the settings.
- `src/engine/tapTempo.ts` — `addTap` / `tapTempoBpm`: median of the recent tap intervals (one hesitant tap doesn't skew it), resets after a 2 s pause, keeps the last 8 taps, clamped to 20–400 BPM.
- `src/engine/editSettings.ts` — `withPhraseLength`, `withLeadCounts`, `withTossRange`, `withAllowRepeats`, `tossRangeOf`, `tossCountsForRange`, `clampBpm`, `PHRASE_LENGTH_OPTIONS`. Every edit returns valid settings (shortening the phrase pulls lead counts and the call range in), checked by a 500-step random-edit test.
- `describeWarning` in `src/engine/warnings.ts`.
- `src/components/controls.tsx` (Stepper, Toggle, Segmented — core React Native only, with accessibility roles/labels) and `src/components/SettingsPanel.tsx`.
- 21 new tests (112 total).

### Decisions

- **No slider for BPM yet**: core React Native has none, and `@react-native-community/slider` is a native module. A ±1/±5 stepper plus tap tempo covers it; a slider is on the roadmap if wanted.
- Only the tempo can change while practicing. Phrase, call and sound settings are disabled while running and apply on the next Start, since the call sequence is built at start (applying them at the next phrase boundary is on the roadmap).
- The UI edits calls as a contiguous range (shortest..longest). With "and" calls on, "1 and" is left out when "1" is in range, because a pop toss is already caught on the "and" of 1. Hand-picking a set like 3/5/7 is on the roadmap.
- A longer phrase leaves the call range alone (calls 1–7 stay 1–7 in a 32-count phrase) rather than stretching it.
- No UI component tests yet (would need `@testing-library/react-native`); the logic behind the UI is pure and tested. Verified the Android bundle builds with `npx expo export`.

### To test on your phone

- Tap tempo: tap 4–8 times along with a song or another metronome — does the BPM match? Does it feel responsive while practicing?
- Try an 8-count phrase: the call range should shrink to fit, and the warning about the next call being spoken before 5/6/7 are caught should appear.
- Turn on "and" calls and listen for "two and" style calls; turn on the quiet "and" click.
- Check the settings fit on a small screen and the switches/buttons are easy to hit. Settings aren't saved yet (roadmap #9) — they reset when the app restarts.

## 2026-10-24

### Added

- **The app is playable** (roadmap #5 and #6): Start/Stop, a metronome with an accented count 1, and the toss call spoken on count 13 of each phrase. The screen shows the current count, "Lead-in" / "Toss: 5" / "Release!" / "Catch!", the next call once it has been spoken, and a BPM −/+ stepper (5 BPM steps, changes tempo live without a jump).
- `src/engine/practice.ts` — `cueForTick`: per-tick click kind (accent / count / optional quiet "and"), spoken text, release/catch (including "and" catches on the "and" tick), current and next call. `speechTextForCall` spells calls out ("five", "two and"); `displayLabelForCall` gives "2&".
- `src/audio/` — `createClickPlayer` (expo-audio, round-robin pools of preloaded players per click), `configurePracticeAudio` (plays in silent mode, mixes with music), `createVoice` (expo-speech, cuts off a previous call).
- `scripts/generate-clicks.js` — synthesizes the three 50 ms WAV clicks deterministically, so there are no third-party sound licenses to worry about.
- `src/practice/` — `createPracticeSession` (scheduler at 2 ticks per count → cues → clicks/voice/UI) and the `usePracticeSession` hook.
- Dependencies: `expo-audio` ~58.0.9, `expo-speech` ~58.0.3 (both included in Expo Go); `globals` as an explicit dev dependency for linting the Node script.
- 24 new tests (91 total), including a fake-timer session test that the first call is spoken exactly 6 s in at 120 BPM.

### Decisions

- Clicks use expo-audio players (seek to 0 + play) driven by the JS drift-correcting scheduler, as planned. Player start latency/jitter can't be measured headless; if it's audible, the next step is react-native-audio-api with lookahead (roadmap item added).
- The scheduler always runs at 2 ticks per count so "and" catches get a cue; the "and" click itself is off by default.
- Calls are spoken as words, at rate 1.1, and a new call cuts off any unfinished one.
- No `expo-audio` config plugin in `app.json`: it is only needed for recording/background audio, and adding it would request microphone permission.
- The Expo docs site couldn't be fetched from this unattended run, so the expo-audio / expo-speech APIs were taken from the installed SDK 58 type definitions. `npx expo install` couldn't reach the Expo API either; versions are pinned from `expo/bundledNativeModules.json`. Verified the Android bundle builds with `npx expo export`.

### To test on your phone

- `npm install && npm start`, open in Expo Go, press **Start**. Check: clicks are steady and count 1 sounds higher; after 16 counts of lead-in, a number is spoken on count 13; the screen flashes "Release!" on 1 and "Catch!" on the called count.
- Listen for timing: are the clicks even at 120 and at 180+ BPM? Does the spoken call land early enough to react to (it may need latency compensation)?
- Try with the ringer switch on silent (should still play) and with music playing (should mix, not pause it).
- None of the audio or speech could be heard in this headless environment.

## 2026-10-23

### Added

- `docs/colorguard-research.md` — research on how colorguard tosses are named (rotations vs counts), where releases and catches land (release on 1, an N-count caught on N, catches on "and" counts for doubles/quads), and preps, with sources.
- `src/engine/calls.ts` — what a call means: `isValidCall`, `catchPositionOf`, `catchCountOf`, `catchesOnAnd`, `callLabel` ("2 and"), `airTimeCounts`.
- Calls on **any count** the phrase allows (`maxTossCount`) and optional **"and" calls** in half-count steps (`tossCountsInRange(min, max, { andCounts: true })`). `eventsAtCount` gains `catchOnAnd`.
- `src/engine/scheduler.ts` — drift-correcting `createScheduler` (roadmap #4): absolute target times, re-arms for `target − now`, "and" subdivisions (`ticksPerCount: 2`), audio lookahead, tempo change without a jump, and skipping (not bursting) ticks after a stall. Clock/timers injected.
- `src/engine/warnings.ts` — `settingsWarnings` for the future settings UI.
- 24 new tests (67 total), including fake-timer proof that 200 late timers don't accumulate drift (and that a naive chained `setTimeout` does).

### Changed

- A **"1" call is now a pop toss caught on the "and" of 1**, not on the release count itself (released and caught on the same count is impossible). Resolves the open "1"-count question.
- `normalizeTossCounts` accepts half-count values (2.5) and rejects anything else non-integer.

### Decisions

- Kept the count-based model (catch on the called count) rather than rotation names: how many counts a double takes depends on height and tempo. A rotation-name preset is on the roadmap.
- Default call range stays 1–7 with "and" calls off; the engine now allows anything up to the phrase's last count, so the settings UI just needs to expose it.
- A catch on the "and" after the phrase's last count doesn't fit (it would collide with the next release).
- The scheduler skips ticks more than one interval late (e.g. the JS thread stalled) rather than playing them in a burst, and reports them via `onSkip`.

### To test on your phone

- Nothing visible yet — engine only. Timing accuracy of the scheduler on a real device (JS timers under load) can't be verified headless; it will be audible once the metronome (#5) lands.

## 2026-10-22

### Added

- `src/engine/random.ts` — seedable Mulberry32 RNG (`createRng`), `tossCountsInRange`, `normalizeTossCounts`, and `pickTossCount` (uniform pick, optional no-repeat that falls back gracefully when only one count is allowed).
- `src/engine/announce.ts` — announcement scheduling and per-count events: `announceCountInPhrase`, `announcementCountIndex`, `phraseAnnouncedAt`, `tossCountsThatFit` / `validateTossSettings`, a memoized deterministic `CallSequence` (one call per phrase), and `eventsAtCount` (announce / release / catch / current call for any count).
- `DEFAULT_TOSS_SETTINGS`: 16-count phrase, 4 lead counts, calls 1–7, repeats allowed.
- 25 new unit tests (determinism, uniformity, no-repeat, fit-in-phrase, full-cycle event walk, announced call == caught call).

### Decisions

- **Phrase 0 is a lead-in** with no toss: the first call must be spoken before a release, so the first release is count 1 of phrase 1. With defaults that's 16 counts (8 s at 120 BPM) of metronome before the first toss. A shorter count-in can come later (roadmap #12).
- **Lead counts** = counts before the release on which the call is spoken (1..phraseLength). Default 4 → the call lands on count 13 of 16, the "5" of the final "5 6 7 8".
- **Catch count = called number** (a "5" is caught on count 5), per the premise. That makes a "1" release-and-catch on the same count — flagged in ROADMAP for Niv to confirm.
- Allowed toss counts larger than the phrase are silently dropped (e.g. 5–7 in a 4-count phrase); if none fit, settings are rejected.
- `CallSequence` memoizes, so the call announced is guaranteed to be the one shown/caught, and a seed makes a whole session reproducible.

### To test on your phone

- Nothing visible changed — this is pure engine logic, fully covered by Jest. The app screen is the same as yesterday.

## 2026-10-21

### Added

- Expo SDK 58 TypeScript app scaffold (`blank-typescript` template, single screen, no router yet).
- Jest (`jest-expo` preset), ESLint (`eslint-config-expo` flat config + `eslint-config-prettier`) and Prettier.
- npm scripts: `test`, `typecheck`, `lint`, `format`, `format:check`.
- GitHub Actions CI (`.github/workflows/ci.yml`): typecheck, lint, format check, tests on push to `main` and PRs.
- `src/engine/timing.ts` — pure count/phrase model: `msPerCount`, `countStartTime` (absolute, non-accumulating), `countIndexAt`, `phrasePosition` (phrase, 1-based count, downbeat/last-count flags), `countIndexOf`, `countsUntilNextDownbeat`, with input validation (BPM 20–400, phrase length 1–64) and unit tests.
- README with the app premise, ROADMAP.md, this changelog.

### Decisions

- Started with a single `App.tsx` screen instead of expo-router to keep things simple; can migrate when settings/presets need navigation.
- Count indices are 0-based absolute counts since start; counts within a phrase are 1-based (count 1 = release). Count times are always computed from the start time (`start + i × msPerCount`) so the future scheduler can't accumulate drift.
- Dependencies were installed with `npm install` pinned to the SDK 58 versions from `expo/bundledNativeModules.json`, because `npx expo install` couldn't reach the Expo API from the build environment.
- Dropped the template's Expo LICENSE file; the project has no license yet (Niv to choose).

### To test on your phone

- `npm install && npm start`, open in Expo Go: you should see the Guardrr title screen with "120 BPM · 16-count phrase · 500 ms per count". No audio yet — not verifiable headless anyway.
