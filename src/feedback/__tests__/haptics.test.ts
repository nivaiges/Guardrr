import { createHapticPlayer } from '..';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Heavy: 'heavy', Light: 'light' },
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Warning: 'warning' },
}));
jest.mock('expo-keep-awake', () => ({}));

function fakeHaptics(result: Promise<void> = Promise.resolve()) {
  return {
    impactAsync: jest.fn(() => result),
    ImpactFeedbackStyle: { Heavy: 'heavy', Light: 'light' } as never,
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
});
