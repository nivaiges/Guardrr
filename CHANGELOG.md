# Changelog

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
