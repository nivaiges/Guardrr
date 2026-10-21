# Guardrr Roadmap

- [x] 1. Scaffold Expo TS app, README with the premise, ROADMAP.md, CHANGELOG.md, Jest + ESLint + Prettier configured, CI workflow (`.github/workflows/ci.yml` running typecheck + tests).
- [x] 2. Engine: count/phrase model (bpm → ms per count, phrase position, count 1 detection) + tests.
- [ ] 3. Engine: announcement scheduling (lead counts before release) + random toss-count picker (range, no-repeat option, seedable) + tests.
- [ ] 4. Drift-correcting scheduler/clock + tests with fake timers.
- [ ] 5. Metronome audio playback with accent on count 1; start/stop button.
- [ ] 6. TTS announcement of the called count wired to the engine.
- [ ] 7. Settings UI: BPM (slider + tap tempo), phrase length, lead counts, toss range.
- [ ] 8. Big visual display: current count, called toss count, "release"/"catch" cues.
- [ ] 9. Persist settings (AsyncStorage).
- [ ] 10. Practice presets (e.g. "Standard 16", "Quick 8"), session stats (tosses called, history).
- [ ] 11. Polish: haptics on count 1, keep-awake during practice, dark theme, app icon/splash, accessibility.
- [ ] 12. Later ideas: voice choice/rate, count-in, custom prep patterns, background audio, recorded voice option.

## Discovered along the way

- [ ] Validate that a called toss count fits inside the phrase (e.g. a 7-count toss in an 8-count phrase is fine; in a 4-count phrase it isn't).
- [ ] Decide whether TTS lead time needs compensation for speech-engine latency (measure on device).
