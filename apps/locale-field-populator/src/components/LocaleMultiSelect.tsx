import React, { useMemo, useState } from 'react';
import { Multiselect } from '@contentful/f36-multiselect';
import { normalizeLocaleCode, SimplifiedLocale } from '../utils/locales';
import { styles } from './LocaleMultiSelect.styles';

interface LocaleMultiSelectProps {
  availableLocales: SimplifiedLocale[];
  selectedLocales: SimplifiedLocale[];
  onSelectionChange: (locales: SimplifiedLocale[]) => void;
  isDisabled?: boolean;
  isInvalid?: boolean;
}

const LocaleMultiSelect: React.FC<LocaleMultiSelectProps> = ({
  availableLocales,
  selectedLocales,
  onSelectionChange,
  isDisabled = false,
  isInvalid = false,
}) => {
  const [searchValue, setSearchValue] = useState('');

  const filteredLocales = useMemo(() => {
    if (!searchValue) {
      return availableLocales;
    }

    const query = searchValue.toLowerCase();
    return availableLocales.filter((locale) => locale.name.toLowerCase().includes(query));
  }, [availableLocales, searchValue]);

  const handleLocaleToggle = (locale: SimplifiedLocale, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedLocales, locale]);
    } else {
      onSelectionChange(selectedLocales.filter((l) => l.code !== locale.code));
    }
  };

  // "Select all" operates on the currently visible (filtered) locales so it
  // stays consistent with an active search.
  const allFilteredSelected =
    filteredLocales.length > 0 &&
    filteredLocales.every((locale) => selectedLocales.some((l) => l.code === locale.code));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const toAdd = filteredLocales.filter(
        (locale) => !selectedLocales.some((l) => l.code === locale.code)
      );
      onSelectionChange([...selectedLocales, ...toAdd]);
    } else {
      const filteredCodes = new Set(filteredLocales.map((l) => l.code));
      onSelectionChange(selectedLocales.filter((l) => !filteredCodes.has(l.code)));
    }
  };

  return (
    <Multiselect
      className={isInvalid ? styles.invalid : undefined}
      searchProps={{
        searchPlaceholder: 'Search locales',
        onSearchValueChange: (event) => setSearchValue(event.target.value),
      }}
      placeholder="Select one or more"
      popoverProps={{ isFullWidth: true, listMaxHeight: 180 }}
      currentSelection={selectedLocales.map((l) => l.name)}
      triggerButtonProps={{ isDisabled }}>
      {filteredLocales.length > 0 && (
        <Multiselect.SelectAll
          onSelectItem={(e) => handleSelectAll(e.target.checked)}
          isChecked={allFilteredSelected}
        />
      )}
      {filteredLocales.map((locale) => (
        <Multiselect.Option
          key={`multiselect-locale-${normalizeLocaleCode(locale.code)}`}
          itemId={`multiselect-locale-${normalizeLocaleCode(locale.code)}`}
          value={locale.code}
          isChecked={selectedLocales.some((l) => l.code === locale.code)}
          onSelectItem={(e) => handleLocaleToggle(locale, e.target.checked)}>
          {locale.name}
        </Multiselect.Option>
      ))}
    </Multiselect>
  );
};

export default LocaleMultiSelect;
