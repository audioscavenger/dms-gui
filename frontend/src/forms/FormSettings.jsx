const debug = true;
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getServerStatus,
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
// function FormSettings() {
const FormSettings = ({ onStatusSubmit }) => {
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(true);
  const [submissionStatus, setSubmissionStatus] = useState(null); // 'idle', 'submitting', 'success', 'error'

  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  const [formErrors, setFormErrors] = useState({});
  const [settings, setSettings] = useState({
    containerName: '',
    setupPath: '',
  });

  const [status, setServerStatus] = useState({
    status: {
      status: 'loading',
      Error: '',
      StartedAt: '',
      FinishedAt: '',
      Health: '',
    },
    name: 'dms-gui',
    version: '1.0.0',
    resources: { cpu: '0%', memory: '0MB', disk: '0%' },
    internals: [],
    env: {},
  });


  useEffect(() => {
    fetchAllSettings();
  }, []);
  // }, [settings]);    // infinite loop if settings fails to update


  const fetchAllSettings = async () => {
    if (debug) console.debug(`ddebug: ------------- fetchAllSettings call fetchSettings fetchLogins`);
    setLoading(true);

    const statusData    = await fetchServerStatus();
    const settingsData  = await fetchSettings();

    setSettings(settingsData);
    setServerStatus(statusData);
    onStatusSubmit(statusData);

    setLoading(false);

  };

  const fetchServerStatus = async () => {
    if (debug) console.debug(`ddebug: ------------- fetchServerStatus call getSettings getServerStatus(false)`);

    try {
      // setLoading(true);
      const [statusData] = await Promise.all([
        getServerStatus(false),
      ]);
      if (debug) console.debug('ddebug: ------------- statusData', statusData);

      // setSettings(settingsData);
      // setServerStatus(statusData);

      setErrorMessage(null);
      return statusData;

    } catch (err) {
      console.error(t('api.errors.fetchServerStatus'), err);
      setErrorMessage('api.errors.fetchServerStatus');
    // } finally {
      // setLoading(false);
    }
  };

  const fetchSettings = async () => {
    if (debug) console.debug(`ddebug: ------------- fetchSettings call getSettings getServerStatus`);

    try {
      // setLoading(true);
      const [settingsData] = await Promise.all([
        getSettings(),
      ]);
      if (debug) console.debug('ddebug: ------------- settingsData', settingsData);

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
    if (debug) console.debug('ddebug validateFormSettings settings=',settings);

    if (settings.containerName.length == 0) {
      errors.containerName = 'settings.containerNameRequired';
    }

    // setupPath: maybe add an api call to execInContainer/execCommand to test if exist?

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitSettings = async (e) => {
    e.preventDefault();
    if (debug) console.debug('Form settings Submitted:', settings);
    
    setSubmissionStatus('submitting');
    setErrorMessage(null);
    setSuccessMessage(null);

    if (debug) console.debug('ddebug validateFormSettings()=',validateFormSettings());
    if (!validateFormSettings()) {
      return;
    }

    try {
      await saveSettings(
        settings.containerName,
        settings.setupPath,
      );
      setSubmissionStatus('success');
      setSuccessMessage('settings.settingsSaved');
      fetchSettings(); // Refresh the settings
    } catch (err) {
      setSubmissionStatus('error');
      console.error(t('api.errors.saveSettings'), err);
      setErrorMessage('api.errors.saveSettings');
    }
  };


  if (isLoading && !status) {
    return <LoadingSpinner />;
  }
  
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
      
        <Button type="submit" variant="primary" text="settings.saveButtonSettings" />
      </form>
    </>
  );

}

export default FormSettings;


/*
// https://www.google.com/search?client=firefox-b-1-d&q=react+page+with+two+independent+form++onSubmit+&sei=U53haML6LsfYkPIP9ofv2AM
// FormOne.jsx
import React, { useState } from 'react';

function FormOne() {
  const [settings, setSettings] = useState({ field1: '', field2: '' });

  const handleChangeSettings = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSubmitSettings = (e) => {
    e.preventDefault(); // Prevent default browser form submission
    console.log('Form One Submitted:', settings);
    // Add your submission logic for Form One here (e.g., API call)
  };

  return (
    <form onSubmit={handleSubmitSettings}>
      <h2>Form One</h2>
      <label>
        Field 1:
        <input type="text" name="field1" value={settings.field1} onChange={handleChangeSettings} />
      </label>
      <br />
      <label>
        Field 2:
        <input type="text" name="field2" value={settings.field2} onChange={handleChangeSettings} />
      </label>
      <br />
      <button type="submit">Submit Form One</button>
    </form>
  );
}

export default FormOne;
*/