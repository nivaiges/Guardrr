import {
  RESUME_WINDOW_MS,
  canResume,
  interruptedNote,
  shouldStopForAppState,
} from '../interruption';

describe('shouldStopForAppState', () => {
  it('stops a running session when the app goes to the background', () => {
    expect(shouldStopForAppState('background', true)).toBe(true);
  });

  it('keeps going while the app is only inactive (Control Center, a banner)', () => {
    expect(shouldStopForAppState('inactive', true)).toBe(false);
  });

  it('ignores coming back to the screen and other states', () => {
    expect(shouldStopForAppState('active', true)).toBe(false);
    expect(shouldStopForAppState('unknown', true)).toBe(false);
    expect(shouldStopForAppState('extension', true)).toBe(false);
  });

  it('does nothing when nothing is playing', () => {
    expect(shouldStopForAppState('background', false)).toBe(false);
  });
});

describe('interruptedNote', () => {
  it('says why it stopped and how to go again', () => {
    expect(interruptedNote({ tosses: 0, duration: '0:04' })).toBe(
      'Stopped when Guardrr left the screen. Tap Start to go again.',
    );
  });

  it('mentions the tosses made and that they were saved', () => {
    expect(interruptedNote({ tosses: 7, duration: '2:15' })).toBe(
      "Stopped when Guardrr left the screen, after 7 tosses (2:15). They're saved in History. Tap Start to go again.",
    );
  });

  it('uses the singular for one toss', () => {
    expect(interruptedNote({ tosses: 1, duration: '0:12' })).toBe(
      "Stopped when Guardrr left the screen, after 1 toss (0:12). It's saved in History. Tap Start to go again.",
    );
  });
});

describe('interruptedNote with Resume', () => {
  it('offers Resume when the session can be continued', () => {
    expect(interruptedNote({ tosses: 7, duration: '2:15' }, true)).toBe(
      "Stopped when Guardrr left the screen, after 7 tosses (2:15). They're saved in History. Resume keeps counting this session; Start begins a new one.",
    );
  });

  it('never offers Resume without a toss to continue', () => {
    expect(interruptedNote({ tosses: 0, duration: '0:04' }, true)).toBe(
      'Stopped when Guardrr left the screen. Tap Start to go again.',
    );
  });
});

describe('canResume', () => {
  const stoppedAt = 1_000_000;

  it('is offered right after leaving the screen with tosses made', () => {
    expect(canResume(stoppedAt, stoppedAt + 5_000, 3)).toBe(true);
  });

  it('is offered up to the end of the window, not after', () => {
    expect(canResume(stoppedAt, stoppedAt + RESUME_WINDOW_MS, 3)).toBe(true);
    expect(canResume(stoppedAt, stoppedAt + RESUME_WINDOW_MS + 1, 3)).toBe(false);
  });

  it('is not offered without a toss, or without an interruption', () => {
    expect(canResume(stoppedAt, stoppedAt + 5_000, 0)).toBe(false);
    expect(canResume(null, stoppedAt, 3)).toBe(false);
  });

  it('is not offered if the clock went backwards (phone time changed)', () => {
    expect(canResume(stoppedAt, stoppedAt - 1, 3)).toBe(false);
  });
});
