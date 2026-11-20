# Background audio — what it would take

Researched 2026-11-20 for the roadmap item "Background audio (keep the metronome going with the
screen locked)". Sources are the code Guardrr already ships with (Expo SDK 58, React Native
0.88, expo-audio 58), read in `node_modules`, so the findings match the exact versions in use.

## How Guardrr keeps time today

The metronome is a JavaScript scheduler (`src/engine/scheduler.ts`): every tick has an absolute
target time and the next `setTimeout` is set for `target − now`. Each click is a short sample
started from JS (`src/audio/clicks.ts`), each call is spoken by expo-speech, and buzzes come from
expo-haptics. **Everything depends on JS timers firing.** Ticks that come back more than one
interval late are skipped instead of played in a burst.

## What happens when the app leaves the screen

- **Android: JS timers stop.** React Native's `JavaTimerManager` (`onHostPause` → `isPaused`)
  stops delivering timers while the activity is paused, unless a headless JS task is running.
  Locking the screen or switching apps pauses the activity, so the metronome goes silent no
  matter what the audio session allows.
- **iOS: the app is suspended** a few seconds after leaving the screen, unless it declares the
  `audio` background mode _and_ keeps audio playing. Short clicks with silent gaps between them
  don't count as "playing", so iOS would still suspend the app between clicks; metronome apps
  usually loop a silent track to stay alive.
- **The web:** browsers throttle timers in hidden tabs to about once a second.
- **Before today's change**, coming back to Guardrr picked up where the wall clock was: the
  missed ticks were skipped (no burst), the phrase resumed in the middle, and the session's
  duration counted the time spent away.

## What expo-audio offers

- `setAudioModeAsync({ shouldPlayInBackground: true })` keeps the audio session active in the
  background. The expo-audio config plugin (`enableBackgroundPlayback`, on by default once the
  plugin is listed in `app.json`) adds `UIBackgroundModes: audio` on iOS and a media-playback
  foreground service on Android. Listing the plugin also adds the microphone permission unless
  `microphonePermission: false` and `recordAudioAndroid: false` are set.
- On Android, background playback stops after about 3 minutes unless a player is made active
  for the lock screen (`player.setActiveForLockScreen(true, metadata)`), which shows a media
  notification — and that only needs `interruptionMode: 'doNotMix'`, which would pause the
  performer's own music. Guardrr mixes with other audio today.
- None of this restarts JS timers on Android: the audio session can stay alive while the
  scheduler that starts each click doesn't run.

## Options

1. **iOS only, JS clock:** background mode + a silent looping player while practicing. Keeps
   the JS scheduler alive on iOS; does nothing on Android. Timing in the background would be
   as good as in the foreground.
2. **Native audio clock:** schedule clicks ahead on the audio thread (e.g.
   `react-native-audio-api`, already on the roadmap for click latency). Clicks keep their time
   with JS paused, but calls (expo-speech) and buzzes are still started from JS, so in the
   background on Android you'd hear clicks without calls — the call is the point of the app.
   Calls would need recorded voice samples scheduled on the same clock (also on the roadmap).
3. **Stop cleanly when the app leaves the screen** and say so when the performer comes back.

## Decision

- **Today: option 3.** When Guardrr goes to the background while practicing, the session stops
  as if Stop were pressed (saved to History with the time actually practiced), and the practice
  page says _"Stopped when Guardrr left the screen"_ until the next Start. Brief interruptions
  that keep the app on screen (Control Center, a notification banner — iOS's `inactive` state)
  don't stop it.
- The screen already stays awake while practicing (expo-keep-awake), so the phone doesn't lock
  on its own mid-session; background audio only matters when the performer presses the lock
  button or switches apps. The camera preview also stops in the background.
- **Real background practice waits for option 2 plus recorded calls**: one native audio clock
  for clicks and voice, which also answers the click-latency and speech-latency roadmap items.
  Option 1 alone would make the two platforms behave differently for one setting, so it's left
  out until then.
