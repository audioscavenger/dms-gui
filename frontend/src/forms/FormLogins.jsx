const debug = true;
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

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

// function FormLogins() {
const FormLogins = () => {
// const FormLogins = ({ onLoginsSubmit }) => {
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(true);
  const [submissionStatus, setSubmissionStatus] = useState(null); // 'idle', 'submitting', 'success', 'error'

  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  const [formErrors, setFormErrors] = useState({});
  const [logins, setLogins] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });


  useEffect(() => {
    fetchAllLogins();
  }, []);
  // }, [logins]);    // infinite loop if settings fails to update


  const fetchAllLogins = async () => {
    if (debug) console.debug(`ddebug: ------------- fetchAllLogins call fetchLogins`);
    setLoading(true);

    const loginsData    = await fetchLogins();

    // not setting all logins keys at once results in this error:
    // A component is changing an uncontrolled input to be controlled.
    setLogins(loginsData);
    setLogins['confirmPassword'] = loginsData.password;

    setLoading(false);

  };



  const fetchLogins = async () => {
    if (debug) console.debug(`ddebug: ------------- fetchLogins call getLogins`);

    try {
      // setLoading(true);
      const [loginsData] = await Promise.all([
        getLogins(),
      ]);
      if (debug) console.debug('ddebug: ------------- loginsData', loginsData);

      // setLogins(loginsData);

      // // not setting all logins keys at once results in this error:
      // // A component is changing an uncontrolled input to be controlled.
      // setLogins(loginsData);
      // setLogins['confirmPassword'] = loginsData.password;
      loginsData['confirmPassword'] = loginsData.password;

      setErrorMessage(null);
      return loginsData;

    } catch (err) {
      console.error(t('api.errors.fetchLogins'), err);
      setErrorMessage('api.errors.fetchLogins');
    // } finally {
      // setLoading(false);
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
    if (debug) console.debug('ddebug validateFormLogins logins=',logins);

    if (!logins.username.trim()) {
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
    if (debug) console.debug('Form logins Submitted:', logins);
    
    setSubmissionStatus('submitting');
    setErrorMessage(null);
    setSuccessMessage(null);

    if (debug) console.debug('ddebug validateFormLogins()=',validateFormLogins());
    if (!validateFormLogins()) {
      return;
    }

    try {
      await saveLogins(
        logins.username,
        logins.email,
        logins.password,
      );
      // await onLoginsSubmit(settings);
      setSubmissionStatus('success');
      setSuccessMessage('settings.loginsUpdated');
      fetchLogins(); // Refresh the logins
    } catch (err) {
      setSubmissionStatus('error');
      console.error(t('api.errors.saveLogins'), err);
      setErrorMessage('api.errors.saveLogins');
    }
  };

  if (isLoading && !logins) {
    return <LoadingSpinner />;
  } else {
    return (
      <>
        <AlertMessage type="danger" message={errorMessage} />
        <AlertMessage type="success" message={successMessage} />
        
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
            value={logins.password}
            onChange={handleChangeLogins}
            error={formErrors.password}
            required
          />

          <FormField
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            label="accounts.confirmPassword"
            value={logins.confirmPassword}
            onChange={handleChangeLogins}
            error={formErrors.confirmPassword}
            required
          />
          
          <Button type="submit" variant="primary" text="settings.saveButtonLogin" />
        </form>
      </>
    );
  }
}

export default FormLogins;
