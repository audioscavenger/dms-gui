import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  debugLog,
  errorLog,
} from '../../frontend.mjs';
import {
//   regexColors,
//   regexPrintOnly,
//   regexFindEmailRegex,
//   regexFindEmailStrict,
//   regexFindEmailLax,
//   regexEmailRegex,
//   regexEmailStrict,
//   regexEmailLax,
//   regexMatchPostfix,
//   regexUsername,
//   funcName,
//   fixStringType,
//   arrayOfStringToDict,
//   obj2ArrayOfObj,
//   reduxArrayOfObjByKey,
//   reduxArrayOfObjByValue,
//   reduxPropertiesOfObj,
//   mergeArrayOfObj,
  getValueFromArrayOfObj,
//   getValuesFromArrayOfObj,
//   pluck,
//   byteSize2HumanSize,
//   humanSize2ByteSize,
//   moveKeyToLast,
} from '../../../common.mjs';
import {
  getNodeInfos,
  getServerEnvs,
} from '../services/api.mjs';

import { 
  Button,
  AlertMessage,
  DataTable,
  LoadingSpinner,
} from '../components/index.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';


const ServerInfos = () => {
  const { t } = useTranslation();
  const [containerName] = useLocalStorage("containerName", '');
  const [mailservers] = useLocalStorage("mailservers", []);
  const { user } = useAuth();

  const [isLoading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  const [infos, setInfos] = useState([]);
  const [envs, setServerEnvs] = useState([]);


  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAll(false);
  }, [mailservers]);


  const fetchAll = async (refresh=false) => {
    refresh = !user.isAdmin ? false : refresh;
    debugLog(`fetchAll refresh=(${refresh})`);
    setLoading(true);

    await fetchServerInfos();
    await fetchServerEnvs(refresh);
    
    setLoading(false);

  };

  const fetchServerInfos = async () => {
    debugLog(`fetchServerInfos call getNodeInfos()`);
    
    try {
      const [infosData] = await Promise.all([
        getNodeInfos(),
      ]);

      if (infosData.success) {
        setInfos(infosData.message);
        debugLog('infosData', infosData.message);
        
        setErrorMessage(null);
      
      } else setErrorMessage(infosData?.error);

    } catch (error) {
      errorLog(t('api.errors.fetchServerInfos'), error);
      setErrorMessage('api.errors.fetchServerInfos');
    }
  };

  const fetchServerEnvs = async (refresh=false) => {
    if (!mailservers || !mailservers.length) return;
    refresh = !user.isAdmin ? false : refresh;
    // debugLog(`fetchServerEnvs call getServerEnvs('mailserver', ${getValueFromArrayOfObj(mailservers, containerName, 'value', 'schema')}, ${containerName}, ${refresh})`);
    debugLog(`fetchServerEnvs call getServerEnvs('mailserver', ${containerName}, ${refresh})`);
    
    try {
      const [envsData] = await Promise.all([
        // getServerEnvs('mailserver', getValueFromArrayOfObj(mailservers, containerName, 'value', 'schema'), containerName, refresh),
        getServerEnvs('mailserver', containerName, refresh),
      ]);

      debugLog('envsData', envsData);
      if (envsData.success) {
        setServerEnvs(envsData.message);
        
        setErrorMessage(null);
      
      } else setErrorMessage(envsData?.error);

    } catch (error) {
      errorLog(t('api.errors.fetchServerEnvs'), error);
      setErrorMessage('api.errors.fetchServerEnvs');
    }
  };


  // Column definitions
  const columns = [
    { key: 'name', label: 'settings.name' },
    { key: 'value', label: 'settings.value' },
  ];


  // if (isLoading && !infos && !settings || !user.isAdmin) {
  if (isLoading || !user.isAdmin) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <AlertMessage type="danger" message={errorMessage} />
      <AlertMessage type="success" message={successMessage} />
      
      <div className="float-end">
        <Button
          variant="warning"
          size="sm"
          icon="arrow-repeat"
          title={t('common.refresh')}
          className="me-2"
          onClick={() => fetchAll(true)}
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
