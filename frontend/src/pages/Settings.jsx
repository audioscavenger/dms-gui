// useRef is used to import functions from a child
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import About from '../components/About';
import Accordion from '../components/Accordion';
import Translate from '../components/Translate';
import { useLocalStorage } from '../hooks/useLocalStorage';

// https://www.google.com/search?client=firefox-b-1-d&q=react+page+with+two+independent+form++onSubmit+&sei=U53haML6LsfYkPIP9ofv2AM
import FormContainerAdd from './FormContainerAdd';
import ServerInfos from './ServerInfos';


const Settings = () => {
  const { t } = useTranslation();
  const [containerName] = useLocalStorage("containerName", '');
  
  // Create a reference holder for the child component
  const serverInfosRef = useRef(null);

  // to handle data coming from the child form: <FormContainerAdd onInfosSubmit={handleInfosReceived} />
  // https://icons.getbootstrap.com/
  const settingTabs = [
    { id: 1, title: "settings.titleContainerAdd", icon: "house-add",      content: <FormContainerAdd />,  },
    { id: 2, title: "settings.titleServerInfos",  icon: "house-fill",     content: <ServerInfos ref={serverInfosRef} />, titleExtra: t('common.forWhat', {what:containerName}), onClickRefresh: () => serverInfosRef.current?.onClickRefresh(), },
    { id: 3, title: "settings.titleContainers",   icon: "houses-fill",    content: <></>, },
    { id: 4, title: "settings.aboutTitle",        icon: "question-circle",content: <About />, },
  ];

  return (
    <>
      <h2 className="mb-4">{Translate('settings.title')}</h2>

      <Accordion tabs={settingTabs}>
      </Accordion>

    </>
  );

};


export default Settings;
