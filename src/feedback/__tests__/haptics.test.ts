import { createHapticPlayer } from '..';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Heavy: 'heavy', Medium: 'medium', Light: 'light' },
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Warning: 'warning' },
}));
jest.mock('expo-keep-awake', () => ({}));

function fakeHaptics(result: Promise<void> = Promise.resolve()) {
  return {
    impactAsync: jest.fn(() => result),
    ImpactFeedbackStyle: { Heavy: 'heavy', Medium: 'medium', Light: 'light' } as never,
    notificationAsync: jest.fn(() => result),
    NotificationFeedbackType: { Warning: 'warning' } as never,
  };
}

describe('createHapticPlayer', () => {
  it('plays a heavy impact on a release', () => {
    const haptics = fakeHaptics();
    createHapticPlayer(haptics).play('release');
    expect(haptics.impactAsync).toHaveBeenCalledWith('heavy');
  });

  it('plays a light impact on a catch', () => {
    const haptics = fakeHaptics();
    createHapticPlayer(haptics).play('catch');
    expect(haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('plays the double "warning" pattern on a call, not an impact', () => {
    const haptics = fakeHaptics();
    createHapticPlayer(haptics).play('call');
    expect(haptics.notificationAsync).toHaveBeenCalledWith('warning');
    expect(haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('swallows errors from a call buzz too', async () => {
    const haptics = fakeHaptics(Promise.reject(new Error('unsupported')));
    expect(() => createHapticPlayer(haptics).play('call')).not.toThrow();
    await Promise.resolve();
  });

  it('swallows errors from devices without haptics', async () => {
    const haptics = fakeHaptics(Promise.reject(new Error('unsupported')));
    expect(() => createHapticPlayer(haptics).play('release')).not.toThrow();
    // Let the rejection settle; an unhandled one would fail the test run.
    await Promise.resolve();
  });

  describe('call pulses', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('taps each pulse at its offset, the "and" pulse lighter', () => {
      const haptics = fakeHaptics();
      createHapticPlayer(haptics).playPulses!([
        { atMs: 0, strength: 'medium' },
        { atMs: 200, strength: 'medium' },
        { atMs: 600, strength: 'light' },
      ]);
      expect(haptics.impactAsync.mock.calls).toEqual([['medium']]);
      jest.advanceTimersByTime(199);
      expect(haptics.impactAsync).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(1);
      expect(haptics.impactAsync.mock.calls).toEqual([['medium'], ['medium']]);
      jest.advanceTimersByTime(400);
      expect(haptics.impactAsync.mock.calls).toEqual([['medium'], ['medium'], ['light']]);
      expect(haptics.notificationAsync).not.toHaveBeenCalled();
    });

    it('stop() cancels the pulses still to come', () => {
      const haptics = fakeHaptics();
      const player = createHapticPlayer(haptics);
      player.playPulses!([
        { atMs: 0, strength: 'medium' },
        { atMs: 200, strength: 'medium' },
        { atMs: 400, strength: 'medium' },
      ]);
      jest.advanceTimersByTime(250);
      player.stop!();
      jest.advanceTimersByTime(1000);
      expect(haptics.impactAsync).toHaveBeenCalledTimes(2);
    });

    it('a new call replaces the pulses left from the last one', () => {
      const haptics = fakeHaptics();
      const player = createHapticPlayer(haptics);
      player.playPulses!([
        { atMs: 0, strength: 'medium' },
        { atMs: 500, strength: 'medium' },
      ]);
      player.playPulses!([{ atMs: 100, strength: 'light' }]);
      jest.advanceTimersByTime(1000);
      expect(haptics.impactAsync.mock.calls).toEqual([['medium'], ['light']]);
    });
  });
});
