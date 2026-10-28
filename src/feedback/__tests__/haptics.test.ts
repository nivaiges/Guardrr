import { createHapticPlayer } from '..';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Heavy: 'heavy' },
}));

function fakeHaptics(result: Promise<void> = Promise.resolve()) {
  return {
    impactAsync: jest.fn(() => result),
    ImpactFeedbackStyle: { Heavy: 'heavy' } as never,
  };
}

describe('createHapticPlayer', () => {
  it('plays a heavy impact on a release', () => {
    const haptics = fakeHaptics();
    createHapticPlayer(haptics).play('release');
    expect(haptics.impactAsync).toHaveBeenCalledWith('heavy');
  });

  it('swallows errors from devices without haptics', async () => {
    const haptics = fakeHaptics(Promise.reject(new Error('unsupported')));
    expect(() => createHapticPlayer(haptics).play('release')).not.toThrow();
    // Let the rejection settle; an unhandled one would fail the test run.
    await Promise.resolve();
  });
});
