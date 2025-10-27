import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// https://mui.com/material-ui/react-autocomplete/#multiple-values
import Chip from '@mui/material/Chip';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';

const {
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
  getValueFromArrayOfObj,
  pluck,
} = require('../../frontend');

import {
  getLogins,
  addLogin,
  deleteLogin,
  updateLogin,
  getAccounts,
  getRoles,
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
  const sortKeysInObject = ['email'];
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const [logins, setLogins] = useState([]);

  // Roles states -------------------------------------------------- // https://mui.com/material-ui/react-autocomplete/#multiple-values
  const [rolesAvailable, setRolesAvailable] = useState([]);
  
  // Common states -------------------------------------------------
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedLogin, setSelectedLogin] = useState(null);
  
  // State for new login inputs ----------------------------------
  const [newLoginformData, setNewLoginFormData] = useState({
    username: '',
    email: '',
    isAdmin: 0,
    roles: [],
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
    fetchLogins();
  }, []);

  const fetchLogins = async () => {
    
    try {
      setLoading(true);
      const [loginsData, accountsData] = await Promise.all([
        getLogins(),
        getAccounts(),
        // getRoles(),
      ]);
      
    // add color column for admins
      let loginsDataAltered = loginsData.map(login => { return { 
      ...login, 
      color:    (login.isAdmin) ? "text-danger" : "",
      }; });
      
    // add muted color for inactives
      loginsDataAltered = loginsDataAltered.map(login => { return { 
      ...login, 
      color:  (login.isActive) ? login?.color : login?.color+" td-opacity-25",
      }; });
      
    // has anything changed?
      loginsDataAltered = loginsDataAltered.map(login => { return { 
      ...login, 
      hasChanged:  false,
      }; });
      
      debugLog('loginsDataAltered', loginsDataAltered);
      
      setLogins(loginsDataAltered);
      let mailboxes = (pluck(accountsData, 'mailbox', true, false));   // we keep only an array of uniq mailbox names [box1@domain.com, ..], already sorted by domain
      setRolesAvailable(mailboxes);
      setErrorMessage(null);
      
      
    } catch (err) {
      errorLog(t('api.errors.fetchLogins'), err);
      setErrorMessage('api.errors.fetchLogins');
      
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
        newLoginformData.isActive,
        [],
      );
      setSuccessMessage('logins.loginCreated');
      setNewLoginFormData({
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        isAdmin: 0,
        isActive: 1,
        roles: [],
      });
      fetchLogins(); // Refresh the logins list
      
    } catch (err) {
      errorLog(t('api.errors.addLogin'), err);
      (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.addLogin');
    }
  };



  const handleLoginChange = (login, key, newValue) => {

    // console.debug('ddebug event', event);       // { username: "admin2", email: "", isAdmin: 0, isActive: 1, color: "" }
    // console.debug('ddebug login', login);       // { username: "admin2", email: "", isAdmin: 0, isActive: 1, color: "" }
    // console.debug('ddebug newValue', newValue); // [ "box1@domain.com", .. ] or "new.email@domain.com"
    
    setLogins(prevLogins =>
      prevLogins.map(item =>
        item.username === login.username                    // for that login...
          ? { ...item, [key]: newValue, hasChanged:true }   // update its roles and mark as changed
          : item                                            // and keep other items as they are
      )
    );
    
  };


  const handleLoginDelete = async (login) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (window.confirm(t('logins.confirmDelete', { username:login.username }))) {
      try {
        await deleteLogin(login.username);
        setSuccessMessage('logins.loginDeleted');
        fetchLogins(); // Refresh the logins list
      } catch (err) {
        errorLog(t('api.errors.deleteLogin'), err);
        (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.deleteLogin');
      }
    }
  };


  const handleLoginFlipAdmin = async (login) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await updateLogin(
        login.username,
        { isAdmin: +!login.isAdmin }
      );
      setSuccessMessage(t('logins.updated', {username:login.username}));
      fetchLogins(); // Refresh the logins list
    } catch (err) {
      errorLog(t('api.errors.updateLogin'), err);
      (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.updateLogin');
    }
  };

  const handleLoginFlipActive = async (login) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await updateLogin(
        login.username,
        { isActive: +!login.isActive }
      );
      setSuccessMessage(t('logins.updated', {username:login.username}));
      fetchLogins(); // Refresh the logins list
    } catch (err) {
      errorLog(t('api.errors.updateLogin'), err);
      (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.updateLogin');
    }
  };

  const handleLoginSave = async (login) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      
      await updateLogin(
        login.username,
        { email: login.email, roles:login.roles }
      );
      
      // reset changes detector. We could instead fetchLogins but that would also reset the filters and sorting and lead to bad UI experience
      setLogins(prevLogins =>
        prevLogins.map(item =>
          item.username === login.username  // for that login...
            ? { ...item, hasChanged:false } // reset hasChanged
            : item                          // and keep other items as they are
        )
      );
      setSuccessMessage(t('logins.saved', {username:login.username}));
      
    } catch (err) {
      errorLog(t('api.errors.updateLogin'), err);
      (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.updateLogin');
    }
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

            // getOptionLabel={rolesAvailable}    // requires a dict
                // placeholder={t('logins.roles2pick')}

  // Column definitions for existing logins table
  // adding hidden data in the span before the FormField let us sort also this column
  const columns = [
    { 
      key: 'username',
      label: 'logins.username',
    },
    { 
      key: 'email',
      label: 'logins.email',
      render: (login) => (
        <span><span className="d-none">{login.email}</span>
        <FormField
          type="email"
          id="email"
          name="email"
          value={login.email}
          onChange={(event) => handleLoginChange(login, "email", event.target.value)}
          groupClass=""
          className="form-control-sm"
        />
        </span>
      ),
    },
    { 
      key: 'isAdmin',
      label: 'logins.isAdmin',
      noFilter: true,
      render: (login) => (
          <>
          <span>{(login.isAdmin) ? "admin" : "user"}</span>
          <Button
            variant={(login.isAdmin) ? "info" : "warning"}
            size="xs"
            icon={(login.isAdmin) ? "chevron-double-down" : "chevron-double-up"}
            title={(login.isAdmin) ? t('logins.demote', { username: login.username}) : t('logins.promote', { username: login.username})}
            onClick={() => handleLoginFlipAdmin(login)}
            className="me-2 float-end"
          />
          </>
      ),
    },
    { 
      key: 'roles',
      label: 'logins.roles',
      render: (login) => (
        <>
          <Autocomplete
            multiple
            id="roles"
            size="small"
            options={rolesAvailable}
            groupBy={(mailbox) => mailbox.split('@')[1]}    // groupBy with an array of strings: so easy! create the group off the valuesdirectly!
            filterSelectedOptions
            
            value={login.roles}
            onChange={(event, newValue) => handleLoginChange(login, "roles", newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('logins.roles')}
              />
            )}
          />
        </>
      ),
    },
    {
      key: 'actions',
      label: 'common.actions',
      noSort: true,
      noFilter: true,
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
          {login.hasChanged &&
          <Button
            variant="primary"
            size="sm"
            icon="floppy2-fill"
            title={t('logins.save')}
            onClick={() => handleLoginSave(login)}
            className="me-2"
          />
          }
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
  { id: 1, title: "logins.existingLogins",  titleExtra: `(${logins.length})`, icon: "person-lines-fill", onClickRefresh: () => fetchLogins(), content: DataTableLogins },
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
