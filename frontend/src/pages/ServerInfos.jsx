import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const {
  debug,
  arrayOfStringToDict,
  obj2ArrayOfObj,
  reduxArrayOfObj,
  reduxPropertiesOfObj,
} = require('../../frontend.js');

import {
  getServerInfos,
} from '../services/api';

import { 
  Button,
  AlertMessage,
  DataTable,
  LoadingSpinner,
} from '../components';


const ServerInfos = () => {
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState(null);
  const [infos, setServerInfos] = useState({});

  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAllServerInfos(false);
  }, []);

  const fetchAllServerInfos = async (refresh) => {
    refresh = (refresh === undefined) ? false : refresh;
    if (debug) console.debug(`ddebug: ------------- fetchAllServerInfos call getServerInfos(${refresh})`);
    
    try {
      setLoading(true);
      const [infosData] = await Promise.all([
        getServerInfos(refresh),
      ]);
      
      // first we reformat the environment object into an array of objects
      // infosData['envTable'] = obj2ArrayOfObj(infosData.env);
      setServerInfos(infosData);
      setErrorMessage(null);

      if (debug) console.debug('ddebug: ------------- infosData', infosData);

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

  if (isLoading && !infos && !infos && !infos.internals) {
    return <LoadingSpinner />;
  }
            // onClick={fetchAllServerInfos(true)}

  return (
    <>
      <AlertMessage type="danger" message={errorMessage} />
      
        <div className="float-end">
          <Button
            variant="info"
            size="sm"
            icon="recycle"
            title={t('common.refresh')}
            className="me-2"
            onClick={() => fetchAllServerInfos(true)}
          />
        </div>

        {t('settings.serverInternalsDescription')}
        {!infos.env && t('api.errors.fetchServerInfos') ||
        <DataTable
          columns={columnsInternals}
          data={infos.internals}
          keyExtractor={(internal) => internal.name}
          isLoading={isLoading}
          emptyMessage="N/A"
        />
        }
        
        {t('settings.serverEnvDescription')}
        {!infos.env && t('api.errors.fetchServerEnv') ||
        <DataTable
          columns={columnsEnv}
          data={infos.env}
          keyExtractor={(env) => env.name}
          isLoading={isLoading}
          emptyMessage="N/A"
        />
        }
        
    </>
  );
}

export default ServerInfos;
        // <DataTable
          // columns={columnsInternals}
          // data={infos.internals}
          // keyExtractor={(internal) => internal.name}
          // isLoading={isLoading}
          // emptyMessage="N/A"
        // />
        
        // <Card.Text>
          // {' '}
          // {t('settings.serverEnvDescription')}
        // </Card.Text>
        // <DataTable
          // columns={columnsEnv}
          // data={infos.env}
          // keyExtractor={(env) => env.name}
          // isLoading={isLoading}
          // emptyMessage="N/A"
        // />
