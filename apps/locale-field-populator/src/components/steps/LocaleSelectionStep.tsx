import { Flex, Subheading, FormControl, Select, Switch } from '@contentful/f36-components';
import { isSameLocaleFamily, normalizeLocaleCode, SimplifiedLocale } from '../../utils/locales';
import LocaleMultiSelect from '../LocaleMultiSelect';
import { useMemo, useState } from 'react';

interface LocaleSelectionStepProps {
  availableLocales: SimplifiedLocale[];
  selectedSourceLocale: string | undefined;
  selectedTargetLocales: SimplifiedLocale[];
  onSourceLocaleChange: (locale: string) => void;
  onTargetLocalesChange: (locales: SimplifiedLocale[]) => void;
  missingSourceLocale: boolean;
  missingTargetLocales: boolean;
}

const LocaleSelectionStep = ({
  availableLocales,
  selectedSourceLocale,
  selectedTargetLocales,
  onSourceLocaleChange,
  onTargetLocalesChange,
  missingSourceLocale,
  missingTargetLocales,
}: LocaleSelectionStepProps) => {
  const [restrictToSimilarLocales, setRestrictToSimilarLocales] = useState(true);

  const availableTargetLocales: SimplifiedLocale[] = useMemo(() => {
    if (!selectedSourceLocale) {
      return availableLocales;
    }
    return availableLocales.filter(
      (locale) =>
        selectedSourceLocale !== locale.code &&
        (!restrictToSimilarLocales || isSameLocaleFamily(selectedSourceLocale, locale.code))
    );
  }, [availableLocales, selectedSourceLocale, restrictToSimilarLocales]);

  const onSourceLocaleSelected = (newSourceLocale: string) => {
    const newSelectedTargetLocales = selectedTargetLocales.filter(
      (locale) =>
        locale.code !== newSourceLocale &&
        (!restrictToSimilarLocales || isSameLocaleFamily(newSourceLocale, locale.code))
    );

    onSourceLocaleChange(newSourceLocale);
    onTargetLocalesChange(newSelectedTargetLocales);
  };

  const onRestrictToggle = (restrict: boolean) => {
    setRestrictToSimilarLocales(restrict);

    // When re-enabling the similarity filter, drop any selected target locales
    // that are no longer visible so the selection stays in sync with the options.
    if (restrict && selectedSourceLocale) {
      onTargetLocalesChange(
        selectedTargetLocales.filter((locale) =>
          isSameLocaleFamily(selectedSourceLocale, locale.code)
        )
      );
    }
  };

  return (
    <Flex flexDirection="column">
      <Subheading>Select source and target locales</Subheading>
      <FormControl isRequired isInvalid={missingSourceLocale}>
        <FormControl.Label>Source locale</FormControl.Label>
        <Select
          id="source-locale"
          name="source-locale"
          testId="source-locale-select"
          value={selectedSourceLocale}
          onChange={(event) => onSourceLocaleSelected(event.target.value)}>
          {!selectedSourceLocale && (
            <Select.Option key={`select-locale-empty`} value={undefined}>
              Select one
            </Select.Option>
          )}
          {availableLocales.map((locale) => (
            <Select.Option
              key={`select-locale-${normalizeLocaleCode(locale.code)}`}
              data-test-id={`select-locale-${normalizeLocaleCode(locale.code)}`}
              value={locale.code}>
              {locale.name}
            </Select.Option>
          ))}
        </Select>
        <FormControl.HelpText>
          The source locale is the source field that content wil be copied from.
        </FormControl.HelpText>
        {missingSourceLocale && (
          <FormControl.ValidationMessage>Select source locale</FormControl.ValidationMessage>
        )}
      </FormControl>
      <FormControl isRequired isInvalid={missingTargetLocales}>
        <FormControl.Label>Target locales</FormControl.Label>
        <LocaleMultiSelect
          availableLocales={availableTargetLocales}
          selectedLocales={selectedTargetLocales}
          onSelectionChange={onTargetLocalesChange}
          isInvalid={missingTargetLocales}
          isDisabled={!selectedSourceLocale}
        />
        <FormControl.HelpText>
          The target locales are the fields that content will be pasted into.
        </FormControl.HelpText>
        {missingTargetLocales && (
          <FormControl.ValidationMessage>Select target locales</FormControl.ValidationMessage>
        )}
      </FormControl>
      <Switch
        name="restrict-to-similar-locales"
        id="restrict-to-similar-locales"
        testId="restrict-to-similar-locales-switch"
        isChecked={restrictToSimilarLocales}
        onChange={(event) => onRestrictToggle(event.target.checked)}>
        Only show locales similar to the source
      </Switch>
    </Flex>
  );
};

export default LocaleSelectionStep;
