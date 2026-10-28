import { PRACTICE_KEEP_AWAKE_TAG, createKeepAwakeController } from '..';

jest.mock('expo-haptics', () => ({}));
jest.mock('expo-keep-awake', () => ({}));

function fakeKeepAwake(result: () => Promise<void> = () => Promise.resolve()) {
  return {
    activateKeepAwakeAsync: jest.fn(result),
    deactivateKeepAwake: jest.fn(result),
  };
}

describe('createKeepAwakeController', () => {
  it('activates and deactivates with the practice tag', () => {
    const keepAwake = fakeKeepAwake();
    const controller = createKeepAwakeController(keepAwake);
    controller.set(true);
    expect(keepAwake.activateKeepAwakeAsync).toHaveBeenCalledWith(PRACTICE_KEEP_AWAKE_TAG);
    controller.set(false);
    expect(keepAwake.deactivateKeepAwake).toHaveBeenCalledWith(PRACTICE_KEEP_AWAKE_TAG);
  });

  it('ignores repeated calls with the same state', () => {
    const keepAwake = fakeKeepAwake();
    const controller = createKeepAwakeController(keepAwake);
    controller.set(false);
    expect(keepAwake.deactivateKeepAwake).not.toHaveBeenCalled();
    controller.set(true);
    controller.set(true);
    expect(keepAwake.activateKeepAwakeAsync).toHaveBeenCalledTimes(1);
  });

  it('swallows platform errors', async () => {
    const keepAwake = fakeKeepAwake(() => Promise.reject(new Error('no wake lock')));
    const controller = createKeepAwakeController(keepAwake);
    expect(() => controller.set(true)).not.toThrow();
    expect(() => controller.set(false)).not.toThrow();
    await Promise.resolve();
  });
});
