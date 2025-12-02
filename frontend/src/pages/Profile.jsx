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
// import {
//   regexUsername,
//   moveKeyToLast,
// } from '../../../common.mjs';

import {
  updateAccount,
  updateLogin,
  getConfigs,
} from '../services/api.mjs';

import {
  AlertMessage,
  Button,
  FormField,
  LoadingSpinner,
  Translate,
  SelectField,
} from '../components/index.jsx';


const Profile = () => {
  // const sortKeysInObject = ['mailbox', 'username'];   // not needed as they are not objects, just rendered FormControl
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const [containerName] = useLocalStorage("containerName");
  const [schema] = useLocalStorage("schema");

  const [DMSs, setDMSs] = useState([]);

  // Common states -------------------------------------------------
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // State for new login inputs ----------------------------------
  const [loginFormData, setloginFormData] = useState(user);
  const [loginFormErrors, setloginFormErrors] = useState({});

  // State for password change modal -------------------------------
  const [selectedLogin, setSelectedLogin] = useState(null);
  const passwordFormRef = useRef(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordFormErrors, setPasswordFormErrors] = useState({});

  
  
  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    setLoading(true);
    fetchMailservers();
    // fetchProfile();  // nah we use localStorage user, even if hacked, the backend takes care of it
    setLoading(false);
  }, []);

  // const fetchProfile = async () => {
    
  //   try {
  //     setErrorMessage(null);
  //     setSuccessMessage(null);

  //     // this does not need to be fetched lol
  //     setloginFormData({
  //       ...loginFormData,
  //       ...user
  //     });

  //   } catch (error) {
  //     errorLog(t('api.errors.fetchProfile'), error);
  //     setErrorMessage('api.errors.fetchProfile');
  //   }
  // };


  const fetchMailservers = async () => {
    
    debugLog(`fetchMailservers call getConfigs()`);
    try {
      const [mailserversData] = await Promise.all([
        getConfigs('mailserver'),
      ]);

      if (mailserversData.success) {
        // this will be all containers in db except dms-gui
        debugLog('fetchMailservers: mailserversData', mailserversData);   // [ {value:'containerName'}, .. ]
 
        // update selector list
        setDMSs(mailserversData.message.map(mailserver => { return { ...mailserver, label:mailserver.value } }));   // duplicate value as label for the select field

      } else setErrorMessage(mailserversData?.error);

    } catch (error) {
      errorLog(t('api.errors.fetchSettings'), error);
      setErrorMessage('api.errors.fetchSettings');
    }
  };


  const handleLoginInputChange = (e) => {
    debugLog('loginFormData',loginFormData);
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

    if (!loginFormData.favorite.trim()) {
      errors.favorite = 'logins.favoriteRequired';
    }

    // if (!loginFormData.username.trim()) {
    //   errors.username = 'logins.usernameRequired';
    // } else if (!regexUsername.test(loginFormData.username)) {
    //   errors.username = 'logins.usernameInvalid';
    // }

    // this is done by react
    // if (!loginFormData.mailbox.trim()) {
      // errors.mailbox = 'logins.emailRequired';
    // } else if (!regexEmailStrict.test(loginFormData.mailbox)) {
      // errors.mailbox = 'logins.invalidEmail';
    // }

    // this is done by react
    // if (!loginFormData.email.trim()) {
      // errors.email = 'logins.emailRequired';
    // } else if (!regexEmailStrict.test(loginFormData.email)) {
      // errors.email = 'logins.invalidEmail';
    // }

    setloginFormErrors(errors);
    return Object.keys(errors).length === 0;
  };


  const handleLoginSave = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validateloginForm()) {
      return;
    }

    try {
      
      // send only the editedData from id: {mailbox:newEmail, username:newValue, email:newEmail, roles:[whatever]}
      // ATTENTION the key field=mailbox must come last or else subsequent db updates will fail when you modify it!
      // moveKeyToLast(loginFormData, 'mailbox')  // no need for that, we just init loginFormData with mailbox last!
      // debugLog('ddebug loginFormData', loginFormData)
      // const result = await updateLogin(
      //   user.mailbox,
      //   loginFormData,
      // );

      // how about we push only the fields we want? like, the only fields the users can modify? hm??
      const result = await updateLogin(
        user.mailbox,
        {username:loginFormData.username, email:loginFormData.email, favorite:loginFormData.favorite},
      );
      if (result.success) {
        login(loginFormData); // reset new values for that user in frontend state
        setSuccessMessage(t('logins.saved', {username:user.mailbox}));
        
      } else setErrorMessage(result?.error);
      
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
      let result;
      if (selectedLogin.isAccount) {
        result = await updateAccount(
          containerName,
          selectedLogin.mailbox,
          { password: passwordFormData.newPassword }
        );
      
      // normal dms-gui account
      } else {
        result = await updateLogin(
          selectedLogin.mailbox,
          { password: passwordFormData.newPassword }
        );
      }
      if (result.success) {
        setSuccessMessage(t('password.passwordUpdated', {username:selectedLogin.mailbox}));
        handleClosePasswordModal(); // Close the modal
        
      } else setErrorMessage(result?.error);
      
    } catch (error) {
      errorLog(t('api.errors.changePassword'), error);
      setErrorMessage('api.errors.changePassword');
    }
  };


  if (isLoading && !selectedLogin) {
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

        <SelectField
          id="favorite"
          name="favorite"
          label="logins.favorite"
          value={loginFormData.favorite}
          onChange={handleLoginInputChange}
          options={DMSs}
          placeholder="logins.favoriteRequired"
          error={loginFormErrors.favorite}
          helpText="logins.favoriteRequired"
          required
        />

        {!loginFormData.isAccount && (
          <FormField
            type="mailbox"
            id="mailbox"
            name="mailbox"
            label="logins.mailbox"
            value={loginFormData.mailbox}
            onChange={handleLoginInputChange}
            placeholder="user@domain.com"
            error={loginFormErrors.mailbox}
            helpText="logins.mailboxHelp"
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
        />

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
            {Translate('password.changePassword')} - {selectedLogin?.username}{' '}
            {/* Use optional chaining */}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!selectedLogin?.isAdmin && !selectedLogin?.isAccount && <AlertMessage type="info" message={t('password.notMailbox')} />}
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
