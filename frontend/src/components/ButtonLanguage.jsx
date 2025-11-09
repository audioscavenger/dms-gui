import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Dropdown from 'react-bootstrap/Dropdown'; // Import react-bootstrap Dropdown

const ButtonLanguage = () => {
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
        {currentLang.toUpperCase()}
      </Dropdown.Toggle>

      <Dropdown.Menu align="end">
      
        {Object.keys(i18n.options.resources).map((lng) => (
        <Dropdown.Item
          key={lng}
          active={currentLang === lng}
          onClick={() => changeLanguage(lng)}
        >
          {t(`language.${lng}`)}
        </Dropdown.Item>
        ))}
        
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default ButtonLanguage;
