import { Share } from 'react-native';

import { SessionRecord, historyCsv } from '../../engine';
import { historyFileName, shareHistory, shareOutcomeMessage } from '../shareHistory';

const NOW = new Date(2026, 10, 8, 18, 5).getTime();

const session: SessionRecord = {
  startedAt: NOW - 60_000,
  durationMs: 60_000,
  bpm: 155,
  phraseLength: 16,
  tosses: 2,
  drops: 0,
  timesCalled: { '4': 2 },
  timesDropped: {},
  preset: 'Quads 155',
};

afterEach(() => jest.restoreAllMocks());

describe('shareHistory', () => {
  it('opens the share sheet with the CSV as the message', async () => {
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
    await expect(shareHistory([session], NOW)).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith(
      { title: 'Guardrr history (1 session)', message: historyCsv([session]) },
      { subject: 'Guardrr history (1 session)' },
    );
  });

  it('reports a dismissed sheet', async () => {
    jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.dismissedAction, activityType: undefined });
    await expect(shareHistory([session], NOW)).resolves.toBe('dismissed');
  });

  it('reports when the phone cannot share', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('no activity'));
    await expect(shareHistory([session], NOW)).resolves.toBe('unavailable');
  });
});

describe('messages', () => {
  it('names the downloaded file by date', () => {
    expect(historyFileName(NOW)).toBe('guardrr-history-2026-11-08.csv');
    expect(shareOutcomeMessage('downloaded', NOW)).toBe('Saved guardrr-history-2026-11-08.csv');
  });

  it('says nothing after the share sheet, and explains when sharing is unavailable', () => {
    expect(shareOutcomeMessage('shared')).toBeNull();
    expect(shareOutcomeMessage('dismissed')).toBeNull();
    expect(shareOutcomeMessage('unavailable')).toBe("Sharing isn't available on this device.");
  });
});
