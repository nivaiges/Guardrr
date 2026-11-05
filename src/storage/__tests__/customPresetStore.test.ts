import {
  CUSTOM_PRESETS_STORAGE_KEY,
  DEFAULT_PRACTICE_SETTINGS,
  PracticePreset,
  saveCustomPreset,
} from '../../engine';
import { createCustomPresetStore } from '../customPresetStore';
import { KeyValueBackend } from '../settingsStore';

function preset(name: string, calls: number[], now: number, list: PracticePreset[] = []) {
  const settings = {
    ...DEFAULT_PRACTICE_SETTINGS,
    toss: { ...DEFAULT_PRACTICE_SETTINGS.toss, allowedTossCounts: calls },
  };
  return saveCustomPreset(list, settings, name, now).presets;
}

function memoryBackend(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const writes: string[] = [];
  const backend: KeyValueBackend = {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      // Later writes resolve sooner, to prove the store keeps them in order.
      await new Promise((r) => setTimeout(r, Math.max(0, 20 - writes.length * 10)));
      writes.push(value);
      data.set(key, value);
    },
  };
  return { backend, data, writes };
}

describe('createCustomPresetStore', () => {
  it('loads no presets when nothing is saved', async () => {
    const store = createCustomPresetStore({ backend: memoryBackend().backend });
    await expect(store.load()).resolves.toEqual([]);
  });

  it('saves under its own key and loads back', async () => {
    const mem = memoryBackend();
    const presets = preset('Threes', [3], 1);
    await createCustomPresetStore({ backend: mem.backend }).save(presets);
    expect([...mem.data.keys()]).toEqual([CUSTOM_PRESETS_STORAGE_KEY]);
    await expect(createCustomPresetStore({ backend: mem.backend }).load()).resolves.toEqual(
      presets,
    );
  });

  it('keeps writes in order and skips unchanged ones', async () => {
    const mem = memoryBackend();
    const store = createCustomPresetStore({ backend: mem.backend });
    const one = preset('A', [3], 1);
    const two = preset('B', [5], 2, one);
    void store.save(one);
    void store.save(two);
    await store.save(two);
    expect(mem.writes).toHaveLength(2);
    await expect(store.load()).resolves.toEqual(two);
  });

  it('reports storage errors instead of throwing', async () => {
    const errors: unknown[] = [];
    const broken: KeyValueBackend = {
      getItem: () => Promise.reject(new Error('read')),
      setItem: () => Promise.reject(new Error('write')),
    };
    const store = createCustomPresetStore({ backend: broken, onError: (e) => errors.push(e) });
    await expect(store.load()).resolves.toEqual([]);
    await expect(store.save(preset('A', [3], 1))).resolves.toBeUndefined();
    expect(errors).toHaveLength(2);
  });
});
