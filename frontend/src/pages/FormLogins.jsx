



















                                                                                              // deprecated
















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
  addLogin,
} from '../services/api';

import { 
  AlertMessage,
  Button,
  FormField,
  LoadingSpinner,
} from '../components';

const FormLogins = () => {
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(true);
  const [submissionStatus, setSubmissionStatus] = useState(null); // 'idle', 'submitting', 'success', 'error'

  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // State for new login inputs ----------------------------------
  const [newLoginformData, setNewLoginFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [newLoginFormErrors, setNewLoginFormErrors] = useState({});


  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAllLogins();
  }, []);


  const fetchAllLogins = async () => {
    debugLog(`fetchAllLogins call fetchLogins`);
    setLoading(true);

    // const loginsData = await fetchLogins();
    await fetchLogins();

    setLoading(false);

  };



  const fetchLogins = async () => {
    debugLog(`fetchLogins call getLogins`);

    try {
      const [loginsData] = await Promise.all([
        getLogins(),
      ]);

      // let loginData = (loginsData.length) ? loginsData[0] : {};
      // setLogin({
        // ...login,
        // ...loginsData,
      // });
      // if (loginsData.password) loginsData['confirmPassword'] = loginsData.password;    // we can't pull passwords anymore
      debugLog(`fetchAllLogins mergeArrayOfObj loginsData`,loginsData);
      setLogins(loginsData);


      setErrorMessage(null);
      // return loginData;
      return loginsData;

    } catch (err) {
      errorLog(t('api.errors.fetchLogins'), err);
      setErrorMessage('api.errors.fetchLogins');
    }
  };




  // Validate password change form -------------------------------------------------------
  // Handle input changes for password change form
  // const handleChangeLogins = (e) => {
    // setLogin({ ...login, [e.target.name]: e.target.value });
  // };
  const handleChangeLogins = (e) => {
    const { name, value } = e.target;
    // setLogin({
      // ...login,
      // [name]: value,
    // });
    // merge array of settings objects by their name
    debugLog(`handleChangeLogins mergeArrayOfObj logins`,logins);
    debugLog(`handleChangeLogins mergeArrayOfObj [{name: name, value:value}]`, [{name: name, value:value}]);
    // setLogins(mergeArrayOfObj(logins, [{name: name, value:value}], 'name'));
    setLogin(mergeArrayOfObj(logins, [{name: name, value:value}], 'name'));

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

    if (!login.username.trim()) {
      errors.username = 'settings.usernameRequired';
    } else if (!usernameRegex.test(login.username)) {
      errors.username = 'settings.usernameInvalid';
    }

    // if (!regexEmailStrict.test(login.email)) {
      // errors.email = 'accounts.invalidEmail';
    // }

    if (!login.password) {
      errors.password = 'accounts.passwordRequired';
    } else if (login.password.length < 8) {
      errors.password = 'accounts.passwordLength';
    }

    if (login.password !== login.confirmPassword) {
      errors.confirmPassword = 'accounts.passwordsNotMatch';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit password change
  const handleSubmitLogins = async (e) => {
    e.preventDefault();
    debugLog('Form login Submitted:', login);
    
    setSubmissionStatus('submitting');
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validateFormLogins()) {
      return;
    }

    try {
      await addLogin(
        login.username,
        login.password,
        login.email,
      );
      // await onLoginsSubmit(settings);
      setSubmissionStatus('success');
      setSuccessMessage('settings.loginsUpdated');
      await fetchAllLogins(); // Refresh the login
      
    } catch (err) {
      setSubmissionStatus('error');
      errorLog(t('api.errors.addLogin'), err);
      setErrorMessage('api.errors.addLogin');
    }
  };

  if (isLoading && !login && !Object.keys(login).length) {
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
            title="common.refresh"
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
            value={login.username}
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
            value={login.email}
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
