# Changelog

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
