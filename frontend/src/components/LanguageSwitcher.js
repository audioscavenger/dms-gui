import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Dropdown from 'react-bootstrap/Dropdown'; // Import react-bootstrap Dropdown

const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);

  useEffect(() => {
    setCurrentLang(i18n.language);
  }, [i18n.language]);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng).then(() => {
      setCurrentLang(lng);
    });
  };

  return (
    <Dropdown>
      <Dropdown.Toggle
        variant="outline-light"
        id="languageDropdown"
        size="sm"
        style={{ height: '32px' }} // Keep the height if needed
      >
        <i className="bi bi-translate me-1"></i>
        {currentLang === 'pl' ? 'PL' : 'EN'}
      </Dropdown.Toggle>

      <Dropdown.Menu align="end">
        <Dropdown.Item
          active={currentLang === 'en'}
          onClick={() => changeLanguage('en')}
        >
          {t('language.en')}
        </Dropdown.Item>
        <Dropdown.Item
          active={currentLang === 'pl'}
          onClick={() => changeLanguage('pl')}
        >
          {t('language.pl')}
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default LanguageSwitcher;
