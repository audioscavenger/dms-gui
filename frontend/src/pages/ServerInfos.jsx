import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  debugLog,
  errorLog,
  reduxArrayOfObjByValue,
} from '../../frontend';

import {
  getNodeInfos,
  getServerEnvs,
  getSettings,
  saveSettings,
} from '../services/api';

import { 
  Button,
  AlertMessage,
  SelectField,
  DataTable,
  LoadingSpinner,
} from '../components';
import { useLocalStorage } from '../hooks/useLocalStorage';


const ServerInfos = () => {
  const { t } = useTranslation();
  const [containerName, setContainerName] = useLocalStorage("containerName");
  const [isLoading, setLoading] = useState(true);

  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  const [infos, setInfos] = useState([]);
  const [envs, setServerEnvs] = useState([]);

  const [DMSs, setDMSs] = useState([]);


  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAll(false);
  }, []);


  const fetchAll = async (refresh) => {
    refresh = (refresh === undefined) ? false : refresh;
    debugLog(`fetchAll refresh=(${refresh})`);
    setLoading(true);

    await fetchSettings();
    await fetchServerInfos();
    await fetchServerEnvs(refresh);
    
    setLoading(false);

  };

  const fetchSettings = async () => {
    debugLog(`fetchSettings call getSettings(${containerName})`);
    
    try {
      const [settingsData] = await Promise.all([
        getSettings(containerName),
      ]);

      if (settingsData.success) {
        const dmsData = reduxArrayOfObjByValue(settingsData.message, 'name', 'containerName')    // [ {name:'containerName', value:'dms'}, .. ]
        setDMSs(dmsData);
        if (!containerName) setContainerName(dmsData[0]?.value);

        debugLog('settingsData', settingsData.message);
        debugLog('dmsData', dmsData);
        
        setErrorMessage(null);
        
      } else setErrorMessage(settingsData.message);

    } catch (err) {
      errorLog(t('api.errors.fetchSettings'), err);
      setErrorMessage('api.errors.fetchSettings');
    }
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
      
      } else setErrorMessage(infosData.message);

    } catch (err) {
      errorLog(t('api.errors.fetchServerInfos'), err);
      setErrorMessage('api.errors.fetchServerInfos');
    }
  };

  const fetchServerEnvs = async (refresh) => {
    refresh = (refresh === undefined) ? false : refresh;
    debugLog(`fetchServerEnvs call getServerEnvs(${containerName}, ${refresh})`);
    
    try {
      const [envsData] = await Promise.all([
        getServerEnvs(containerName, refresh),
      ]);

      debugLog('envsData', envsData);
      if (envsData.success) {
        setServerEnvs(envsData.message);
        
        setErrorMessage(null);
      
      } else setErrorMessage(envsData.message);

    } catch (err) {
      errorLog(t('api.errors.fetchServerEnvs'), err);
      setErrorMessage('api.errors.fetchServerEnvs');
    }
  };


  const handleChangeDMS = async (e) => {
    // e.preventDefault();
    const { name, value } = e.target;
    debugLog(`Switching to ${name}=${value}`);
    
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      
      if (value) {
        // this effectively switches name='containerName' to value selected, for scope='dms-gui' in settings table
        const result = await saveSettings(
          value,
          [],
        );
        
        if (result.success) {
          setContainerName(value);
          setSuccessMessage('settings.settingsSaved');
          fetchSettings(); // Refresh the settings
          
        } else setErrorMessage(result.message);
      }
      
    } catch (err) {
      errorLog(t('api.errors.saveSettings'), err);
      setErrorMessage('api.errors.saveSettings');
    }
  };


  // Prepare account options for the select field
  const dmsOptions = DMSs.map((dms) => ({
    value: dms.value,
    label: dms.value,
  }));


  // Column definitions
  const columns = [
    { key: 'name', label: 'settings.name' },
    { key: 'value', label: 'settings.value' },
  ];


  if (isLoading && !infos && !settings) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <AlertMessage type="danger" message={errorMessage} />
      <AlertMessage type="success" message={successMessage} />
      
      <SelectField
        id="containerName"
        name="containerName"
        label="settings.containerName"
        value={containerName}
        onChange={handleChangeDMS}
        options={dmsOptions}
        placeholder="common.container"
        helpText="settings.DMSHelp"
      />

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
