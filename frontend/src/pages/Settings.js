const debug = true;
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  obj2ArrayOfObj,
  reduxArrayOfObj,
  reduxPropertiesOfObj,
} from '../../functions.js';

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

import Row from 'react-bootstrap/Row'; // Import Row
import Col from 'react-bootstrap/Col'; // Import Col

const Settings = () => {
  // const passwordFormRef = useRef(null);
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(true);

  const [error, setError] = useState(null);
  const [receivedStatus, setReceivedServerStatus] = useState(null);

  const handleStatusReceived = (status) => {
    try {
      setLoading(true);
      
      if (debug) console.debug('handleStatusReceived status=', status);
      if (debug) console.debug('handleStatusReceived status.internals=', status.internals);
      if (debug) console.debug('handleStatusReceived status.env=', status.env);
      
      // first we reformat the environment object into an array of objects
      status['envTable'] = obj2ArrayOfObj(status.env);
      setReceivedServerStatus(status);
      setError(null);
      
      if (debug) console.debug('handleStatusReceived status.envTable=', status.envTable);
      
    } catch (err) {
      console.error(t('api.errors.fetchServerStatus'), err);
      setError('api.errors.fetchServerStatus');
    } finally {
      setLoading(false);
    }
  };

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
            <FormSettings onStatusSubmit={handleStatusReceived} />
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
        
        {(isLoading && !receivedStatus) ? (
          <>
            <LoadingSpinner />
          </>
        ) : (
          <>
            <Card.Text>
              {' '}
              {/* Use Card.Text */}
              <strong>{receivedStatus.name}</strong> {t('settings.version')}: {receivedStatus.version}
            </Card.Text>
            <DataTable
              columns={columnsVersions}
              data={receivedStatus.internals}
              keyExtractor={(variable) => variable.name}
              isLoading={isLoading}
              emptyMessage="N/A"
            />
            <DataTable
              columns={columnsEnv}
              data={receivedStatus.envTable}
              keyExtractor={(variable) => variable.name}
              isLoading={isLoading}
              emptyMessage="N/A"
            />
          </>
        )}
        
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
