import { createClickPlayer, createVoice } from '..';

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
    const voice = createVoice({ rate: 1.3 }, speech as never);
    voice.say('five');
    expect(speech.stop).toHaveBeenCalled();
    expect(speech.speak).toHaveBeenCalledWith('five', { rate: 1.3, language: undefined });
    voice.stop();
    expect(speech.stop).toHaveBeenCalledTimes(2);
  });
});
