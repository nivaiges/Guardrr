import { HISTORY_STORAGE_KEY, SessionRecord, serializeHistory } from '../../engine';
import { createHistoryStore } from '../historyStore';
import { KeyValueBackend } from '../settingsStore';

const session = (startedAt: number): SessionRecord => ({
  startedAt,
  durationMs: 60_000,
  bpm: 120,
  phraseLength: 16,
  tosses: 2,
  drops: 0,
  timesCalled: { '5': 2 },
  timesDropped: {},
});

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

describe('createHistoryStore', () => {
  it('loads an empty history when nothing is saved', async () => {
    await expect(createHistoryStore({ backend: memoryBackend().backend }).load()).resolves.toEqual(
      [],
    );
  });

  it('saves and loads back', async () => {
    const mem = memoryBackend();
    const store = createHistoryStore({ backend: mem.backend });
    await store.save([session(2), session(1)]);
    const reloaded = createHistoryStore({ backend: mem.backend });
    await expect(reloaded.load()).resolves.toEqual([session(2), session(1)]);
  });

  it('writes in order, so the newest history wins', async () => {
    const mem = memoryBackend();
    const store = createHistoryStore({ backend: mem.backend });
    void store.save([session(1)]);
    void store.save([session(2), session(1)]);
    await store.save([session(3), session(2), session(1)]);
    expect(mem.data.get(HISTORY_STORAGE_KEY)).toBe(
      serializeHistory([session(3), session(2), session(1)]),
    );
  });

  it('skips writing an unchanged history', async () => {
    const saved = serializeHistory([session(1)]);
    const mem = memoryBackend({ [HISTORY_STORAGE_KEY]: saved });
    const store = createHistoryStore({ backend: mem.backend });
    await store.load();
    await store.save([session(1)]);
    expect(mem.writes).toHaveLength(0);
  });

  it('reports storage errors instead of throwing', async () => {
    const onError = jest.fn();
    const broken: KeyValueBackend = {
      getItem: () => Promise.reject(new Error('read')),
      setItem: () => Promise.reject(new Error('write')),
    };
    const store = createHistoryStore({ backend: broken, onError });
    await expect(store.load()).resolves.toEqual([]);
    await expect(store.save([session(1)])).resolves.toBeUndefined();
    // A failed write doesn't block the next one.
    await expect(store.save([session(2)])).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledTimes(3);
  });
});
