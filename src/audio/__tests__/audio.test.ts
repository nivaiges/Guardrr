import { createClickPlayer, createVoice, loadCallVoices } from '..';
import { DEFAULT_VOICE_RATE } from '../../engine';

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(() => Promise.resolve()) }));

function fakePlayer(source: number) {
  return {
    source,
    seekTo: jest.fn(() => Promise.resolve()),
    play: jest.fn(),
    remove: jest.fn(),
  };
}

type Fake = ReturnType<typeof fakePlayer>;

function setup() {
  const players: Fake[] = [];
  const clicks = createClickPlayer((source) => {
    const p = fakePlayer(source);
    players.push(p);
    return p as never;
  });
  return { clicks, players };
}

describe('createClickPlayer', () => {
  it('preloads a pool of players per click kind', () => {
    const { players } = setup();
    expect(players).toHaveLength(6);
  });

  it('rewinds and plays, alternating players of the same kind', () => {
    const { clicks, players } = setup();
    clicks.play('count');
    clicks.play('count');
    clicks.play('count');
    const played = players.filter((p) => p.play.mock.calls.length > 0);
    expect(played).toHaveLength(2);
    expect(played[0].play).toHaveBeenCalledTimes(2);
    expect(played[1].play).toHaveBeenCalledTimes(1);
    expect(played[0].seekTo).toHaveBeenCalledWith(0);
  });

  it('plays each kind from its own pool', () => {
    const { clicks, players } = setup();
    clicks.play('accent');
    clicks.play('count');
    clicks.play('and');
    // Pools are created in order accent, count, and (two players each).
    const played = players.flatMap((p, i) => (p.play.mock.calls.length > 0 ? [i] : []));
    expect(played).toEqual([0, 2, 4]);
  });

  it('frees every player on release and ignores later plays', () => {
    const { clicks, players } = setup();
    clicks.release();
    clicks.release();
    clicks.play('accent');
    expect(players.every((p) => p.remove.mock.calls.length === 1)).toBe(true);
    expect(players.every((p) => p.play.mock.calls.length === 0)).toBe(true);
  });
});

describe('createVoice', () => {
  it('cuts off the previous call and speaks the new one at the configured rate', () => {
    const speech = { speak: jest.fn(), stop: jest.fn(() => Promise.resolve()) };
    const voice = createVoice({ rate: 1.3, language: 'en-GB' }, speech as never);
    voice.say('five');
    expect(speech.stop).toHaveBeenCalled();
    expect(speech.speak).toHaveBeenCalledWith('five', {
      rate: 1.3,
      language: 'en-GB',
      voice: undefined,
    });
    voice.stop();
    expect(speech.stop).toHaveBeenCalledTimes(2);
  });

  it('falls back to the default rate when none (or undefined) is given', () => {
    const speech = { speak: jest.fn(), stop: jest.fn(() => Promise.resolve()) };
    createVoice({ rate: undefined, language: 'en-US' }, speech as never).say('six');
    expect(speech.speak).toHaveBeenCalledWith('six', {
      rate: DEFAULT_VOICE_RATE,
      language: 'en-US',
      voice: undefined,
    });
  });

  it('speaks with the chosen voice', () => {
    const speech = { speak: jest.fn(), stop: jest.fn(() => Promise.resolve()) };
    createVoice({ voice: 'com.apple.voice.Ava' }, speech as never).say('two and');
    expect(speech.speak).toHaveBeenCalledWith(
      'two and',
      expect.objectContaining({ voice: 'com.apple.voice.Ava' }),
    );
  });

  it('defaults to an English language even without options', () => {
    const speech = { speak: jest.fn(), stop: jest.fn(() => Promise.resolve()) };
    createVoice({}, speech as never).say('one');
    const { language } = speech.speak.mock.calls[0][1];
    expect(language).toMatch(/^en(-|$)/);
  });
});

describe('loadCallVoices', () => {
  it('returns English offline voices, best first for the locale', async () => {
    const speech = {
      getAvailableVoicesAsync: jest.fn(() =>
        Promise.resolve([
          { identifier: 'fr', name: 'Thomas', quality: 'Default', language: 'fr-FR' },
          { identifier: 'gb', name: 'Daniel', quality: 'Default', language: 'en-GB' },
          { identifier: 'us', name: 'Ava', quality: 'Enhanced', language: 'en-US' },
        ]),
      ),
    };
    const voices = await loadCallVoices(speech as never, 'en-GB');
    expect(voices.map((v) => v.identifier)).toEqual(['gb', 'us']);
  });

  it('returns an empty list when the engine fails', async () => {
    const speech = { getAvailableVoicesAsync: jest.fn(() => Promise.reject(new Error('no tts'))) };
    await expect(loadCallVoices(speech as never, 'en-US')).resolves.toEqual([]);
  });
});
