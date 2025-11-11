import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal'; // Import Modal
import { useAuth } from '../hooks/useAuth';
import { useLocalStorage } from '../hooks/useLocalStorage';

// https://mui.com/material-ui/react-autocomplete/#multiple-values
// import Chip from '@mui/material/Chip';
// import Autocomplete from '@mui/material/Autocomplete';
// import TextField from '@mui/material/TextField';
// import Stack from '@mui/material/Stack';

import {
  debugLog,
  errorLog,
} from '../../frontend.mjs';
import {
  regexUsername,
  moveKeyToLast,
} from '../../../common.mjs';

import {
  getLogins,
  updateLogin,
} from '../services/api.mjs';

import {
  AlertMessage,
  Button,
  FormField,
  LoadingSpinner,
  Translate,
} from '../components/index.jsx';


const Profile = () => {
  // const sortKeysInObject = ['email', 'username'];   // not needed as they are not objects, just rendered FormControl
  const { t } = useTranslation();
  const { user } = useAuth();
  const { logout } = useAuth();

  // Common states -------------------------------------------------
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedLogin, setSelectedLogin] = useState(null);
  
  // State for new login inputs ----------------------------------
  const [loginFormData, setloginFormData] = useState({
    email: '',
    username: '',
    isAdmin: 0,
    isAccount: 0,
    isActive: 1,
    roles: [],
  });
  const [loginFormErrors, setloginFormErrors] = useState({});

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
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    
    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      // setloginFormData({
        // ...loginFormData,
        // ...user
      // });

      const userData = await getLogins([user.email, user.username]);  // user.email was maybe altered in Logins page, let's pull with both options
      debugLog('userData', userData);
      if (userData.success) {
        if (!userData.message.length) logout();                       // user not found, localStorage was altered or corrupt, logout!
        
        debugLog('ddebug user', user);
        debugLog('ddebug userData', userData.message);
        
        // update profile form with fresh data, we use the first entry in userData as there will be 2 identical ones
        setloginFormData({
          ...loginFormData,
          ...userData.message[0]
        });

      } else setErrorMessage(userData.message);

      
    } catch (error) {
      errorLog(t('api.errors.fetchProfile'), error);
      setErrorMessage('api.errors.fetchProfile');
      
    } finally {
      setLoading(false);
    }
  };

  const handleLoginInputChange = (e) => {
    debugLog(loginFormData);
    const { name, value } = e.target;
    
    setloginFormData({
      ...loginFormData,
      [name]: value
    });

    // Clear the error for this field while typing
    if (loginFormErrors[name]) {
      setloginFormErrors({
        ...loginFormErrors,
        [name]: null,
      });
    }
  };


  const validateloginForm = () => {
    const errors = {};

    if (!loginFormData.username.trim()) {
      errors.username = 'logins.usernameRequired';
    } else if (!regexUsername.test(loginFormData.username)) {
      errors.username = 'logins.usernameInvalid';
    }

    // this is done by react
    // if (!loginFormData.email.trim()) {
      // errors.email = 'logins.emailRequired';
    // } else if (!regexEmailStrict.test(loginFormData.email)) {
      // errors.email = 'logins.invalidEmail';
    // }

    setloginFormErrors(errors);
    return Object.keys(errors).length === 0;
  };


  const handleLoginSave = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validateloginForm()) {
      return;
    }

    try {
      
      // send only the editedData from id: {email:newEmail, username:newValue, roles:[whatever]}
      // ATTENTION the key field=email must come last or else subsequent db updates will fail when you modify it!
      debugLog('ddebug loginFormData', loginFormData)
      const result = await updateLogin(
        user.email,
        moveKeyToLast(loginFormData, 'email')
      );
      if (result.success) {
        // TODO: handle individual change failure
        
        setSuccessMessage(t('logins.saved', {username:login.email}));
        
      } else setErrorMessage(result.message);
      
    } catch (error) {
      errorLog(error.message);
      setErrorMessage('api.errors.updateLogin', error.message);
    }
  };


  // Open password change modal
  const handleChangePassword = () => {
    setSelectedLogin(user);
    
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
      const result = await updateLogin(
        selectedLogin.email,
        { password: passwordFormData.newPassword }
      );
      if (result.success) {
        setSuccessMessage(t('password.passwordUpdated', {username:selectedLogin.username}));
        handleClosePasswordModal(); // Close the modal
        
      } else setErrorMessage(result.message);
      
    } catch (error) {
      errorLog(t('api.errors.changePassword'), error);
      setErrorMessage('api.errors.changePassword');
    }
  };


  if (!user) {
    return <LoadingSpinner />;
  }



  // BUG: passing defaultActiveKey to Accordion as string does not activate said key, while setting it up as "1" in Accordion also does not
  // icons: https://icons.getbootstrap.com/
  return (
    <div>
      <h2 className="mb-4">{Translate('logins.profilePage')}</h2>
      
      <AlertMessage type="danger" message={errorMessage} />
      <AlertMessage type="success" message={successMessage} />
      
      <Form onSubmit={handleLoginSave} className="form-wrapper">
        <FormField
          type="checkbox"
          id="isAdmin"
          name="isAdmin"
          label="logins.isAdmin"
          error={loginFormErrors.isAdmin}
          isChecked={loginFormData.isAdmin}
          disabled
        />

        <FormField
          type="checkbox"
          id="isAccount"
          name="isAccount"
          label="logins.isAccountChoice"
          error={loginFormErrors.isAccount}
          isChecked={loginFormData.isAccount && !loginFormData.isAdmin}
          disabled
        />

        {!loginFormData.isAccount && (
          <FormField
            type="email"
            id="email"
            name="email"
            label="logins.email"
            value={loginFormData.email}
            onChange={handleLoginInputChange}
            placeholder="user@domain.com"
            error={loginFormErrors.email}
            helpText="logins.emailHelp"
            required
            disabled
          />
        )}

        <FormField
          type="text"
          id="username"
          name="username"
          label="logins.username"
          value={loginFormData.username}
          onChange={handleLoginInputChange}
          placeholder="admin"
          error={loginFormErrors.username}
          helpText="logins.usernameHelp"
          required
          disabled
        />

        <FormField
          type="checkbox"
          id="isActive"
          name="isActive"
          label="logins.isActive"
          error={loginFormErrors.isActive}
          isChecked={loginFormData.isActive}
          disabled
        />

        <Button
          variant="primary"
          type="submit"
          icon="floppy"
          text="logins.updateLogin"
          className="me-2"
        />
        <Button
          variant="primary"
          icon="key"
          text={t('password.changePassword')}
          onClick={() => handleChangePassword()}
          className="me-2"
        />
      </Form>

      {/* Password Change Modal using react-bootstrap */}
      <Modal show={showPasswordModal} onHide={handleClosePasswordModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {Translate('password.changePassword')} - {selectedLogin?.email}{' '}
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

export default Profile;
