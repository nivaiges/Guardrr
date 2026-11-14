# Changelog

## 2026-11-14

### Added

- **Double buzz with the call** (roadmap: "Optional haptic on the call too"). A new switch in
  Settings → Sound makes the phone give a double pulse on the count the call is spoken, so a
  performer who can't hear the voice (loud gym, music playing, hard of hearing) knows to glance
  at the screen for the call. Off by default; saved with the other sound options.
  - Engine: `CueOptions.callHaptics`, `HapticKind` gains `'call'`.
  - Feedback: `createHapticPlayer` plays the call with `Haptics.notificationAsync(Warning)`.
- **Open a call's sessions from the session stats** (roadmap: "Call detail: open it from the
  session stats"). In **Last session** (or **This session** while practicing), a call that
  already has saved sessions is underlined; tap its row to list every session it came up in —
  date, drill, "2 of 4", 50% — right under the row. Tap again or **Close** to hide it. A hint
  under the bars says the rows are tappable.
  - UI: the panel is now one `CallDetailPanel` shared by History and the stats card.
- Smoke test: 77 checks (the call-buzz switch being saved, and opening/closing a call from the
  session stats are new). Screenshots `22-stats-call-detail` and `23-call-buzz` added to the
  README gallery.
- 5 new unit tests (506 total).

### Decisions

- **The call buzz is a "look at the screen" signal, not the number itself.** A haptic can't
  say "five" quickly enough at 155 BPM with a 4-count lead, so it uses the system's distinct
  warning pattern (double pulse) and the screen shows the call. Buzzing the number as pulses is
  on the roadmap in case glancing proves too hard.
- **One vibration per tick: release, then call, then catch.** The release buzz is the one the
  toss depends on; the call carries new information, so it beats the catch tap when a call is
  spoken on the count a toss is caught (e.g. a 13 with a 4-count lead in 16).
- **The first call buzzes too**, in the count-in, since it is spoken there.
- **The stats card's call detail covers all of History**, not the History card's filters: it's
  about the call you just practiced, wherever it came up. Calls with no saved sessions yet
  (the running session is saved at Stop) aren't tappable.

### To test on your phone

- Settings → Sound → turn on **Double buzz with the call**, and Start with the phone in your
  pocket or on the floor: you should feel a double pulse when the call is spoken that feels
  different from the heavy buzz on the release. (Haptics can't be felt in the headless web
  check, so this is untested on a device.)
- After a session, tap a call in **Last session**; the list should match that call's rows in
  History.

## 2026-11-13

### Added

- **Choose how the count-off is counted** (roadmap #12: "Custom prep patterns"). With
  **Speak the count-off** on, a new row of chips — **Count it as** — offers:
  - **5 6, 5 6 7 8** — the prep count, as before (default);
  - **1 – 8** — a straight "one, two, three … eight" for drills counted in from a full eight;
  - **5 6 7 8** — only the last four counts.

  The switch's summary follows the choice (e.g. _"Speak the count-off (1 2 3 4, then the
  call)"_ with the default 4-count lead). As before, the voice always stops before the call.
  The choice is saved with the other sound options.
  - Engine: `CountOffPattern`, `COUNT_OFF_PATTERNS`, `countOffPatternLabel`,
    `isCountOffPattern`; `countOffWord`/`countOffWords`/`countOffSummary` take a pattern;
    `CueOptions.countOffPattern`.

- **Open a call's sessions from "Dropped most"** (roadmap: "Call detail: open it from
  'Dropped most'"). The calls in the "Dropped most" line are now tappable (underlined). A call
  with trend bars opens its list under its trend row, as before; a call you've only practiced
  in one session so far — no trend yet — opens it right under the "Dropped most" line. Tap
  again or **Close** to hide it.
  - Engine: `callDetailAnchor` (historyTrend.ts).
- Smoke test: 73 checks (the straight count-off being spoken, its chips hiding when the
  count-off is off, and opening/closing a call from "Dropped most" are new). Screenshots
  `20-count-off-straight` and `21-dropped-detail` added to the README gallery.
- 11 new unit tests (501 total).

### Decisions

- **"Custom prep patterns" means the count-off words, as three fixed choices.** The prep
  ("5 6, 5 6 7 8") is how guards are counted in; a straight eight and a quick "5 6 7 8" are
  the other common ways to start a drill. A free-text word list would need a TTS check per
  word and a new editor; three chips cover the common cases now (a custom list is on the
  roadmap if needed).
- **Prep and straight need 8 counts of count-in.** With a 4-count count-in all three patterns
  fall back to "5 6 7 8", the only count that fits.
- **A detail opened from "Dropped most" moves under the trend row when the call has one**, so
  there is only ever one detail panel and its bars stay in view.
- `Segmented` (the chip-row control) now accepts text options as well as numbers.

### To test on your phone

- Turn on **Speak the count-off**, pick **1 – 8** and Start: you should hear "one, two, three,
  four" over the count-in clicks and then the call, without the words lagging behind the
  clicks at 155 BPM.
- In History, tap a call under "Dropped most" — with VoiceOver on too, if you can, to check
  each call can be focused on its own.

## 2026-11-12

### Added

- **Filter History by tempo** (roadmap: "History: filter by tempo / phrase length"). A second
  row of chips under the preset chips — **All tempos**, **120 BPM**, **155 BPM** — narrows the
  totals, "Dropped most", the trends, the session list and Share to one tempo. When your
  sessions use more than one phrase length, the chips say which (**155 BPM · 8**). The row
  only appears when the sessions shown span two or more tempos, so picking a preset that you
  always practice at one tempo hides it. Your choice is remembered after a restart, like the
  preset filter. A shared CSV is titled with the filters, e.g. _"Guardrr history: 120 BPM · 16 counts"_.
  - Engine: `tempoFilters`, `resolveTempoFilter`, `filterByTempo`, `tempoFilterLabel`,
    `combinedFilterLabel`, `parseTempoFilterKey`; `PracticeSettings.historyTempoFilter`.
- **Every session of one call** (roadmap: "History trend: a per-call detail view"). Tap a
  call's trend row under "Dropped most" and a panel opens right under it: _"7 — every
  session"_, its totals (_4 sessions · 15 tosses · 67% caught_) and each session newest first
  with its date, drill and how many of that call you caught (**2 of 4 · 50%**). Tap the row
  again or **Close** to hide it. It follows both filters. Lists up to 25 sessions, then "and N
  older sessions".
  - Engine: `callDetail`, `CALL_DETAIL_SESSIONS` (historyTrend.ts).
- Smoke test: 68 checks (tempo chips, the tempo filter surviving a reload, a one-tempo preset
  hiding them, and the call detail opening/closing are new). Screenshots `18-history-tempo`
  and `19-call-detail` added to the README gallery.
- 19 new unit tests (490 total).

### Decisions

- **Tempo and phrase length are one filter, not two.** A tempo means little without its
  phrase ("120 BPM" in Quick 8 vs Standard 16 are different drills), and two more chip rows
  would crowd History. The phrase length is only named when it actually varies.
- **The tempo filter is applied after the preset filter, and its chips are built from what
  the preset leaves.** Inside a preset there is usually one tempo, so the row disappears
  instead of offering a choice that changes nothing; the saved tempo comes back when you
  return to All.
- **The call detail opens in place, not on a new screen.** The app has no navigation stack
  yet (two swipe pages), and an inline panel keeps the trend bars it explains in view.
- The detail counts drops per call the same way the trend does (never more drops than
  tosses), so its totals and the "Dropped most" numbers always agree under the same filter.

### To test on your phone

- Practice a couple of sessions at different tempos (e.g. Quads 155 and a slower drill),
  then try the tempo chips in History — tell me if two rows of chips feel too busy.
- Tap a call's trend bars: the list of sessions should open right under it and be easy to
  close while scrolling.

## 2026-11-11

### Added

- **Drop marks the right toss right after a release** (roadmap: "Drop button: a grace period").
  For the first 2 counts after a release — as long as the new toss hasn't been caught — Drop
  marks the toss _before_ it, and the button gets a second line saying which: **Drop · toss 3 ·
  5**. So in Quick 8 with a 7 (caught one count before the next release), a drop tapped a beat
  late still lands on the toss you dropped. A second tap undoes it, as before. Screen readers
  hear "Marks the previous toss (5) as dropped".
  - Engine: `dropTarget`, `dropButtonText`, `DROP_GRACE_COUNTS`; toss records remember when
    they were released and whether their catch was reached.
- **Catch-rate trend per call in History** (roadmap: "History: catch-rate trend per call").
  Under "Dropped most", each of those calls gets a row of small bars — its catch rate in each of
  its last 10 sessions, oldest on the left — then _earlier → later_ and **↑ better**, **↓
  worse** or _steady_. It follows the History filter (e.g. only Quads 155 sessions).
  - Engine: `callTrend`, `callTrends`, `trendHalves`, `trendDirection` (historyTrend.ts).
- Smoke test: 62 checks (Drop naming toss 1 right after toss 2 is released, and a trend reading
  "getting better" are new). Screenshot `17-drop-previous` added to the README gallery.
- 20 new unit tests (471 total).

### Fixed

- "Called most" in the session stats wrapped onto two lines when calls tied ("4, 4 and"),
  pushing the tally down. It now uses the short labels ("4, 4&") and past two ties reads
  "1, 2 +3"; screen readers still hear every call.

### Decisions

- **Grace = 2 counts, and only while the new toss is in the air.** Nobody can know a toss just
  released will be dropped, so a tap then means the last one. Two counts covers a late tap after
  a catch on the count before the release, without stealing taps for long. A "1" (caught on the
  "and" of 1) ends the grace at its catch. The first toss of a run has nothing before it, so Drop
  marks it. Stopping during the grace keeps the same target, so a drop tapped right after Stop
  also lands on the toss just caught.
- **Trend = earlier half vs later half, toss-weighted.** A call's sessions are split in two (the
  middle one left out when odd) and each half's tosses pooled, so a 2-toss session can't swing
  it. Under 5 points of change reads as _steady_ (one drop in 20 tosses is noise). The numbers
  shown ("50% → 88%") are those two halves, so the words and numbers always agree — the first
  attempt showed the first and last session ("100% → 100% ↑ better"), which was confusing.
- Trends are shown only for the calls in "Dropped most" (at most 3) and only once a call came
  up in 2 or more sessions, to keep History short.

### To test on your phone

- Quick 8 with a 7 in the calls: drop one on purpose and tap **Drop** just after the next
  release. The button should read "toss N · 7" and the stats should mark that 7. Tell me if
  2 counts feels too short or too long.
- After a few sessions with drops, check the trend bars under "Dropped most" read sensibly.

## 2026-11-10

### Added

- **Spoken count-off** (roadmap: "Count-in: optionally speak the count-off"). New switch under
  the count-in in Settings: **Speak the count-off**. The voice counts the guard in over the
  count-in clicks the way a captain would — "five, six, five six seven eight" over an 8-count
  (or full-phrase) count-in, the 5 and 6 held for two counts each, or a quick "five six seven
  eight" over a 4-count one — and stops as soon as the first call is due. The switch's label
  says what you'll hear with your settings: with Quads 155 (call 4 counts early) it's _"5 6, then
  the call"_; with a 2-count lead, _"5 6, 5 6, then the call"_. Off by default; saved with the
  sound options and kept when you switch presets.
  - Engine: `countOffWord`, `countOffWords`, `countOffSummary` (countIn.ts); `CueOptions.countOff`.
- **History remembers its filter.** The preset chip you picked in History (e.g. _Quads 155_)
  comes back after the app restarts instead of resetting to All.
  - Engine: `parseHistoryFilterKey`; `PracticeSettings.historyFilter`.
- Smoke test: 60 checks (the History filter surviving a reload is new). Screenshot
  `16-count-off` added to the README gallery.
- 15 new unit tests (451 total).

### Fixed

- The flaky smoke check "changes start with toss 2" read the note under Phrase right after the
  tap, before React re-rendered it, so it sometimes saw the generic "next toss that hasn't been
  called yet". It now waits (up to one count) for the toss number. The app itself was fine — the
  accent check in the same run always showed the change landing on toss 2. Passed 3 runs in a row.

### Decisions

- The count-off is lined up with the **end** of the lead-in phrase, so the "8" always falls on
  the count before the release whatever the phrase length (16, 32, 8…).
- **The call wins.** Count-off words stop on the count the first call is spoken (lead counts
  before the release) and never come back that run, so a word can't cut the call off (each new
  utterance stops the last one). Since the lead is always at least 1, the spoken "eight" is
  always replaced by the call — you hear "5 6, 5 6 7" then the call with a 1-count lead.
- Words, not digits, are sent to the speech engine ("five", like the calls), and only during the
  count-in: later phrases keep their prep silent, since the call is already being spoken there.
- A count-in of 5–7 counts (possible with a long lead) gets the quick "5 6 7 8" on its last
  4 counts. If the lead swallows the whole count-off, the switch says so ("no room before the
  call: shorten the lead") instead of silently doing nothing.
- A saved History filter whose sessions were all deleted shows All but isn't forgotten:
  History loads after the settings, so dropping an unmatched key on load would lose a valid
  choice. It's only replaced when you tap another chip.

### To test on your phone

- Turn on **Speak the count-off**, set the count-in to 8 and press Start: check the "five …
  six …" lands on the clicks and the call still comes out clean. Try it at 155 BPM with the
  _Fast_ voice — if the words drag behind the clicks, tell me (speech latency can't be measured
  here; noted in the roadmap).
- Pick a preset chip in History, close the app fully and reopen: the same chip should be
  selected.

## 2026-11-09

### Added

- **Filter History by preset** (roadmap: "History: filter or total by preset"). When your
  history spans more than one preset, chips appear above the totals — _All 5 · Quads 155 2 ·
  Standard 16 2 · No preset 1_. Tap one and the totals, catch rate, "Dropped most" and the
  session list cover only that drill. **Share** sends what you're looking at: with a filter on,
  only those sessions, titled _Guardrr history: Quads 155 (2 sessions)_.
  - Engine: `historyFilters`, `filterHistory`, `resolveHistoryFilter`, `historyFilterLabel`;
    `historyShareTitle` takes the filter's label.
- **Reorder your presets** (roadmap: "Custom presets: reorder"). Select one of your own presets
  and **‹ Move earlier** / **Move later ›** appear next to Rename, so the drills you use most
  come first. Saved right away. Built-in presets always stay first.
  - Engine: `presetMoves`, `moveCustomPreset`; `useCustomPresets().movePreset`.
- Smoke test: 6 new checks (59 total) — the three filters and a filtered Share on a history with
  an older hand-tuned session; moving a preset and the order surviving a reload. Screenshots
  `14-history-filter` and `15-move-preset` added to the README gallery (the sample history now
  has a Quads 155 session too).
- 20 new unit tests (436 total).

### Decisions

- Filters group sessions by the **preset name saved with them**, most recently practiced first,
  then "No preset" (hand-tuned settings and sessions from before presets were recorded). Names
  that differ only in case stay apart — they were different presets when saved.
- The chips only show when there's something to choose (two groups or more), and a filter whose
  sessions are all deleted falls back to All. The choice isn't saved yet; it resets to All when
  the app reopens (roadmap item added).
- Edit → **Clear all history** still clears everything, not just the filtered sessions — its
  confirm already says how many ("Delete all 5 sessions?").
- Reordering uses **Move earlier / Move later** buttons rather than drag-and-drop: no new native
  module (drag needs a gesture library), works with a screen reader ("Moved Odd drill earlier: 1
  of 2 of your presets"), and with at most 12 presets a few taps is enough. Drag stays on the
  roadmap.

### To test on your phone

- Practice a few tosses with two different presets, Stop, and swipe to History: tap a preset
  chip and check the totals and rows only cover that preset. Tap **Share** with a filter on and
  check the CSV only has those sessions.
- Save two presets of your own, select one and tap **Move earlier / Move later**; restart the
  app and check the order stuck.
- The smoke test's live-change check failed once on the first run here (a timing check on a busy
  machine) and passed on a re-run; nothing in today's change touches it. Noted in the roadmap.

## 2026-11-08

### Added

- **History shows the preset of each session** (roadmap: "show which preset a History session
  used"). A small line under each date reads _Quads 155 · 155 BPM_, or _120 BPM · 16 counts_
  for hand-tuned settings and for sessions saved before today. A screen reader hears the preset
  too.
- **Share your history as CSV** (roadmap: "export/share sessions (CSV) for a coach"). History →
  **Share** opens the phone's share sheet with every saved session as CSV text — one row per
  session, newest first: date, time, preset, BPM, counts per phrase, minutes, tosses, dropped,
  caught %, calls and drops by call (`3: 3; 3&: 2`). It pastes straight into Numbers / Sheets /
  Excel. On the web (no share sheet) it downloads `guardrr-history-YYYY-MM-DD.csv`.
  - Engine: `presetForToss`, `SessionRecord.preset`, `sessionRowDetail`, `historyCsv`,
    `csvCell`; `src/sharing/shareHistory.ts` wraps React Native's `Share`.
- Smoke test: 3 new checks (53 total), including the downloaded CSV's contents. Screenshot
  `13-history-share` added to the README gallery.
- 27 new unit tests (416 total).

### Fixed

- Changing the tempo (or tapping another preset) after Stop relabelled the finished session the
  next time it was re-saved — after a late Drop, or when the app went to the background. The
  smoke test caught it: a session practiced at 120 BPM was saved as 121 after a BPM + 1 and a
  reload. A session now keeps the tempo, phrase and preset that were playing at Stop.

### Decisions

- A session stores the preset's **name at save time**, not its id: renaming or deleting a preset
  later doesn't rewrite history, and nothing breaks when a custom preset is gone. Sessions keep
  the preset matched by what was playing at Stop (like the phrase length), ignoring tempo — the
  tempo is shown next to it.
- Sharing sends the CSV as **text** through React Native's built-in `Share` rather than a file
  attachment: no new native module (works in Expo Go), and the text pastes into a spreadsheet.
  A real `.csv` attachment would need `expo-sharing` + `expo-file-system`; added to the roadmap
  in case a coach needs one.
- CSV details: local, sortable dates (`2026-11-08`, `18:05`), minutes with one decimal, "&" for
  an "and" call, CRLF line endings. Preset names are typed by the performer, so a leading
  `= + - @` is defused (prefixed with `'`) so it can't run as a spreadsheet formula.

### To test on your phone

- Practice a few tosses with Quads 155, Stop, and swipe to History: the new row should say
  _Quads 155 · 155 BPM_. Change the tempo afterwards: the row shouldn't change.
- Tap **Share** in History and send it to yourself in Messages or Mail, then paste it into a
  spreadsheet: one column per field. Tell me if your coach would rather get a file attachment.
- The share sheet can't be opened here; on the web build the CSV download was checked in a
  headless browser.

## 2026-11-07

### Added

- **Change settings without stopping** (roadmap: "apply phrase/call settings changes while
  practicing at the next phrase boundary"). Every setting stays tappable while practicing:
  - Tempo, the accent, "and" clicks, release/catch vibration and voice speed apply right away.
  - Phrase length, lead counts, calls, repeats and presets start with **the next toss that hasn't
    been called yet**: the toss in the air finishes its old phrase, and the first new call is
    spoken with the new lead counts. Settings → Phrase says _Your changes start with toss 2._
  - The count display and the title show what is playing until then.
  - Only choosing and testing voices waits for Stop — the previews would talk over the calls.
  - Engine: `LiveCueTimeline` (segments of settings with continuous phrase numbers),
    `liveSettingsNote`, `sameTossSettings`; `CallSequence` takes the previous call so "no
    repeats" holds across a change. Session: `setSettings`, `setCueOptions`, `setVoice`,
    `activeSettings`, `pendingChange`.
- **Tap the page dots** to switch between practice and settings (a screen reader hears "Page 1 of
  2: Practice — Shows Settings & stats").
- Smoke test: 4 new checks (50 total), including a real 18-second run that switches from 16 to 8
  counts mid-practice and checks the releases land on clicks 9, 25 and 33. Screenshot
  `12-live-change` added to the README gallery.
- 22 new unit tests (389 total).

### Decisions

- **When a change starts:** at the first release whose call neither the old nor the new settings
  would have spoken yet (the larger of the two lead counts decides). Example at 16 counts,
  called 4 early: change to 8 counts on count 3 of toss 1 → toss 2 (16 counts later) is the first
  8-count phrase, called 2 early on count 15 of toss 1's phrase instead of count 13.
- Changing again before that call is spoken replaces the pending change; going back to what's
  playing cancels it. After the call is spoken it can't be taken back, so a further change queues
  behind it.
- A new voice speed applies from the next call (the current call finishes at the old speed).
- History saves a session with the phrase length that was playing at Stop.
- The page dots are one target that flips pages (not one per dot): with two pages that's the same
  thing, and an 8-pt dot is too small to aim at. Its tap area is small (8 pt around the pill), but
  note it now catches taps where it overlaps the settings page while scrolling.

### To test on your phone

- Start practicing, swipe to Settings, change the phrase from 16 to 8 (or tap another preset):
  the toss in the air should finish normally, the next call should come at the new lead, and
  the count display should switch to 8 dots on that release — no hiccup in the clicks.
- Toggle "Accent count 1" and the "and" clicks while practicing: they should change on the next
  click. Change "Call speed": the next call should use it.
- Tap the two dots at the bottom: they should switch pages; check they're not under the home
  indicator.
- Audio, speech and vibration can't be heard here; the timing of the switch was checked in a
  headless browser (clicks and accents recorded).

## 2026-11-06

### Added

- **Rename your presets.** Select one of your own presets: **Rename** sits next to **Delete**.
  The name form opens with the current name; the same rules as saving apply (no empty names, no
  name another preset already has; changing only the letter case is fine).
- **Update a preset with new settings** (roadmap: "update preset with current settings"). Apply
  one of your presets and change its calls, phrase or lead counts: Presets says _Changed from
  "name"_ and offers **Update "name"** next to **Save as new…**. Change only the tempo and it
  offers **Save 150 BPM to "name"**. Built-in presets are never changed.
  - Engine: `renameCustomPreset`, `renameProblem`, `updateCustomPreset`, `presetUpdateOffer`;
    the `useCustomPresets` hook gains `renamePreset` / `updatePreset`.
- **Page dots** at the bottom of both pages, and a first-open hint: the practice link reads
  **Swipe left for settings & stats ›** until you've opened the settings page once (remembered).
  Page math lives in `src/engine/pages.ts` and clamps iOS overscroll to a real page.
- Smoke test: 7 new checks (46 total). Screenshot `11-update-preset` added to the README gallery.
- 15 new unit tests (367 total).

### Fixed

- An Odd/Even preset saved with "and" calls was described as "Odd calls 1–15 and"; it now reads
  "Odd calls 1–15 with ands". Spotted in today's screenshots.

### Decisions

- **Update** is offered for the custom preset you applied (or saved) last on the settings page,
  remembered until you apply another preset; it isn't remembered across app restarts (after a
  restart, apply the preset again first). This keeps the button from guessing which preset a
  random tweak belongs to.
- Update is refused if the new settings already match another preset, so there are still never
  two chips for one drill.
- Rename, Update and Delete stay available while practicing; they don't touch the running drill.
- The "seen the settings page" flag lives in the stored settings blob (`swipeHintSeen`) rather
  than a new storage key; settings saved before today show the hint once.

### To test on your phone

- First open after `git pull`: the link under Start should say "Swipe left for settings &
  stats ›"; swipe left once and it goes back to "Settings & stats ›", also after a restart.
- Check the two dots sit clear of the iPhone home indicator on the practice page and don't cover
  anything important at the bottom of the settings page.
- Save a preset, rename it, change its calls and tap **Update**; tap another preset and back:
  the update should stick.

## 2026-11-05

### Changed (Niv's feedback, same day)

- **Camera on the practice screen.** The front camera fills the screen behind the count display
  (mirrored), so you can watch your toss. The round **⟲ Front/Back** button at the top right flips
  to the back camera. Settings → Camera turns the preview off or picks the camera; both are saved.
  Preview only: nothing is recorded, and the app doesn't ask for the microphone.
  The camera pauses while the settings page is showing, to save battery.
- **Two pages.** The practice page has only the essentials: title and tempo, the flip button, the
  count display (85% opaque over the camera, no legend), Start / Drop and a **Settings & stats ›**
  link. Swipe left for stats, History, presets, camera and settings (**‹ Practice** to go back).
- **Default is Quads 155**: 155 BPM, 16 counts, called on 13, calls 3, 3 and, 4, 4 and, 5. It's
  also the first preset. "Standard 16" (120 BPM, 1–7) is still there.
- Smoke test: 4 new checks (39 total) using Chromium's fake camera; screenshots show the fake
  camera's green test pattern behind the practice screen.

### Decisions (camera, pages, quads)

- Quad calls: my research notes say a quad is caught on the "and" of 3 (beginners drift to 4); at
  155 BPM a count is ~0.39 s, so a quad's air time spans about 3–5 counts. Hence 3, 3&, 4, 4&, 5.
- Swiping uses a horizontal paging ScrollView (core React Native, works on web and in Expo Go)
  rather than a new navigation library; it's still one screen in the app's terms.
- Saved settings from before today keep their tempo and calls (tap **Quads 155** to switch);
  they get the camera on.
- Camera permission is asked as soon as the practice page shows. If it's refused, a **Turn on
  camera** / **Allow camera in Settings** button shows instead of the preview.

### To test on your phone (camera)

- First open: iOS should ask for the camera; the front camera should fill the screen behind the
  count. Tap the top-right button: back camera. Kill and reopen the app: the same camera.
- Practice with the camera on: clicks, the spoken call and the vibration should stay on time.
- Swipe left and right between the pages while practicing; the metronome must not stop.
- The camera needs a fresh `npm install` after `git pull` (new package: expo-camera), then restart
  `npx expo start`.

### Added (earlier today)

- **Your own presets** (discovered item "save current settings as…"): when the settings match no
  preset, Presets shows **Save as preset…**. The name is prefilled ("My preset 1", "My preset 2",
  …), and a name already used by any preset — built-in ones included, in any letter case — is
  refused with "A preset already has that name." Saved presets appear as outlined chips after the
  built-in ones and work the same way: one tap sets the tempo, phrase, lead counts, calls and
  repeats. Select one of yours to get **Delete "name"**, with an Undo bar right after.
  - Engine (`src/engine/customPresets.ts`): `saveCustomPreset`, `deleteCustomPreset`,
    `restoreCustomPreset`, `presetNameProblem`, `suggestPresetName`, `describeToss`,
    `matchingAnyPreset`, `canSavePreset`, and parsing/serializing under `guardrr.customPresets`.
  - Storage: `createCustomPresetStore` and the `useCustomPresets` hook.
- Smoke test: 6 new checks (35 total) — save a preset (it shows selected), a name clash is refused,
  the preset survives a reload and applies its calls, delete offers Undo, Undo brings it back,
  and a deleted preset stays deleted after a reload.
- Screenshots: `09-save-preset` (naming a preset) and `10-my-preset` (the saved preset selected).
- 23 new unit tests (349 total).

### Fixed

- Screen readers on the web build couldn't tell which chip was picked (preset, phrase length,
  count-in, voice, calls): React Native Web ignores `accessibilityState`. The chips now also set
  `aria-checked`, which iOS/Android read too. Found while writing today's smoke checks.

### Decisions

- A custom preset is the same thing as a built-in one: tempo + toss settings. Sound options
  (accent, "and" clicks, haptics, voice) stay personal and aren't changed by any preset.
- **Save** is offered only when the settings match no preset (tempo ignored, like the built-ins),
  so there are never two chips for the same drill. To save a variation, change a setting first.
- Up to 12 presets of your own, names up to 24 characters — beyond that the chip row stops being
  a quick pick. When full, the note says to delete one first.
- Saving and deleting stay available while practicing (they don't touch the running settings);
  applying a preset is still locked until Stop.
- Descriptions are generated from the settings, e.g. "Calls 3, 5, 7 · 8 counts · called 4 early
  · no repeats"; odd/even sets are named ("Odd calls 1–15") instead of listing eight numbers.
- Stored presets are untrusted like the other saved data: unreadable ones, repeated names, copies
  of a built-in preset and presets whose calls no longer fit their phrase are skipped on load.
- No rename yet (delete and save again); added to the roadmap with "update preset".

### To test on your phone

- Settings → Calls → Odd, then Presets → Save as preset… → type a name → Save. The new chip should
  be selected. Pick Standard 16, then your chip again: tempo, phrase and calls should come back.
- Close and reopen the app: your preset should still be there.
- Check the name field: the keyboard's Done key should save, and the field shouldn't hide behind
  the keyboard on a small phone (if it does, note it — the screen doesn't scroll for the keyboard
  yet).
- With VoiceOver/TalkBack: your chips read "<name>, your preset", and the selected chip reads as
  checked.

## 2026-11-04

### Added

- **Edit History** (discovered item): the History card has an **Edit** button. While editing,
  each session shows a ✕ button to delete it, and **Clear all history** at the bottom asks
  "Delete all N sessions?" (Cancel / Delete all) before deleting. After any delete an
  "Deleted Today 6:05 PM · Undo" bar stays up until the next delete or **Done**, so a mis-tap is
  one tap to fix. Screen readers hear "Deleted …. Undo is available."
  - Engine (`src/engine/history.ts`): `HistoryState`, `saveToHistory`, `deleteFromHistory`,
    `clearHistory`, `restoreToHistory`, `deletionMessage`.
  - `useSessionHistory` gains `deleteSession`, `clearHistory` and `restoreSessions`.
- Smoke test: 5 new checks (29 total) — delete a session and see Undo, Undo brings it back,
  Clear all empties History, a cleared History stays cleared after a reload, and the Odd note.
- 17 new unit tests (326 total).
- **Screenshots** (Niv's request): `npm run screenshots` builds the web version and captures 8
  phone-size screens (ready, the call, release, catch, stats & history, editing History, Settings
  → Calls, dark theme) into `docs/screenshots/`, shown in the README. Audio/speech are stubbed and
  the session's random seed is fixed so the first call is always a "4 count".

### Fixed

- The note under the call chips said "Picked by hand" even when the **Odd** or **Even** shortcut
  was selected. It now says "Odd counts only." / "Even counts only." for those (`callSetNote`);
  "Picked by hand." is kept for any other set that isn't a plain range.

### Decisions

- Confirm inline in the card rather than with `Alert.alert`: React Native Web's `Alert` does
  nothing, and the smoke test (and any web build) needs the same flow as the phone. Single
  deletes don't ask — Undo is quicker than a dialog for one row.
- A session deleted since the app opened can't come back by itself: the app re-saves the last
  session when a Drop is marked after Stop or when it goes to the background, and those
  re-saves are now ignored for deleted sessions. Only Undo restores it. Undo keeps a copy saved
  since (newer) over the deleted one.
- While editing, the ✕ buttons replace the time column so dates still fit on a 390-pt-wide
  phone ("Today 9:03 AM" was cut off to "Today 9:0…" with both).
- Red ✕ text on the grey control color is checked for AA contrast in both themes.

### To test on your phone

- History → Edit: delete a session, tap Undo — it should come back in the same place. Then
  Clear all history → Delete all, close and reopen the app: History should be gone.
- Delete the session you just stopped, then tap Drop / Undo drop on the stats card: the deleted
  session must not reappear in History.
- With VoiceOver/TalkBack: each ✕ reads "Delete session <date>", and a delete announces Undo.

## 2026-11-03

### Added

- **Call shortcuts** (discovered item): Settings → Calls has **All / Odd / Even** buttons above
  the call chips. One tap picks every call the phrase allows, only the odd counts (1, 3, 5, …) or
  only the even counts (2, 4, 6, …); the button matching the current set shows as selected, and
  the chips stay editable afterwards (e.g. Odd, then tap 1 off to drill 3, 5, 7, … without pops).
  - Engine (`src/engine/editSettings.ts`): `CALL_SHORTCUTS`, `callsForShortcut`,
    `withCallShortcut`, `callShortcutOf`.
- Smoke test: 2 new checks (24 total) — Odd picks 1, 3, …, 15 and All picks 1–16 in a 16-count
  phrase.
- 7 new unit tests (309 total).

### Decisions

- Shortcuts keep the current "and" setting: with "and" calls on, Odd picks each odd count and its
  "and" (3, 3 and, 5, 5 and, …). "1 and" is never added — it's the pop toss ("1") under another
  name. Parity goes by the whole count, so "4 and" counts as even.
- No "Clear" button: a session needs at least one call, so clearing would leave an invalid set.
  To build a small set, pick Odd or Even and tap chips off.
- "All" means every call the phrase allows (1–16 in a 16-count phrase), not the 1–7 default;
  the shortest/longest steppers still set any contiguous range.
- Unselected shortcut buttons use the control colors (dark text on light grey / light text on
  dark grey) rather than blue text, which wouldn't meet AA contrast in the dark theme.

### To test on your phone

- Settings → Calls: tap Odd and practice a few phrases — only odd calls should come up. Tap
  Even, then turn on "Include "and" calls": the "and" after each even count should light up.
- Check the three buttons fit on one row with your phone's text size turned up.

## 2026-11-02

### Added

- **Hand-picked calls** (discovered item): Settings → Calls now has a chip for every call the
  phrase allows (1–16 in a 16-count phrase, plus "and" chips such as "3&" when "and" calls are
  on). Tap a chip to add or remove that call, e.g. to drill only 3, 5 and 7. The line above the
  chips summarizes the set ("Calls: 1–7", "Calls: 2–5 with "and"s", "Calls: 3, 5, 7").
  - Engine (`src/engine/editSettings.ts`): `callChoices`, `withCallToggled`, `isCallRange`,
    `withAndCalls`, `callSetSummary`.
  - Smoke test: 3 new checks (22 total) — pick 3, 5, 7; the set survives a reload; only one of
    them is spoken.
- **Light tap on the catch** (discovered item): Settings → Sound → "Light tap on the catch" (off
  by default) adds a light haptic on every catch — on the called count, or on its "and" for "and"
  calls and pop tosses. The release keeps its heavy buzz; each can be switched on its own. Saved
  with the other sound settings.
- 16 new unit tests (302 total).

### Decisions

- The shortest/longest steppers still edit a contiguous range: changing either turns a
  hand-picked set back into the full range between them (a note under the chips says so). Simpler
  than keeping two editors in sync, and the chips are one tap away.
- "1 and" is not offered as a chip: it's caught at the same moment as the pop toss ("1"), so it
  would be the same toss under two names. Picking one swaps out the other if old settings had it.
- The last picked call can't be removed (a session needs at least one call).
- Flipping "Include "and" calls" keeps a hand-picked set's shape: on adds the "and" after each
  picked count (3, 5 → 3, 3 and, 5, 5 and); off removes the "and" calls.
- Shortening the phrase keeps the hand-picked calls that still fit (3, 5, 7, 12 → 3, 5, 7 in an
  8-count phrase); if none fit, it falls back to the outer range, pulled in.
- The catch tap uses `ImpactFeedbackStyle.Light` so it never feels like the release (`Heavy`).

### To test on your phone

- Settings → Calls: tap chips so only 3, 5 and 7 are lit, practice a few phrases — only those
  should be called. Close and reopen the app: the set should still be picked.
- Turn on "Light tap on the catch" and practice with headphones off: the light tap should land
  on the catch count (and on the "and" for "and" calls), clearly different from the release buzz.
  Not verifiable here (no haptics in the headless browser).

## 2026-11-01

### Added

- **Session history** (discovered item): every session with at least one toss is saved on Stop
  (and saved again if a drop is marked or undone after Stop, or when the app goes to the
  background mid-session), keyed by its start time. A new **History** card under the session
  stats shows all-time sessions, tosses, catch rate and practice time, **"Dropped most"** (the up
  to 3 calls with the lowest catch rate across all sessions), and the latest 5 sessions (date,
  tosses, catch rate, length) with **Show more** for up to 25. Kept on the phone (AsyncStorage,
  key `guardrr.history`), newest 200 sessions.
  - Engine: `src/engine/history.ts` — `sessionRecord`, `upsertSession`, `serializeHistory` /
    `parseStoredHistory` (tolerant: unreadable or self-inconsistent records are skipped, never
    thrown), `formatSessionDate` ("Today 6:05 PM", "Oct 28 7:00 PM") and `summarizeHistory`.
  - Storage: `createHistoryStore` (writes immediately, one at a time and in order, skips
    unchanged writes, reports errors without throwing) and the `useSessionHistory` hook.
- Smoke test: 2 new checks (19 total) — the 16-count phrase strip is one row, and the practiced
  session (with its drop) is in History after a reload.
- 34 new unit tests (286 total).

### Fixed

- **Phrase strip wrapping** (discovered item): on a 390-pt-wide phone the 16th dot wrapped onto a
  line of its own. `phraseStripLayout` (pure, tested) now sizes the dots to the measured width
  (13 pt instead of 14 there) and only adds rows for long phrases, as even splits of at most 16
  per row (32 → 2 × 16, 24 → 2 × 12).
- Session durations are whole milliseconds; the first history build stored fractional ones (from
  `performance.now()`) that the stored-history parser then rejected — caught by the new smoke
  check before it shipped.

### Decisions

- A session is only saved once something was tossed; a Start → Stop inside the count-in isn't
  history.
- The tempo saved with a session is the tempo at Stop (it can change while practicing).
- No delete/clear yet: React Native's `Alert` confirm doesn't work on web (used by the smoke
  test), so a proper confirm dialog comes with that roadmap item.
- "Dropped most" ranks calls by catch rate (ties: the call tossed more often) rather than raw
  drop count. A call tossed once and dropped once ranks first; the per-call trend item on the
  roadmap should give a better picture.

### To test on your phone

- Practice a few short sessions, mark some drops, then fully close and reopen the app: History
  should list them with the right dates and catch rates.
- Mark a drop right after Stop — the latest History row should update.
- Check the phrase strip on your phone: 16 dots on one row; switch to the _Slow 32_ preset — two
  rows of 16.

## 2026-10-31

### Added

- **Morning check** (asked for by Niv): `npm run check:morning` runs typecheck, lint, format, unit
  tests, builds the iOS, Android and web bundles, then a **headless smoke test** of the real app
  (`e2e/smoke.js`, web build in Chromium) — 17 checks including tempo/drift of the clicks, the
  count-in, call and release timing, Drop, Stop, saved settings and the dark theme. It runs daily
  in the new **Morning check** GitHub workflow (11:41 UTC) and in a Claude scheduled task at
  6:41 New York time that notifies only on failure.
- The app now also builds for web (`react-dom`, `react-native-web`, `@expo/metro-runtime` at the
  SDK 58 versions) — needed for the smoke test; not meant as a product target.

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
