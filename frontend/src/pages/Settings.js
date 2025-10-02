const debug = false;
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
  Card, 
  FormField 
} from '../components';

const Settings = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState({
    status: 'loading',
    version: '1.0.0',
    resources: { cpu: '0%', memory: '0MB', disk: '0%' },
  });
          // const [setupPath, setSetupPath] = useState('/usr/local/bin/setup');
          // const [containerName, setContainerName] = useState('mailserver');
          
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // presetting formData with anything else then blanks results in this error:
  // A component is changing an uncontrolled input to be controlled.
  const [formData, setFormData] = useState({
    containerName: '',
    setupPath: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    if (debug) console.debug(`ddebug: ------------- fetchSettings call getSettings and getServerStatus()`);

    try {
      setLoading(true);
      const [settingsData, statusResponse] = await Promise.all([
        getSettings(),
        getServerStatus(),
      ]);
      if (debug) console.debug('ddebug: ------------- settingsData', settingsData);
      if (debug) console.debug('ddebug: ------------- statusResponse', statusResponse);

      // not setting all formData keys at once results in this error:
      // A component is changing an uncontrolled input to be controlled.
      settingsData['confirmPassword'] = settingsData.password;
      setFormData(settingsData);
      setStatus(statusResponse);
      setError(null);


    } catch (err) {
      console.error(t('api.errors.fetchSettings'), err);
      setError('api.errors.fetchSettings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
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


  const validateForm = () => {
    const errors = {};
    const usernameRegex = /^[^\s]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.username.trim()) {
      errors.username = 'settings.usernameRequired';
    } else if (!usernameRegex.test(formData.username)) {
      errors.username = 'settings.invalidUsername';
    }

    if (!emailRegex.test(formData.email)) {
      errors.email = 'accounts.invalidEmail';
    }

    if (!formData.password) {
      errors.password = 'accounts.passwordRequired';
    } else if (formData.password.length < 8) {
      errors.password = 'accounts.passwordLength';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'accounts.passwordsNotMatch';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    try {
      await saveSettings(
        formData.containerName,
        formData.setupPath,
        formData.username,
        formData.email,
        formData.password,
      );
      setSuccessMessage('settings.settingsSaved');
      // setFormData({
        // containerName: '',
        // setupPath: '',
        // username: '',
        // email: '',
        // password: '',
        // confirmPassword: '',
      // });
      fetchSettings(); // Refresh the settings
    } catch (err) {
      console.error(t('api.errors.saveSettings'), err);
      setError('api.errors.saveSettings');
    }
  };

  if (loading && !status) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <h2 className="mb-4">{t('settings.title')}</h2>

      <AlertMessage type="danger" message={error} />
      <AlertMessage type="success" message={successMessage} />

      <Card title="settings.configTitle" className="mb-4">
        <form onSubmit={handleSubmit} className="form-wrapper">
          <FormField
            type="text"
            id="containerName"
            name="containerName"
            label="settings.containerName"
            value={formData.containerName}
            onChange={handleInputChange}
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
            value={formData.setupPath}
            onChange={handleInputChange}
            placeholder="/usr/local/bin/setup"
            error={formErrors.setupPath}
            helpText="settings.setupPathHelp"
            required
          />

          <FormField
            type="text"
            id="username"
            name="username"
            label="settings.username"
            value={formData.username}
            onChange={handleInputChange}
            placeholder={formData.username}
            error={formErrors.username}
            helpText="settings.usernameHelp"
            required
          />

          <FormField
            type="text"
            id="email"
            name="email"
            label="settings.email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="admin@domain.com"
            error={formErrors.email}
            helpText="settings.emailHelp"
          />

          <FormField
            type="password"
            id="password"
            name="password"
            label="accounts.password"
            value={formData.password}
            onChange={handleInputChange}
            error={formErrors.password}
            required
          />

          <FormField
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            label="accounts.confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            error={formErrors.confirmPassword}
            required
          />
          
          <Button type="submit" variant="primary" text="settings.saveButton" />
        </form>
      </Card>

      <Card title="settings.aboutTitle">
        <Card.Text>
          {' '}
          {/* Use Card.Text */}
          {t('settings.aboutDescription')}
        </Card.Text>
        <Card.Text>
          {' '}
          {/* Use Card.Text */}
          <strong>{t('settings.version')}:</strong> {status.version}
        </Card.Text>
        <Card.Text>
          {' '}
          {/* Use Card.Text */}
          <a
            href="https://github.com/audioscavenger/dms-gui"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="outline-primary"
              icon="github"
              text="settings.githubLink"
            />
          </a>
        </Card.Text>{' '}
        {/* Correct closing tag */}
      </Card>
    </div>
  );
};

export default Settings;
