# Guardrr Roadmap

## Next up (priority — do this before item 4)

- [ ] **Research colorguard toss technique, then generalize toss counts.** Feedback from Niv (2026-10-22): "toss counts can be on any count ideally." Before coding, do web research on colorguard toss technique and counting conventions (how tosses are named/counted — singles, doubles, triples, quads, "5 count", etc.; where release happens relative to count 1 and "and" counts; how air time maps to the catch count; typical toss lengths; prep patterns like "5 6, 5 6 7 8"). Write findings to `docs/colorguard-research.md` with sources, infer the right model without asking Niv, and record the decisions in CHANGELOG. Then update the engine so toss counts aren't artificially limited (any count the phrase allows; resolves the "1"-count question below) and adjust tests.

- [x] 1. Scaffold Expo TS app, README with the premise, ROADMAP.md, CHANGELOG.md, Jest + ESLint + Prettier configured, CI workflow (`.github/workflows/ci.yml` running typecheck + tests).
- [x] 2. Engine: count/phrase model (bpm → ms per count, phrase position, count 1 detection) + tests.
- [x] 3. Engine: announcement scheduling (lead counts before release) + random toss-count picker (range, no-repeat option, seedable) + tests.
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

- [x] Validate that a called toss count fits inside the phrase (e.g. a 7-count toss in an 8-count phrase is fine; in a 4-count phrase it isn't).
- [ ] Decide whether TTS lead time needs compensation for speech-engine latency (measure on device).
- [ ] Settings UI should warn when the call for the next phrase is spoken before the current toss is caught (call count > phraseLength − leadCounts).
- [ ] Confirm "1"-count semantics with Niv (currently: released and caught on count 1).
