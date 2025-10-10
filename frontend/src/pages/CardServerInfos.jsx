const debug = false;
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  obj2ArrayOfObj,
} from '../../functions.js';

import {
  getServerInfos,
} from '../services/api';

import { 
  AlertMessage,
  Card,
  DataTable,
  LoadingSpinner,
} from '../components';


const CardServerInfos = () => {
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState(null);
  const [infos, setServerInfos] = useState(null);

  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchServerInfos(false);
  }, []);

  const fetchServerInfos = async (refresh) => {
    refresh = (refresh === undefined) ? false : refresh;
    if (debug) console.debug(`ddebug: ------------- fetchServerInfos call getServerInfos(${refresh})`);
    
    try {
      setLoading(true);
      const [infosData] = await Promise.all([
        getServerInfos(refresh),
      ]);
      
      // first we reformat the environment object into an array of objects
      infosData['envTable'] = obj2ArrayOfObj(infosData.env);
      setServerInfos(infosData);
      setErrorMessage(null);

      // if (debug) console.debug('ddebug: ------------- infosData', infosData);

    } catch (err) {
      console.error(t('api.errors.fetchServerInfos'), err);
      setErrorMessage('api.errors.fetchServerInfos');
    } finally {
      setLoading(false);
    }
  };

  // Column definitions for internals table
  const columnsInternals = [
    { key: 'name', label: 'settings.name' },
    { key: 'value', label: 'settings.version' },
  ];

  // Column definitions for environment table
  const columnsEnv = [
    { key: 'name', label: 'settings.name' },
    { key: 'value', label: 'settings.value' },
  ];

  if (isLoading && !infos) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <AlertMessage type="danger" message={errorMessage} />
      
      <Card title="settings.serverInfosTitle">
        <Card.Text>
          {' '}
          {t('settings.serverInternalsDescription')}
        </Card.Text>
        
        <Card.Text>
          {' '}
          <strong>{infos.name}</strong> {t('settings.version')}: {infos.version}
        </Card.Text>
        <DataTable
          columns={columnsInternals}
          data={infos.internals}
          keyExtractor={(variable) => variable.name}
          isLoading={isLoading}
          emptyMessage="N/A"
        />
        
        <Card.Text>
          {' '}
          {t('settings.serverEnvDescription')}
        </Card.Text>
        <DataTable
          columns={columnsEnv}
          data={infos.envTable}
          keyExtractor={(variable) => variable.name}
          isLoading={isLoading}
          emptyMessage="N/A"
        />
        
      </Card>
    </>
  );
};

export default CardServerInfos;
