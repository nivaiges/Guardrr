import { interruptedNote, shouldStopForAppState } from '../interruption';

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
