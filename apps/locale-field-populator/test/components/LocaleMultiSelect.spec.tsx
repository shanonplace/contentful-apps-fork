import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import LocaleMultiSelect from '../../src/components/LocaleMultiSelect';
import { mapLocaleNamesToSimplifiedLocales } from '../../src/utils/locales';
import { mockSdk } from '../mocks';

describe('LocaleMultiSelect component', () => {
  const mockAvailableLocales = mapLocaleNamesToSimplifiedLocales(mockSdk.locales.names);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a placeholder text when no locales are selected', async () => {
    const onSelectionChange = vi.fn();

    await act(async () => {
      render(
        <LocaleMultiSelect
          availableLocales={mockAvailableLocales}
          selectedLocales={[]}
          onSelectionChange={onSelectionChange}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Select one or more')).toBeInTheDocument();
    });
  });

  it('selects every available locale when "Select all" is clicked', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    await act(async () => {
      render(
        <LocaleMultiSelect
          availableLocales={mockAvailableLocales}
          selectedLocales={[]}
          onSelectionChange={onSelectionChange}
        />
      );
    });

    await user.click(screen.getByText('Select one or more'));

    const selectAll = await screen.findByText('Select all');
    await user.click(selectAll);

    expect(onSelectionChange).toHaveBeenCalledWith(mockAvailableLocales);
  });
});
