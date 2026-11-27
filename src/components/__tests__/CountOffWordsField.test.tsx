import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { DEFAULT_TOSS_SETTINGS, MAX_COUNT_OFF_WORDS, TossSettings } from '../../engine';
import { CountOffWordsField } from '../CountOffWordsField';

/** The field with real state, as SettingsPanel uses it; reports every saved list. */
function Harness({
  initial,
  countIn = 8,
  settings = DEFAULT_TOSS_SETTINGS,
  onChange,
}: {
  initial: string[];
  countIn?: number;
  settings?: TossSettings;
  onChange?: (words: string[]) => void;
}) {
  const [words, setWords] = useState(initial);
  return (
    <CountOffWordsField
      words={words}
      countIn={countIn}
      settings={settings}
      onChange={(next) => {
        setWords(next);
        onChange?.(next);
      }}
    />
  );
}

const field = () => screen.getByLabelText('Your count-off words');
const note = () => screen.getByTestId('count-off-words-note');

describe('<CountOffWordsField>', () => {
  it('shows the saved words and where they land (16 counts, lead 4, count-in 8)', async () => {
    await render(<Harness initial={['ready', 'set']} />);
    expect(field().props.value).toBe('ready set');
    expect(note()).toHaveTextContent('Spoken on counts 11–12, one word per count, then the call.');
  });

  it('saves cleaned-up words as they are typed, keeping the raw text while typing', async () => {
    const onChange = jest.fn();
    await render(<Harness initial={['ready', 'set']} onChange={onChange} />);
    await fireEvent.changeText(field(), 'Hit IT! ');
    expect(onChange).toHaveBeenLastCalledWith(['hit', 'it']);
    expect(field().props.value).toBe('Hit IT! ');
    await fireEvent(field(), 'blur');
    expect(field().props.value).toBe('hit it');
  });

  it('names a single count for one word', async () => {
    await render(<Harness initial={['go']} />);
    expect(note()).toHaveTextContent('Spoken on count 12, then the call.');
  });

  it('asks for words when the field is emptied', async () => {
    const onChange = jest.fn();
    await render(<Harness initial={['ready', 'set']} onChange={onChange} />);
    await fireEvent.changeText(field(), '   ');
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(note()).toHaveTextContent(`Type up to ${MAX_COUNT_OFF_WORDS} words, one per count.`);
  });

  it('explains when there are more words than counts before the call', async () => {
    await render(
      <Harness
        initial={['ready']}
        countIn={4}
        settings={{ ...DEFAULT_TOSS_SETTINGS, leadCounts: 2 }}
      />,
    );
    await fireEvent.changeText(field(), 'five six seven');
    expect(note()).toHaveTextContent(
      '3 words but only 2 counts before the call — shorten the lead, lengthen the count-in or drop a word.',
    );
    await fireEvent.changeText(field(), 'five six');
    expect(note()).toHaveTextContent('Spoken on counts 13–14, one word per count, then the call.');
  });

  it('caps the list at the most words a count-off can hold', async () => {
    const onChange = jest.fn();
    await render(<Harness initial={[]} onChange={onChange} />);
    await fireEvent.changeText(field(), 'a b c d e f g h i j');
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  });
});
