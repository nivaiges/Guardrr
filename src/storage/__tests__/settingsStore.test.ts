import { DEFAULT_PRACTICE_SETTINGS, PracticeSettings, SETTINGS_STORAGE_KEY } from '../../engine';
import { KeyValueBackend, createSettingsStore } from '../settingsStore';

function memoryBackend(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const writes: string[] = [];
  const backend: KeyValueBackend = {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      writes.push(value);
      data.set(key, value);
    },
  };
  return { backend, data, writes };
}

const faster: PracticeSettings = { ...DEFAULT_PRACTICE_SETTINGS, bpm: 150 };

describe('createSettingsStore', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('loads defaults when nothing is saved', async () => {
    const store = createSettingsStore({ backend: memoryBackend().backend });
    await expect(store.load()).resolves.toEqual(DEFAULT_PRACTICE_SETTINGS);
  });

  it('saves after the debounce and loads it back', async () => {
    const mem = memoryBackend();
    const store = createSettingsStore({ backend: mem.backend, debounceMs: 500 });
    store.save({ ...faster, bpm: 130 });
    store.save({ ...faster, bpm: 140 });
    store.save(faster);
    await jest.advanceTimersByTimeAsync(499);
    expect(mem.writes).toHaveLength(0);
    await jest.advanceTimersByTimeAsync(1);
    expect(mem.writes).toHaveLength(1);
    const reloaded = createSettingsStore({ backend: mem.backend });
    await expect(reloaded.load()).resolves.toEqual(faster);
  });

  it('flush writes immediately and skips unchanged writes', async () => {
    const mem = memoryBackend();
    const store = createSettingsStore({ backend: mem.backend });
    store.save(faster);
    await store.flush();
    expect(mem.writes).toHaveLength(1);
    store.save(faster);
    await store.flush();
    await store.flush();
    expect(mem.writes).toHaveLength(1);
  });

  it("doesn't rewrite what was just loaded", async () => {
    const mem = memoryBackend();
    createSettingsStore({ backend: mem.backend }).save(faster);
    await jest.runAllTimersAsync();
    const store = createSettingsStore({ backend: mem.backend });
    store.save(await store.load());
    await store.flush();
    expect(mem.writes).toHaveLength(1);
  });

  it('reports storage errors instead of throwing', async () => {
    const onError = jest.fn();
    const broken: KeyValueBackend = {
      getItem: () => Promise.reject(new Error('read')),
      setItem: () => Promise.reject(new Error('write')),
    };
    const store = createSettingsStore({ backend: broken, onError });
    await expect(store.load()).resolves.toEqual(DEFAULT_PRACTICE_SETTINGS);
    store.save(faster);
    await expect(store.flush()).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it('recovers from corrupt saved data', async () => {
    const mem = memoryBackend({ [SETTINGS_STORAGE_KEY]: '{"bpm":' });
    const store = createSettingsStore({ backend: mem.backend });
    await expect(store.load()).resolves.toEqual(DEFAULT_PRACTICE_SETTINGS);
  });
});
