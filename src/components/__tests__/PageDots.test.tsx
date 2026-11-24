import { fireEvent, render, screen } from '@testing-library/react-native';

import { pageDotsHint, pageDotsLabel } from '../../engine';
import { PageDots } from '../PageDots';

describe('<PageDots>', () => {
  it('names the page showing and hints at the other one', async () => {
    await render(<PageDots page={0} onPress={() => {}} />);
    const dots = screen.getByRole('button', { name: pageDotsLabel(0) });
    expect(dots.props.accessibilityHint).toBe(pageDotsHint(0));
  });

  it('switches pages on tap', async () => {
    const onPress = jest.fn();
    await render(<PageDots page={1} onPress={onPress} />);
    await fireEvent.press(screen.getByTestId('page-dots'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is just an indicator without a handler (no hint, disabled)', async () => {
    await render(<PageDots page={1} />);
    const dots = screen.getByTestId('page-dots');
    expect(dots.props.accessibilityHint).toBeUndefined();
    expect(dots).toBeDisabled();
  });
});
