const debug = false;
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getServerInfos,
  getSettings,
  saveSettings,
  getLogins,
  saveLogins,
} from '../services/api';

import { 
  AlertMessage,
  Button,
  Card,
  DataTable,
  LoadingSpinner,
} from '../components';

// https://www.google.com/search?client=firefox-b-1-d&q=react+page+with+two+independent+form++onSubmit+&sei=U53haML6LsfYkPIP9ofv2AM
// import { 
  // FormSettings,
  // FormLogins,
// } from '../forms';
import FormSettings from '../forms/FormSettings';
import FormLogins   from '../forms/FormLogins';
import CardServerInfos   from './CardServerInfos';

import Row from 'react-bootstrap/Row'; // Import Row
import Col from 'react-bootstrap/Col'; // Import Col

const Settings = () => {
  // const passwordFormRef = useRef(null);
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  // this is how to handle data coming from a child form
  /*
  const [receivedInfos, setReceivedServerInfos] = useState(null);   // receivedInfos is then used in a DataTable in this page
  const handleInfosReceived = (infos) => {
    try {
      setLoading(true);
      
      if (debug) console.debug('handleInfosReceived infos=', infos);
      if (debug) console.debug('handleInfosReceived infos.internals=', infos.internals);
      if (debug) console.debug('handleInfosReceived infos.env=', infos.env);
      
      // first we reformat the environment object into an array of objects
      infos['envTable'] = obj2ArrayOfObj(infos.env);
      setReceivedServerInfos(infos);
      setError(null);
      
      if (debug) console.debug('handleInfosReceived infos.envTable=', infos.envTable);
      
    } catch (err) {
      console.error(t('api.errors.fetchServerInfos'), err);
      setError('api.errors.fetchServerInfos');
    } finally {
      setLoading(false);
    }
  };
  */

  // Column definitions for settings table
  const columnsVersions = [
    { key: 'name', label: 'settings.name' },
    { key: 'value', label: 'settings.version' },
  ];

  // Column definitions for environment table
  const columnsEnv = [
    { key: 'name', label: 'settings.name' },
    { key: 'value', label: 'settings.value' },
  ];

  // to handle data coming from the child form: <FormSettings onInfosSubmit={handleInfosReceived} />
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
          <Card title="settings.titleSettings" className="mb-4" icon="gear-fill">
            <FormSettings />
          </Card>
        </Col>{' '}
        {/* Close first Col */}


        <Col md={6}>
          {' '}
          {/* Use Col component */}
          <Card title="settings.titleLogin" className="mb-4" icon="person-fill-gear">
            <FormLogins />
          </Card>
        </Col>{' '}
        {/* Close second Col */}

      </Row>{' '}
      {/* Close Row */}

      
      <CardServerInfos />
      
      
      <Card title="settings.aboutTitle">
        <Card.Text>
          {' '}
          {/* Use Card.Text */}
          {t('settings.aboutDescription')}
        </Card.Text>
        
        <Card.Text>
          {' '}
          {/* Use Card.Text */}
          <a  href="https://github.com/audioscavenger/dms-gui"
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
