import { SessionRecord } from '../history';
import {
  HISTORY_CSV_HEADER,
  callCountsCell,
  csvCell,
  csvDateTime,
  historyCsv,
  historyShareTitle,
  sessionCsvRow,
} from '../historyExport';

const AT = new Date(2026, 10, 8, 18, 5).getTime(); // Nov 8 2026, 6:05 PM local

function record(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    startedAt: AT,
    durationMs: 318_000,
    bpm: 155,
    phraseLength: 16,
    tosses: 8,
    drops: 2,
    timesCalled: { '4': 3, '3.5': 2, '3': 3 },
    timesDropped: { '4': 2 },
    preset: 'Quads 155',
    ...overrides,
  };
}

describe('csvCell', () => {
  it('leaves plain text and numbers alone', () => {
    expect(csvCell('Quads 155')).toBe('Quads 155');
    expect(csvCell(155)).toBe('155');
  });

  it('quotes commas, quotes and line breaks', () => {
    expect(csvCell('Odd, slow')).toBe('"Odd, slow"');
    expect(csvCell('The "big" one')).toBe('"The ""big"" one"');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
  });

  it('defuses text a spreadsheet would run as a formula', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-drill')).toBe("'-drill");
    expect(csvCell('@me')).toBe("'@me");
  });
});

describe('csvDateTime', () => {
  it('gives a sortable local date and a 24-hour time', () => {
    expect(csvDateTime(AT)).toEqual({ date: '2026-11-08', time: '18:05' });
    expect(csvDateTime(new Date(2026, 0, 2, 7, 9).getTime())).toEqual({
      date: '2026-01-02',
      time: '07:09',
    });
  });
});

describe('callCountsCell', () => {
  it('lists calls smallest first with "&" for "and" calls', () => {
    expect(callCountsCell({ '4': 3, '3.5': 2, '3': 3 })).toBe('3: 3; 3&: 2; 4: 3');
  });

  it('is empty when nothing was dropped, and skips junk', () => {
    expect(callCountsCell({})).toBe('');
    expect(callCountsCell({ '5': 0, x: 3, '0': 2 } as Record<string, number>)).toBe('');
  });
});

describe('sessionCsvRow', () => {
  it('has one cell per header column', () => {
    expect(sessionCsvRow(record())).toBe(
      '2026-11-08,18:05,Quads 155,155,16,5.3,8,2,75,3: 3; 3&: 2; 4: 3,4: 2',
    );
  });

  it('leaves the preset empty for hand-tuned settings', () => {
    const row = sessionCsvRow(record({ preset: undefined, drops: 0, timesDropped: {} }));
    expect(row.split(',')).toHaveLength(HISTORY_CSV_HEADER.length);
    expect(row).toBe('2026-11-08,18:05,,155,16,5.3,8,0,100,3: 3; 3&: 2; 4: 3,');
  });

  it('escapes a preset name with a comma', () => {
    expect(sessionCsvRow(record({ preset: 'Odd, slow' }))).toContain(',"Odd, slow",');
  });
});

describe('historyCsv', () => {
  it('is a header line and the sessions newest first, CRLF-terminated', () => {
    const older = record({ startedAt: AT - 86_400_000, preset: undefined });
    const csv = historyCsv([older, record()]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(
      'Date,Time,Preset,BPM,Counts per phrase,Minutes,Tosses,Dropped,Caught %,Calls,Drops by call',
    );
    expect(lines[1].startsWith('2026-11-08,')).toBe(true);
    expect(lines[2].startsWith('2026-11-07,18:05,,')).toBe(true);
    expect(lines[3]).toBe('');
    expect(lines).toHaveLength(4);
  });

  it('is just the header for an empty history', () => {
    expect(historyCsv([])).toBe(HISTORY_CSV_HEADER.join(',') + '\r\n');
  });
});

describe('historyShareTitle', () => {
  it('counts the sessions', () => {
    expect(historyShareTitle([record()])).toBe('Guardrr history (1 session)');
    expect(historyShareTitle([record(), record({ startedAt: 1 })])).toBe(
      'Guardrr history (2 sessions)',
    );
  });

  it('names the History filter when one is chosen', () => {
    expect(historyShareTitle([record()], 'Quads 155')).toBe(
      'Guardrr history: Quads 155 (1 session)',
    );
    expect(historyShareTitle([record()], null)).toBe('Guardrr history (1 session)');
  });
});
