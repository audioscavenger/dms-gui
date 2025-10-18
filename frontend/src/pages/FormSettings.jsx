import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const {
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
  mergeArrayOfObj,
  getValueFromArrayOfObj,
} = require('../../frontend.js');
import {
  getSettings,
  saveSettings,
} from '../services/api';

import { 
  AlertMessage,
  Button,
  FormField,
  LoadingSpinner,
} from '../components';

// https://www.google.com/search?client=firefox-b-1-d&q=react+page+with+two+independent+form++onSubmit+&sei=U53haML6LsfYkPIP9ofv2AM
// This is how to pass back onInfosSubmit to the parent page
// const FormSettings = ({ onInfosSubmit }) => {
function FormSettings() {
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(true);
  const [submissionSettings, setSubmissionSettings] = useState(null); // 'idle', 'submitting', 'success', 'error'

  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  const [formErrors, setFormErrors] = useState({});
  const [settings, setSettings] = useState([]);


  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAllSettings();
  }, []);
  // }, [settings]);    // infinite loop if settings fails to update


  const fetchAllSettings = async () => {
    setLoading(true);

    const settingsData  = await fetchSettings();
    console.debug('fetchAllSettings: settingsData',settingsData)
    // setSettings({
      // ...settings,
      // ...settingsData,
    // });
    debugLog(`fetchAllSettings mergeArrayOfObj settingsData`,settingsData);
    debugLog(`fetchAllSettings mergeArrayOfObj settings`,settings);
    setSettings(mergeArrayOfObj(settingsData, settings, 'name'));

    // onInfosSubmit(infosData);  // that's what you send back to the parent page

    setLoading(false);

  };

  const fetchSettings = async () => {
    debugLog(`fetchSettings call getSettings`);

    try {
      const [settingsData] = await Promise.all([
        getSettings(),
      ]);
      debugLog('settingsData', settingsData);

      setErrorMessage(null);
      return settingsData;

    } catch (err) {
      errorLog(t('api.errors.fetchSettings'), err);
      setErrorMessage('api.errors.fetchSettings');
    }
  };



  const handleChangeSettings = (e) => {
    const { name, value } = e.target;
    // setSettings({
      // ...settings,
      // [name]: value,
    // });
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

  const validateFormSettings = () => {
    const errors = {};
    debugLog('ddebug validateFormSettings settings=',settings);

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

    debugLog('ddebug validateFormSettings()=',validateFormSettings());
    if (!validateFormSettings()) {
      return;
    }

    try {
      // await saveSettings(
        // settings.containerName,
        // settings.setupPath,
        // settings.dnsProvider,
      // );
      await saveSettings(
        settings,
      );
      setSubmissionSettings('success');
      setSuccessMessage('settings.settingsSaved');
      fetchSettings(); // Refresh the settings
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
  
  // onClick={fetchAllSettings()}
  
  return (
    <>
      <AlertMessage type="danger" message={errorMessage} />
      <AlertMessage type="success" message={successMessage} />
      
        <div className="float-end">
          <Button
            variant="info"
            size="sm"
            icon="recycle"
            title={t('common.refresh')}
            className="me-2"
            onClick={() => fetchAllSettings()}
          />
        </div>

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

export default FormSettings;

