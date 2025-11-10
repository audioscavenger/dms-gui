import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

// import {
//   arrayOfStringToDict,
//   byteSize2HumanSize,
//   fixStringType,
//   funcName,
//   getValueFromArrayOfObj, 
//   getValuesFromArrayOfObj,
//   humanSize2ByteSize,
//   mergeArrayOfObj,
//   moveKeyToLast,
//   obj2ArrayOfObj,
//   pluck,
//   reduxArrayOfObjByKey,
//   reduxArrayOfObjByValue,
//   reduxPropertiesOfObj,
// } from '../../../common.mjs';

import {
  Accordion,
  Button,
  Card,
  Translate
} from '../components/index.jsx';

// https://www.google.com/search?client=firefox-b-1-d&q=react+page+with+two+independent+form++onSubmit+&sei=U53haML6LsfYkPIP9ofv2AM
import FormContainerAdd from './FormContainerAdd';
import ServerInfos from './ServerInfos';


const Settings = () => {
  // const passwordFormRef = useRef(null);
  const { t } = useTranslation();

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
    { id: 1, title: "settings.titleContainerAdd", icon: "house-add",  content: FormContainerAdd(),  },
    { id: 2, title: "settings.titleServerInfos",  icon: "house-fill", content: ServerInfos(),       titleExtra:t('common.for', {what:'dms'}) },
    { id: 3, title: "settings.titleContainers",   icon: "houses-fill",content: <></>,                  },
  ];

  // to handle data coming from the child form: <FormContainerAdd onInfosSubmit={handleInfosReceived} />
  return (
    <>
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
    </>
  );
};

export default Settings;
