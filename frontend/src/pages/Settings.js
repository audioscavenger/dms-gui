import React, { useState, useEffect } from 'react';
// import { useTranslation } from 'react-i18next';
import RBAccordion from 'react-bootstrap/Accordion';

const {
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
} = require('../../frontend.js');

import { 
  Accordion,
  Button,
  Card,
  DataTable,
  LoadingSpinner,
  Translate,
} from '../components';

// https://www.google.com/search?client=firefox-b-1-d&q=react+page+with+two+independent+form++onSubmit+&sei=U53haML6LsfYkPIP9ofv2AM
// import FormLogins     from './FormLogins';   // deprecated
import FormSettings   from './FormSettings';
import ServerInfos    from './ServerInfos';

import Row from 'react-bootstrap/Row'; // Import Row
import Col from 'react-bootstrap/Col'; // Import Col

const Settings = () => {
  // const passwordFormRef = useRef(null);
  // const { t } = useTranslation();
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

  // https://icons.getbootstrap.com/
  const settingTabs = [
  // { id: 1, title: "settings.titleLogin",        icon: "person-fill-gear",     content: FormLogins() },   // deprecated
  { id: 1, title: "settings.titleSettings",     icon: "gear-fill",            content: FormSettings() },
  { id: 2, title: "settings.serverInfosTitle",  icon: "gear-wide-connected",  content: ServerInfos() },
  ];

  // to handle data coming from the child form: <FormSettings onInfosSubmit={handleInfosReceived} />
  return (
    <div>
      <h2 className="mb-4">{Translate('settings.title')}</h2>

      <Accordion tabs={settingTabs}>
      </Accordion>

      <Card title="settings.aboutTitle">
        <Card.Text>
          {' '}
          {Translate('settings.aboutDescription')}
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
