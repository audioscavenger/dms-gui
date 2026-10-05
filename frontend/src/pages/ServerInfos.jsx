// forwardRef, useImperativeHandle is used to export functions to the parent
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';

import {
  debugLog,
  errorLog,
} from '../../frontend.mjs';
// import {
//   getValueFromArrayOfObj,
// } from '../../../common.mjs';
import {
  getNodeInfos,
  getServerEnvs,
} from '../services/api.mjs';

import AlertMessage from '../components/AlertMessage';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';


// EXPORTED FUNCTIONS OPTION 1: Name the inner function "ServerInfos"
const ServerInfos = forwardRef(function ServerInfos(props, ref) {
// const ServerInfos = forwardRef((props, ref) => {
  const { t } = useTranslation();
  const triggerToast = useToast();
  const [containerName] = useLocalStorage("containerName", '');
  const [mailservers] = useLocalStorage("mailservers", []);
  const { user } = useAuth();

  const [isLoading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  const [infos, setInfos] = useState([]);
  const [envs, setServerEnvs] = useState([]);


  const fetchAll = async (refresh=false) => {
    refresh = !user.isAdmin ? false : refresh;
    debugLog(`fetchAll refresh=(${refresh})`);
    setLoading(true);

    await fetchServerInfos();
    await fetchServerEnvs(refresh);
    
    setLoading(false);

  };

  // Expose the function to the parent ref
  useImperativeHandle(ref, () => ({
    onClickRefresh: () => fetchAll(true)
  }));

  const fetchServerInfos = async () => {
    debugLog(`fetchServerInfos call getNodeInfos()`);
    
    try {
      const [infosData] = await Promise.all([
        getNodeInfos(),
      ]);

      if (infosData?.success) {
        setInfos(infosData.message);
        debugLog('infosData', infosData.message);
          // [
          //   { name: "debug", value: true },
          //   { name: "DMSGUI_VERSION", value: "1.5.63" },
          //   { name: "PORT_BACKEND", value: 3000 },
          //   ...
          // ]
        
        setErrorMessage(null);
      
      } else setErrorMessage(infosData?.error);

    } catch (error) {
      errorLog(t('api.errors.fetchServerInfos'), error);
      // setErrorMessage('api.errors.fetchServerInfos');
      setErrorMessage({key: 'api.errors.fetchServerInfos', values: { error: error.message }});
    }
  };

  const fetchServerEnvs = async (refresh=false) => {
    if (!mailservers.length) return;
    refresh = !user.isAdmin ? false : refresh;
    // debugLog(`fetchServerEnvs call getServerEnvs('mailserver', ${getValueFromArrayOfObj(mailservers, containerName, 'value', 'schema')}, ${containerName}, ${refresh})`);
    debugLog(`fetchServerEnvs call getServerEnvs('mailserver', ${containerName}, ${refresh})`);
    
    try {
      const [envsData] = await Promise.all([
        // getServerEnvs('mailserver', getValueFromArrayOfObj(mailservers, containerName, 'value', 'schema'), containerName, refresh),
        getServerEnvs('mailserver', containerName, refresh),
      ]);

      debugLog('envsData', envsData);
      if (envsData?.success) {
        setServerEnvs(envsData.message);
        
        setErrorMessage(null);
      
      } else setErrorMessage(envsData?.error);

    } catch (error) {
      errorLog(t('api.errors.fetchServerEnvs'), error);
      // setErrorMessage('api.errors.fetchServerEnvs');
      setErrorMessage({key: 'api.errors.fetchServerEnvs', values: { error: error.message }});
    }
  };


  // Column definitions
  const columns = [
    { key: 'name', label: 'settings.name' },
    { key: 'value', label: 'settings.value' },
  ];


  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAll(false);
  }, [mailservers]);


  // if (isLoading && !infos && !settings || !user.isAdmin) {
  if (isLoading || !user.isAdmin) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <AlertMessage type="danger" message={errorMessage} />
      <AlertMessage type="success" message={successMessage} />
      
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
});

// EXPORTED FUNCTION OPTION 2: satisfy ESLint and make debugging easier
// ServerInfos.displayName = 'ServerInfos';
export default ServerInfos;
