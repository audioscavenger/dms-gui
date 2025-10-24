import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const {
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
  getValueFromArrayOfObj,
} = require('../../frontend.js');

import {
  getLogins,
  addLogin,
  deleteLogin,
  updateLogin,
} from '../services/api';

import {
  AlertMessage,
  Accordion,
  Button,
  Card,
  DataTable,
  FormField,
  LoadingSpinner,
  Translate,
} from '../components';

import { useRef } from 'react';
import Row from 'react-bootstrap/Row'; // Import Row
import Col from 'react-bootstrap/Col'; // Import Col
import Modal from 'react-bootstrap/Modal'; // Import Modal
import ProgressBar from 'react-bootstrap/ProgressBar'; // Import ProgressBar

const Logins = () => {
  const sortKeysInObject = ['percent'];
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const [logins, setLogins] = useState([]);

  // Common states -------------------------------------------------
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedLogin, setSelectedLogin] = useState(null);
  
  // State for new login inputs ----------------------------------
  const [newLoginformData, setNewLoginFormData] = useState({
    username: '',
    email: '',
    isAdmin: 0,
    password: '',
    confirmPassword: '',
  });
  const [newLoginFormErrors, setNewLoginFormErrors] = useState({});
  const [loginEmailFormErrors, setLoginEmailFormErrors] = useState(null);

  // State for password change modal -------------------------------
  const passwordFormRef = useRef(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordFormErrors, setPasswordFormErrors] = useState({});


  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAllLogins();
  }, []);

  const fetchAllLogins = async () => {
    
    try {
      setLoading(true);
      const [loginsData] = await Promise.all([
        getLogins(),
      ]);
      
    // add color column for admins
      let loginsDataFormatted = loginsData.map(login => { return { 
      ...login, 
      color:    (login.isAdmin) ? "text-danger" : "",
      }; });
      
    // add muted color for inactives
      loginsDataFormatted = loginsDataFormatted.map(login => { return { 
      ...login, 
      color:  (login.isActive) ? login.color : login.color+" opacity-25",
      }; });
      setLogins(loginsDataFormatted);
      setErrorMessage(null);
      
      debugLog('loginsDataFormatted', loginsDataFormatted);
      
    } catch (err) {
      errorLog(t('api.errors.fetchAllLogins'), err);
      setErrorMessage('api.errors.fetchAllLogins');
      
    } finally {
      setLoading(false);
    }
  };

  const handleNewLoginInputChange = (e) => {
    const { name, value } = e.target;
    setNewLoginFormData({
      ...newLoginformData,
      [name]: value,
    });

    // Clear the error for this field while typing
    if (newLoginFormErrors[name]) {
      setNewLoginFormErrors({
        ...newLoginFormErrors,
        [name]: null,
      });
    }
  };

  const validateNewLoginForm = () => {
    const errors = {};

    if (!newLoginformData.username.trim()) {
      errors.username = 'logins.usernameRequired';
    } else if (!regexUsername.test(newLoginformData.username)) {
      errors.username = 'logins.usernameInvalid';
    }

    // this is done by react
    // if (!newLoginformData.email.trim()) {
      // errors.email = 'logins.emailRequired';
    // } else if (!regexEmailStrict.test(newLoginformData.email)) {
      // errors.email = 'logins.invalidEmail';
    // }

    if (!newLoginformData.password) {
      errors.password = 'password.passwordRequired';
    } else if (newLoginformData.password.length < 8) {
      errors.password = 'password.passwordLength';
    }

    if (newLoginformData.password !== newLoginformData.confirmPassword) {
      errors.confirmPassword = 'logins.passwordsNotMatch';
    }

    setNewLoginFormErrors(errors);
    return Object.keys(errors).length === 0;
  };


  const handleSubmitNewLogin = async (e) => {
    e.preventDefault();
    setSuccessMessage(null);

    if (!validateNewLoginForm()) {
      return;
    }

    try {
      await addLogin(
        newLoginformData.username,
        newLoginformData.password,
        newLoginformData.email,
        newLoginformData.isAdmin,
      );
      setSuccessMessage('logins.loginCreated');
      setNewLoginFormData({
        username: '',
        email: '',
        isAdmin: 0,
        password: '',
        confirmPassword: '',
      });
      fetchAllLogins(); // Refresh the logins list
      
    } catch (err) {
      errorLog(t('api.errors.addLogin'), err);
      (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.addLogin');
    }
  };

  const handleLoginDelete = async (login) => {
    if (window.confirm(t('logins.confirmDelete', { username:login.username }))) {
      try {
        await deleteLogin(login.username);
        setSuccessMessage('logins.loginDeleted');
        fetchAllLogins(); // Refresh the logins list
      } catch (err) {
        errorLog(t('api.errors.deleteLogin'), err);
        (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.deleteLogin');
      }
    }
  };


  const handleLoginFlipAdmin = async (login) => {
    try {
      await updateLogin(
        login.username,
        { isAdmin: +!login.isAdmin }
      );
      setSuccessMessage(t('logins.updated', {username:login.username}));
      fetchAllLogins(); // Refresh the logins list
    } catch (err) {
      errorLog(t('api.errors.updateLogin'), err);
      (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.updateLogin');
    }
  };

  const handleLoginFlipActive = async (login) => {
    try {
      await updateLogin(
        login.username,
        { isActive: +!login.isActive }
      );
      setSuccessMessage(t('logins.updated', {username:login.username}));
      fetchAllLogins(); // Refresh the logins list
    } catch (err) {
      errorLog(t('api.errors.updateLogin'), err);
      (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.updateLogin');
    }
  };

  const handleLoginChange = (e) => {
    // const { name, value } = e.target;
    // debugLog('name, value', name, value);
    
    debugLog('e', e);
  };


  // Open password change modal for a login
  const handleChangePassword = (login) => {
    setSelectedLogin(login);
    setPasswordFormData({
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordFormErrors({});
    setShowPasswordModal(true);
  };

  // Close password change modal
  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setSelectedLogin(null);
  };

  // Handle input changes for password change form
  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordFormData({
      ...passwordFormData,
      [name]: value,
    });

    // Clear the error for this field while typing
    if (passwordFormErrors[name]) {
      setPasswordFormErrors({
        ...passwordFormErrors,
        [name]: null,
      });
    }
  };

  // Validate password change form
  const validatePasswordForm = () => {
    const errors = {};

    if (!passwordFormData.newPassword) {
      errors.newPassword = 'password.passwordRequired';
    } else if (passwordFormData.newPassword.length < 8) {
      errors.newPassword = 'password.passwordLength';
    }

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      errors.confirmPassword = 'logins.passwordsNotMatch';
    }

    setPasswordFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit password change
  const handleSubmitPasswordChange = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validatePasswordForm()) {
      return;
    }

    try {
      await updateLogin(
        selectedLogin.username,
        { password: passwordFormData.newPassword }
      );
      setSuccessMessage('password.passwordUpdated');
      handleClosePasswordModal(); // Close the modal
    } catch (err) {
      errorLog(t('api.errors.changePassword'), err);
      setErrorMessage('api.errors.changePassword');
    }
  };


  if (isLoading && !logins) {
    return <LoadingSpinner />;
  }
  
  // Column definitions for existing logins table
  const columns = [
    { 
      key: 'username',
      label: 'logins.username',
    },
    { 
      key: 'email',
      label: 'logins.email',
      render: (login) => (
        <FormField
          type="email"
          id="email"
          name="email"
          value={login.email}
          onChange={handleLoginChange}
          groupClass=""
          className="form-control-sm"
        />
      ),
    },
    { 
      key: 'isAdmin',
      label: 'logins.isAdmin',
      render: (login) => (
        <>
          {(login.isAdmin) ? "admin" : "user"}
          <Button
            variant="info"
            size="sm"
            icon={(login.isAdmin) ? "chevron-double-down" : "chevron-double-up"}
            title={(login.isAdmin) ? t('logins.demote', { username: login.username}) : t('logins.promote', { username: login.username})}
            onClick={() => handleLoginFlipAdmin(login)}
            className="me-2 float-end"
          />
        </>
      ),
    },
    {
      key: 'actions',
      label: 'common.actions',
      render: (login) => (
        <div className="d-flex">
          <Button
            variant="primary"
            size="sm"
            icon="key"
            title={t('password.changePassword')}
            onClick={() => handleChangePassword(login)}
            className="me-2"
          />
          <Button
            variant="danger"
            size="sm"
            icon="trash"
            title={t('logins.confirmDelete', { username: login.username })}
            onClick={() => handleLoginDelete(login)}
            className="me-2"
          />
          <Button
            variant="secondary"
            size="sm"
            icon={(login.isActive) ? "toggle-on" : "toggle-off"}
            title={(login.isActive) ? t('logins.deactivate', { username: login.username }) : t('logins.activate', { username: login.username })}
            onClick={() => handleLoginFlipActive(login)}
            className="me-2"
          />
        </div>
      ),
    },
  ];


  const FormNewLogin = (
    <form onSubmit={handleSubmitNewLogin} className="form-wrapper">
      <FormField
        type="text"
        id="username"
        name="username"
        label="logins.username"
        value={newLoginformData.username}
        onChange={handleNewLoginInputChange}
        placeholder="admin"
        error={newLoginFormErrors.username}
        helpText="logins.usernameHelp"
        required
      />

      <FormField
        type="email"
        id="email"
        name="email"
        label="logins.email"
        value={newLoginformData.email}
        onChange={handleNewLoginInputChange}
        placeholder="user@domain.com"
        error={newLoginFormErrors.email}
        helpText="logins.emailHelp"
        required
      />

      <FormField
        type="password"
        id="password"
        name="password"
        label="password.password"
        value={newLoginformData.password}
        onChange={handleNewLoginInputChange}
        error={newLoginFormErrors.password}
        required
      />

      <FormField
        type="password"
        id="confirmPassword"
        name="confirmPassword"
        label="password.confirmPassword"
        value={newLoginformData.confirmPassword}
        onChange={handleNewLoginInputChange}
        error={newLoginFormErrors.confirmPassword}
        required
      />

      <Button
        type="submit"
        variant="primary"
        text="logins.addLogin"
      />
    </form>
  );
  
  const DataTableLogins = (
          <DataTable
          columns={columns}
          data={logins}
          keyExtractor={(login) => login.username}
          isLoading={isLoading}
          emptyMessage="logins.noLogins"
          sortKeysInObject={sortKeysInObject}
          />
  );
  
  // https://icons.getbootstrap.com/
  const loginTabs = [
  { id: 1, title: "logins.existingLogins",  titleExtra: `(${logins.length})`, icon: "person-lines-fill", onClickRefresh: () => fetchAllLogins(), content: DataTableLogins },
  { id: 2, title: "logins.newLogin",        icon: "person-fill-add", content: FormNewLogin },
  ];

  // BUG: passing defaultActiveKey to Accordion as string does not activate said key, while setting it up as "1" in Accordion also does not
  // icons: https://icons.getbootstrap.com/
  return (
    <div>
      <h2 className="mb-4">{Translate('logins.title')}</h2>
      
      <AlertMessage type="danger" message={errorMessage} />
      <AlertMessage type="success" message={successMessage} />
      
      <Accordion tabs={loginTabs}>
      </Accordion>

      {/* Password Change Modal using react-bootstrap */}
      <Modal show={showPasswordModal} onHide={handleClosePasswordModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {Translate('password.changePassword')} - {selectedLogin?.username}{' '}
            {/* Use optional chaining */}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLogin && ( // Ensure selectedLogin exists before rendering form
            <form onSubmit={handleSubmitPasswordChange} ref={passwordFormRef}>
              <FormField
                type="password"
                id="newPassword"
                name="newPassword"
                label="password.newPassword"
                value={passwordFormData.newPassword}
                onChange={handlePasswordInputChange}
                error={passwordFormErrors.newPassword}
                required
              />

              <FormField
                type="password"
                id="confirmPasswordModal"
                name="confirmPassword"
                label="password.confirmPassword"
                value={passwordFormData.confirmPassword}
                onChange={handlePasswordInputChange}
                error={passwordFormErrors.confirmPassword}
                required
              />
            </form>
          )}
        </Modal.Body>
        <Modal.Footer>
          {/* Use refactored Button component */}
          <Button
            variant="secondary"
            onClick={handleClosePasswordModal}
            text="common.cancel"
          />
          <Button
            variant="primary"
            onClick={handleSubmitPasswordChange}
            text="password.changePassword"
          />
        </Modal.Footer>
      </Modal>

    </div>
  );
};

export default Logins;
