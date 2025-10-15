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
  const [settings, setSettings] = useState({});


  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAllSettings();
  }, []);
  // }, [settings]);    // infinite loop if settings fails to update


  const fetchAllSettings = async () => {
    if (debug) console.debug(`ddebug: ------------- fetchAllSettings call fetchSettings fetchLogins`);
    setLoading(true);

    const settingsData  = await fetchSettings();

    setSettings(settingsData);
    // onInfosSubmit(infosData);  // that's what you send back to the parent page

    setLoading(false);

  };

  const fetchSettings = async () => {
    if (debug) console.debug(`ddebug: ------------- fetchSettings call getSettings`);

    try {
      // setLoading(true);
      const [settingsData] = await Promise.all([
        getSettings(),
      ]);
      // if (debug) console.debug('ddebug: ------------- settingsData', settingsData);

      // setSettings(settingsData);

      setErrorMessage(null);
      return settingsData;

    } catch (err) {
      console.error(t('api.errors.fetchSettings'), err);
      setErrorMessage('api.errors.fetchSettings');
    // } finally {
      // setLoading(false);
    }
  };




  // const handleChangeSettings = (e) => {
    // setSettings({ ...settings, [e.target.name]: e.target.value });
  // };
  const handleChangeSettings = (e) => {
    const { name, value } = e.target;
    setSettings({
      ...settings,
      [name]: value,
    });

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
    // if (debug) console.debug('ddebug validateFormSettings settings=',settings);

    if (settings.containerName.length == 0) {
      errors.containerName = 'settings.containerNameRequired';
    }

    // TODO: setupPath: maybe add an api call to execInContainer/execCommand to test if exist?

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitSettings = async (e) => {
    e.preventDefault();
    if (debug) console.debug('Form settings Submitted:', settings);
    
    setSubmissionSettings('submitting');
    setErrorMessage(null);
    setSuccessMessage(null);

    // if (debug) console.debug('ddebug validateFormSettings()=',validateFormSettings());
    if (!validateFormSettings()) {
      return;
    }

    try {
      await saveSettings(
        settings.containerName,
        settings.setupPath,
        settings.dnsProvider,
      );
      setSubmissionSettings('success');
      setSuccessMessage('settings.settingsSaved');
      fetchSettings(); // Refresh the settings
    } catch (err) {
      setSubmissionSettings('error');
      console.error(t('api.errors.saveSettings'), err);
      setErrorMessage('api.errors.saveSettings');
    }
  };


  if (isLoading && !settings && !Object.keys(settings).length) {
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
            value={settings.containerName}
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
            value={settings.setupPath}
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
            value={settings.dnsProvider}
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

