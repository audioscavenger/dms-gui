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
  Button,
  Card,
  DataTable,
  LoadingSpinner,
} from '../components';

// https://www.google.com/search?client=firefox-b-1-d&q=react+page+with+two+independent+form++onSubmit+&sei=U53haML6LsfYkPIP9ofv2AM
import CardFormSettings   from './CardFormSettings';
import CardFormLogins     from './CardFormLogins';
import CardServerInfos    from './CardServerInfos';

import Row from 'react-bootstrap/Row'; // Import Row
import Col from 'react-bootstrap/Col'; // Import Col

const Settings = () => {
  // const passwordFormRef = useRef(null);
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState(null);

  // this is how to handle data coming from a child form
  /*
  const [receivedInfos, setReceivedServerInfos] = useState({});   // receivedInfos is then used in a DataTable in this page
  const handleInfosReceived = (infos) => {
    try {
      setLoading(true);
      
      if (debug) console.debug('handleInfosReceived infos=', infos);
      if (debug) console.debug('handleInfosReceived infos.internals=', infos.internals);
      if (debug) console.debug('handleInfosReceived infos.env=', infos.env);
      
      // first we reformat the environment object into an array of objects
      infos['envTable'] = obj2ArrayOfObj(infos.env);
      setReceivedServerInfos(infos);
      setErrorMessage(null);
      
      if (debug) console.debug('handleInfosReceived infos.envTable=', infos.envTable);
      
    } catch (err) {
      console.error(t('api.errors.fetchServerInfos'), err);
      setErrorMessage('api.errors.fetchServerInfos');
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

      <Row>
        {' '}
        
        <Col md={6} className="mb-4">
          {' '}
          <CardFormSettings />
        </Col>{' '}


        <Col md={6}>
          {' '}
          <CardFormLogins />
        </Col>{' '}

      </Row>{' '}
      
      <CardServerInfos />
      
      <Card title="settings.aboutTitle">
        <Card.Text>
          {' '}
          {t('settings.aboutDescription')}
        </Card.Text>
        
        <Card.Text>
          {' '}
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
      </Card>
    </div>
  );
};

export default Settings;
