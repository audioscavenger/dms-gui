const debug = true;
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getServerStatus,
  getSettings,
  saveSettings,
  getLogins,
  saveLogins,
} from '../services/api';

import { 
  AlertMessage,
  Button,
  Card,
} from '../components';

// https://www.google.com/search?client=firefox-b-1-d&q=react+page+with+two+independent+form++onSubmit+&sei=U53haML6LsfYkPIP9ofv2AM
// import { 
  // FormSettings,
  // FormLogins,
// } from '../forms';
import FormSettings from '../forms/FormSettings';
import FormLogins   from '../forms/FormLogins';

const { name, version, description } = require('../../package.json');  

import Row from 'react-bootstrap/Row'; // Import Row
import Col from 'react-bootstrap/Col'; // Import Col

const Settings = () => {
  // const passwordFormRef = useRef(null);
  const { t } = useTranslation();
  // const [errorMessage, setErrorMessage] = useState(null);
  // const [successMessage, setSuccessMessage] = useState('');


  return (
    <div>
      <h2 className="mb-4">{t('settings.title')}</h2>

      {/*
      <AlertMessage type="danger" message={errorMessage} />
      <AlertMessage type="success" message={successMessage} />
      */}

      <Row>
        {' '}
        {/* Use Row component */}
        
        <Col md={6} className="mb-4">
          {' '}
          {/* Use Col component */}
          <Card title="settings.titleSettings" className="mb-4">
            <FormSettings />
          </Card>
        </Col>{' '}
        {/* Close first Col */}


        <Col md={6}>
          {' '}
          {/* Use Col component */}
          <Card title="settings.titleLogin" className="mb-4">
            <FormLogins />
          </Card>
        </Col>{' '}
        {/* Close second Col */}

      </Row>{' '}
      {/* Close Row */}

      
      <Card title="settings.aboutTitle">
        <Card.Text>
          {' '}
          {/* Use Card.Text */}
          {t('settings.aboutDescription')}
        </Card.Text>
        <Card.Text>
          {' '}
          {/* Use Card.Text */}
          <strong>{name}</strong> {t('settings.version')}: {version}
        </Card.Text>
        <Card.Text>
          {' '}
          {/* Use Card.Text */}
          <strong>{status.name}</strong> {t('settings.version')}: {status.version}
        </Card.Text>
        <Card.Text>
          {' '}
          {/* Use Card.Text */}
          <a
            href="https://github.com/audioscavenger/dms-gui"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="outline-primary"
              icon="github"
              text="settings.githubLink"
            />
          </a>
        </Card.Text>{' '}
        {/* Correct closing tag */}
      </Card>
    </div>
  );
};

export default Settings;
