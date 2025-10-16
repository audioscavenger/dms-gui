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
  getLogins,
  saveLogins,
} from '../services/api';

import { 
  AlertMessage,
  Button,
  FormField,
  LoadingSpinner,
} from '../components';

const usernameRegex = /^[^\s]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FormLogins = () => {
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(true);
  const [submissionStatus, setSubmissionStatus] = useState(null); // 'idle', 'submitting', 'success', 'error'

  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  const [formErrors, setFormErrors] = useState({});
  const [logins, setLogins] = useState({
    username: '',
    email: '',
  });


  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAllLogins();
  }, []);


  const fetchAllLogins = async () => {
    debugLog(`fetchAllLogins call fetchLogins`);
    setLoading(true);

    const loginsData    = await fetchLogins();
    setLogins({
      ...logins,
      ...loginsData,
    });

    setLoading(false);

  };



  const fetchLogins = async () => {
    debugLog(`fetchLogins call getLogins`);

    try {
      const [loginsData] = await Promise.all([
        getLogins(),
      ]);
      debugLog('loginsData', loginsData);

      if (loginsData.password) loginsData['confirmPassword'] = loginsData.password;

      setErrorMessage(null);
      return loginsData;

    } catch (err) {
      errorLog(t('api.errors.fetchLogins'), err);
      setErrorMessage('api.errors.fetchLogins');
    }
  };




  // Validate password change form -------------------------------------------------------
  // Handle input changes for password change form
  // const handleChangeLogins = (e) => {
    // setLogins({ ...logins, [e.target.name]: e.target.value });
  // };
  const handleChangeLogins = (e) => {
    const { name, value } = e.target;
    setLogins({
      ...logins,
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

  const validateFormLogins = () => {
    const errors = {};
    debugLog('ddebug validateFormLogins logins=',logins);

    if (!logins.username || !logins.username.trim()) {
      errors.username = 'settings.usernameRequired';
    } else if (!usernameRegex.test(logins.username)) {
      errors.username = 'settings.usernameInvalid';
    }

    if (logins.email && !emailRegex.test(logins.email)) {
      errors.email = 'accounts.invalidEmail';
    }

    if (!logins.password) {
      errors.password = 'accounts.passwordRequired';
    } else if (logins.password.length < 8) {
      errors.password = 'accounts.passwordLength';
    }

    if (logins.password !== logins.confirmPassword) {
      errors.confirmPassword = 'accounts.passwordsNotMatch';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit password change
  const handleSubmitLogins = async (e) => {
    e.preventDefault();
    debugLog('Form logins Submitted:', logins);
    
    setSubmissionStatus('submitting');
    setErrorMessage(null);
    setSuccessMessage(null);

    debugLog('ddebug validateFormLogins()=',validateFormLogins());
    if (!validateFormLogins()) {
      return;
    }

    try {
      await saveLogins(
        logins.username,
        logins.password,
        logins.email,
      );
      // await onLoginsSubmit(settings);
      setSubmissionStatus('success');
      setSuccessMessage('settings.loginsUpdated');
      await fetchAllLogins(); // Refresh the logins
      
    } catch (err) {
      setSubmissionStatus('error');
      errorLog(t('api.errors.saveLogins'), err);
      setErrorMessage('api.errors.saveLogins');
    }
  };

  if (isLoading && !logins && !Object.keys(logins).length) {
    return <LoadingSpinner />;
  }


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
            onClick={() => fetchAllLogins()}
          />
        </div>

        <form onSubmit={handleSubmitLogins} className="form-wrapper">
          <FormField
            type="text"
            id="username"
            name="username"
            label="settings.username"
            value={logins.username}
            onChange={handleChangeLogins}
            error={formErrors.username}
            placeholder="admin"
            helpText="settings.usernameHelp"
            required
          />

          <FormField
            type="text"
            id="email"
            name="email"
            label="settings.email"
            value={logins.email}
            onChange={handleChangeLogins}
            error={formErrors.email}
            placeholder="admin@domain.com"
            helpText="settings.emailHelp"
          />

          <FormField
            type="password"
            id="password"
            name="password"
            label="accounts.password"
            onChange={handleChangeLogins}
            error={formErrors.password}
            required
          />

          <FormField
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            label="accounts.confirmPassword"
            onChange={handleChangeLogins}
            error={formErrors.confirmPassword}
            required
          />
          
          <Button type="submit" variant="primary" text="settings.saveButtonLogin" />
        </form>
    </>
  );
}

export default FormLogins;
