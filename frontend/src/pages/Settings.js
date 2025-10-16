import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import RBAccordion from 'react-bootstrap/Accordion';

const {
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
} = require('../../frontend.js');
import {
  getServerInfos,
  getSettings,
  saveSettings,
  getLogins,
  saveLogins,
} from '../services/api';

import { 
  Accordion,
  Button,
  Card,
  DataTable,
  LoadingSpinner,
} from '../components';

// https://www.google.com/search?client=firefox-b-1-d&q=react+page+with+two+independent+form++onSubmit+&sei=U53haML6LsfYkPIP9ofv2AM
import FormSettings   from './FormSettings';
import FormLogins     from './FormLogins';
import ServerInfos    from './ServerInfos';
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
      
      debugLog('handleInfosReceived infos=', infos);
      debugLog('handleInfosReceived infos.internals=', infos.internals);
      debugLog('handleInfosReceived infos.env=', infos.env);
      
      // first we reformat the environment object into an array of objects
      infos['envTable'] = obj2ArrayOfObj(infos.env);
      setReceivedServerInfos(infos);
      setErrorMessage(null);
      
      debugLog('handleInfosReceived infos.envTable=', infos.envTable);
      
    } catch (err) {
      errorLog(t('api.errors.fetchServerInfos'), err);
      setErrorMessage('api.errors.fetchServerInfos');
    } finally {
      setLoading(false);
    }
  };
  */

  const settingTabs = [
  { id: 1, title: "settings.titleSettings",     icon: "gear-fill",            content: FormSettings() },
  { id: 2, title: "settings.titleLogin",        icon: "person-fill-gear",     content: FormLogins() },
  { id: 3, title: "settings.serverInfosTitle",  icon: "gear-wide-connected",  content: ServerInfos() },
  ];
  const noPadding = false;
  const bodyClassName   = Boolean(noPadding)      == true ? 'p-0' : '';


    // <RBAccordion defaultActiveKey="1">
        // <RBAccordion.Item key="1" eventKey="1">
          // <RBAccordion.Header>
            // <i className="me-2 bi bi-gear-fill"></i> {t("settings.titleSettings")}
          // </RBAccordion.Header>
          // <RBAccordion.Body className={bodyClassName}>
            // <FormSettings />
          // </RBAccordion.Body>
        // </RBAccordion.Item>
        
        // <RBAccordion.Item key="2" eventKey="2">
          // <RBAccordion.Header>
            // <i className="me-2 bi bi-gear-fill"></i> {t("settings.titleLogin")}
          // </RBAccordion.Header>
          // <RBAccordion.Body className={bodyClassName}>
            // <FormLogins />
          // </RBAccordion.Body>
        // </RBAccordion.Item>
        
        // <RBAccordion.Item key="3" eventKey="3">
          // <RBAccordion.Header>
            // <i className="me-2 bi bi-gear-fill"></i> {t("settings.serverInfosTitle")}
          // </RBAccordion.Header>
          // <RBAccordion.Body className={bodyClassName}>
            // <ServerInfos />
          // </RBAccordion.Body>
        // </RBAccordion.Item>
    // </RBAccordion>



  // to handle data coming from the child form: <FormSettings onInfosSubmit={handleInfosReceived} />
  return (
    <div>
      <h2 className="mb-4">{t('settings.title')}</h2>

      <Accordion tabs={settingTabs}>
      </Accordion>

      <Card title="settings.aboutTitle">
        <Card.Text>
          {' '}
          {t('settings.aboutDescription')}
        </Card.Text>{' '}
          
        <Card.Text>
          {' '}
          <Button
            variant="outline-primary"
            icon="github"
            text="settings.githubLink"
            href="https://github.com/audioscavenger/dms-gui"
            target="_blank"
            rel="noopener noreferrer"
          />
        </Card.Text>{' '}
      </Card>
    </div>
  );
};

export default Settings;
