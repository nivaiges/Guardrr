# Guardrr

A practice tool for colorguard performers to sharpen toss technique.

## The premise

A metronome plays continuously at your tempo, grouped into phrases (16 counts by default).
A toss prep is typically counted "5 6, 5 6 7 8" and you **release on count 1** of the phrase.
Shortly before the release, Guardrr **speaks a random toss count** (1–7 by default). You release
on 1, **catch on the called count** (a "5" is caught on count 5, a "6" on count 6), keep marking
time until the phrase ends, and the cycle repeats with a new random call.

Calls can be on any count the phrase allows (up to 16 in a 16-count phrase), and optionally on
"and" counts — a "2 and" is caught on the "and" after 2. A "1" is a pop toss, caught on the "and"
of the release. See [docs/colorguard-research.md](docs/colorguard-research.md) for the counting
conventions this is based on.

Configurable (planned): BPM, phrase length (8 / 16 / 32…), how many counts before the release the
call is announced, the allowed toss counts, whether consecutive repeats are allowed, a spoken or
visual count display, and an accent on count 1.

## Tech

- [Expo](https://expo.dev) (SDK 58) + React Native + TypeScript
- `expo-speech` for spoken calls, `expo-audio` for metronome clicks (planned)
- Pure, framework-free timing/sequence logic in [`src/engine/`](src/engine) with Jest tests
- ESLint (`eslint-config-expo`) + Prettier; GitHub Actions CI runs typecheck, lint, format check and tests

## Development

```bash
npm install
npm start            # Expo dev server — scan the QR code with Expo Go
npm test             # Jest
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run format       # Prettier
```

See [ROADMAP.md](ROADMAP.md) for what's next and [CHANGELOG.md](CHANGELOG.md) for what's shipped.
