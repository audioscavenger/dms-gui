import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const {
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
} = require('../../frontend.js');

import {
  getServerInfos,
  getServerEnvs,
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
  const [infos, setServerInfos] = useState([]);
  const [envs, setServerEnvs] = useState([]);

  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAllDatas(false);
  }, []);


  const fetchAllDatas = async (refresh) => {
    refresh = (refresh === undefined) ? false : refresh;
    debugLog(`fetchAllDatas refresh=(${refresh})`);
    setLoading(true);

    await fetchServerInfos();
    await fetchServerEnvs(refresh);
    
    // onInfosSubmit(infosData);  // that's what you send back to the parent page

    setLoading(false);

  };

  const fetchServerInfos = async () => {
    debugLog(`fetchServerInfos call getServerInfos()`);
    
    try {
      const [infosData] = await Promise.all([
        getServerInfos(),
      ]);
      setServerInfos(infosData);
      debugLog('infosData', infosData);
      
      setErrorMessage(null);
      return infosData;

    } catch (err) {
      errorLog(t('api.errors.fetchServerInfos'), err);
      setErrorMessage('api.errors.fetchServerInfos');
    }
  };

  const fetchServerEnvs = async (refresh) => {
    refresh = (refresh === undefined) ? false : refresh;
    debugLog(`fetchServerEnvs call getServerInfos(${refresh})`);
    
    try {
      const [envsData] = await Promise.all([
        getServerEnvs(refresh),
      ]);
      setServerEnvs(envsData);
      debugLog('envsData', envsData);
      
      setErrorMessage(null);
      return envsData;

    } catch (err) {
      errorLog(t('api.errors.fetchServerEnvs'), err);
      setErrorMessage('api.errors.fetchServerEnvs');
    }
  };

  // Column definitions
  const columns = [
    { key: 'name', label: 'settings.name' },
    { key: 'value', label: 'settings.value' },
  ];


  if (isLoading && !infos && !infos && !infos.internals) {
    return <LoadingSpinner />;
  }
            // onClick={fetchAllDatas(true)}

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
            onClick={() => fetchAllDatas(true)}
          />
        </div>

        {t('settings.serverInternalsDescription')}
        {!infos && t('api.errors.fetchServerInfos') ||
        <DataTable
          columns={columns}
          data={infos}
          keyExtractor={(info) => info.name}
          isLoading={isLoading}
          emptyMessage="N/A"
        />
        }
        
        {t('settings.serverEnvDescription')}
        {!envs && t('api.errors.fetchServerEnvs') ||
        <DataTable
          columns={columns}
          data={envs}
          keyExtractor={(env) => env.name}
          isLoading={isLoading}
          emptyMessage="N/A"
        />
        }
        
    </>
  );
}

export default ServerInfos;
