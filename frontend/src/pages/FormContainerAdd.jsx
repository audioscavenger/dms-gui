import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  debugLog,
  errorLog,
  mergeArrayOfObj,
  getValueFromArrayOfObj,
} from '../../frontend';

import {
  getSettings,
  saveSettings,
  initAPI,
} from '../services/api';

import { 
  AlertMessage,
  Button,
  FormField,
  LoadingSpinner,
} from '../components';
import { useLocalStorage } from '../hooks/useLocalStorage';

// https://www.google.com/search?client=firefox-b-1-d&q=react+page+with+two+independent+form++onSubmit+&sei=U53haML6LsfYkPIP9ofv2AM
// This is how to pass back onInfosSubmit to the parent page
// const FormContainerAdd = ({ onInfosSubmit }) => {
function FormContainerAdd() {
  const { t } = useTranslation();
  const [containerName, setContainerName] = useLocalStorage("containerName");
  const [isLoading, setLoading] = useState(true);
  const [submissionSettings, setSubmissionSettings] = useState(null); // 'idle', 'submitting', 'success', 'error'

  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  const [formErrors, setFormErrors] = useState({});
  const [settings, setSettings] = useState([]);


  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAll();
  }, []);
  // }, [settings]);    // infinite loop if settings fails to update


  const fetchAll = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // const settingsData  = await fetchSettings();  // [ {name:name, value: value}, ..]
    await fetchSettings();  // [ {name:name, value: value}, ..]

    // onInfosSubmit(infosData);  // that's what you send back to the parent page

    setLoading(false);

  };

  const fetchSettings = async () => {
    debugLog(`fetchSettings call getSettings(${containerName})`);

    try {
      const [settingsData] = await Promise.all([
        getSettings(containerName),
      ]);
      // setSettings({
        // ...settings,
        // ...settingsData,
      // });
      // debugLog(`fetchAll mergeArrayOfObj settingsData`,settingsData);

      if (settingsData.success) {
        console.debug('fetchAll: settingsData', settingsData)
        setSettings(mergeArrayOfObj(settingsData.message, settings, 'name'));

        setErrorMessage(null);
        return settingsData.message;
        
      } else setErrorMessage(settingsData.message);

    } catch (err) {
      errorLog(t('api.errors.fetchSettings'), err);
      setErrorMessage('api.errors.fetchSettings');
    }
  };


  const handleDMS_API_KEYregen = async (e) => {
    // e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      
      debugLog('regen API key for containerName=', getValueFromArrayOfObj(settings, 'containerName'))
      const result = await initAPI(getValueFromArrayOfObj(settings, 'containerName'), 'regen');

      if (result.success) {
        const DMS_API_KEY = result.message;
        
        // debugLog('settings',settings)
        // debugLog('initAPI', result)
        // debugLog('DMS_API_KEY', DMS_API_KEY)

        if (!containerName) setContainerName(getValueFromArrayOfObj(settings, 'containerName'));
        setSettings(mergeArrayOfObj(settings, [{name: 'DMS_API_KEY', value: DMS_API_KEY}], 'name'));
        
        setSuccessMessage(t('settings.DMS_API_KEYregened', {DMS_API_KEY: DMS_API_KEY}));
        
      } else setErrorMessage(result.message);
      
    } catch (err) {
      errorLog(t('api.errors.DMS_API_KEYregen'), err.message);
      setErrorMessage('api.errors.DMS_API_KEYregen', err.message);
    }
  };


  const handleChangeSettings = (e) => {
    const { name, value } = e.target;
    setErrorMessage(null);
    setSuccessMessage(null);

    // merge array of settings objects by their name
    debugLog(`handleChangeSettings mergeArrayOfObj settings`,settings);
    debugLog(`handleChangeSettings mergeArrayOfObj [{name: name, value:value}]`, [{name: name, value:value}]);
    setSettings(mergeArrayOfObj(settings, [{name: name, value:value}], 'name'));

    // Clear the error for this field while typing
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null,
      });
    }
  };

  const validateFormContainerAdd = () => {
    const errors = {};

    // if (settings.containerName.length == 0) {
    if (!settings.find(item => item['name'] == 'containerName') || !settings.find(item => item['name'] == 'containerName').value.length) {
      errors.containerName = 'settings.containerNameRequired';
    }
    // if (settings.setupPath.length == 0) {
    if (!settings.find(item => item['name'] == 'setupPath') || !settings.find(item => item['name'] == 'setupPath').value.length) {
      errors.setupPath = 'settings.setupPathRequired';
    }

    // TODO: setupPath: maybe add an api call to execInContainer/execCommand to test if exist?

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitSettings = async (e) => {
    e.preventDefault();
    debugLog('Form settings Submitted:', settings);
    
    setSubmissionSettings('submitting');
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validateFormContainerAdd()) {
      return;
    }

    try {
      const result = await saveSettings(
        getValueFromArrayOfObj(settings, 'containerName'),
        settings,
      );
      if (result.success) {
        setSubmissionSettings('success');
        setSuccessMessage('settings.settingsSaved');
        fetchSettings(); // Refresh the settings
        
      } else setErrorMessage(result.message);
      
    } catch (err) {
      setSubmissionSettings('error');
      errorLog(t('api.errors.saveSettings'), err);
      setErrorMessage('api.errors.saveSettings');
    }
  };


  // if (isLoading && !settings && !Object.keys(settings).length) {
  if (isLoading && !settings.length) {
    return <LoadingSpinner />;
  }
  
        // <div className="float-end">
          // <Button
            // variant="warning"
            // size="sm"
            // icon="arrow-repeat"
            // title={t('common.refresh')}
            // className="me-2"
            // onClick={() => fetchAll()}
          // />
        // </div>

  return (
    <>
      <AlertMessage type="danger" message={errorMessage} />
      <AlertMessage type="success" message={successMessage} />
      
        <form onSubmit={handleSubmitSettings} className="form-wrapper">
          <FormField
            type="text"
            id="containerName"
            name="containerName"
            label="settings.containerName"
            value={getValueFromArrayOfObj(settings, 'containerName')}
            onChange={handleChangeSettings}
            placeholder="dms"
            error={formErrors.containerName}
            helpText="settings.containerNameHelp"
            required
          />

          <FormField
            type="text"
            id="setupPath"
            name="setupPath"
            label="settings.setupPath"
            value={getValueFromArrayOfObj(settings, 'setupPath')}
            onChange={handleChangeSettings}
            placeholder="/usr/local/bin/setup"
            error={formErrors.setupPath}
            helpText="settings.setupPathHelp"
            required
          />
        
            <FormField
              type="text"
              id="DMS_API_KEY"
              name="DMS_API_KEY"
              label="settings.DMS_API_KEY"
              value={getValueFromArrayOfObj(settings, 'DMS_API_KEY')}
              onChange={handleChangeSettings}
              placeholder="DMS_API_KEY"
              error={formErrors.DMS_API_KEY}
              helpText="settings.DMS_API_KEYHelp"
            >
            <Button
              variant="warning"
              icon="recycle"
              title={t('settings.DMS_API_KEYregen')}
              onClick={() => handleDMS_API_KEYregen()}
            />
            <Button
              variant="outline-secondary"
              icon="question-circle"
              title={t('common.DMS_API_KEYregenedHelp')}
              onClick={() => {setSuccessMessage(t('settings.DMS_API_KEYregened', {DMS_API_KEY:getValueFromArrayOfObj(settings, 'DMS_API_KEY')}))}}
            />
            <Button
              variant="outline-secondary"
              icon="clipboard-plus"
              title={t('common.copy')}
              onClick={() => {navigator.clipboard.writeText(getValueFromArrayOfObj(settings, 'DMS_API_KEY'))}}
            />
            </FormField>
        
          <FormField
            type="text"
            id="dnsProvider"
            name="dnsProvider"
            label="settings.dnsProvider"
            value={getValueFromArrayOfObj(settings, 'dnsProvider')}
            onChange={handleChangeSettings}
            placeholder="CloudFlare"
            error={formErrors.dnsProvider}
            helpText="settings.dnsProviderHelp"
          />
        
          <Button type="submit" variant="primary" text="settings.saveButtonSettings" />
        </form>
    </>
  );

}

export default FormContainerAdd;

