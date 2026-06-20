import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal'; // Import Modal

// https://mui.com/material-ui/react-autocomplete/#multiple-values
// import Chip from '@mui/material/Chip';
// import Autocomplete from '@mui/material/Autocomplete';
// import TextField from '@mui/material/TextField';
// import Stack from '@mui/material/Stack';

// https://mui.com/material-ui/react-autocomplete/#multiple-values
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

import {
  debugLog,
  errorLog,
} from '../../frontend.mjs';
import {
  getValueFromArrayOfObj,
  regexUsername,
  isNonEmptyDict,
  regexEmailStrict,
} from '../../../common.mjs';

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

import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';

const Profile = () => {
  // const sortKeysInObject = ['mailbox', 'username'];   // not needed as they are not objects, just rendered FormControl
  const { t } = useTranslation();
  const { user, login } = useAuth();

  const [containerName] = useLocalStorage("containerName", '');
  const [mailservers, setMailservers] = useLocalStorage("mailservers", []);
  const [firstRun, setFirstRun] = useLocalStorage("firstRun", false); // this is obviously used in Login, Profile and Settings

  // Common states -------------------------------------------------
  const [isLoading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // State for new login inputs ----------------------------------
  const [loginFormData, setloginFormData] = useState(user);
  // errors must not be initialized as there are no errors for a valid user Profile
  const [formErrors, setformErrors] = useState({});
  const [submitDisabled, setSubmitDisabled] = useState(true);

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
    debugLog('user', user);
    setLoading(true);
    // if (!mailservers || !mailservers.length) fetchMailservers();
    setloginFormData(user);
    if (firstRun) setSuccessMessage('password.isFirstRun');
    setLoading(false);
    debugLog('loginFormData',loginFormData);
  }, [user]);

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


  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    let jsonDict, inputValue;
    if (type === 'checkbox') {
      inputValue = checked ? 1 : 0; // Directly assigns 1 or 0
    } else {
      inputValue = type === 'number' ? Number(value) : value; // Assigns the typed text string or resolve as a number
    }
    jsonDict = {[name]: inputValue};

    // Calculate the exact next state
    const updatedFormData = {
      ...loginFormData,
      ...jsonDict
    };
    setloginFormData(updatedFormData);
    debugLog('loginFormData:', updatedFormData);

    // Clear the error for this field while typing // now done by validateloginForm
    // if (formErrors[name]) {
    //   setformErrors({
    //     ...formErrors,
    //     [name]: null,
    //   });
    // }

    // Update the button instantly using the fresh error object
    const freshErrors = validateloginForm(updatedFormData);
    const hasErrors = isNonEmptyDict(freshErrors);
    setSubmitDisabled(hasErrors);

  };


  const validateloginForm = (currentFormData) => {
    const errors = {};

    if (!currentFormData.mailserver) {
      errors.mailserver = 'logins.mailserverRequired';
    }

    if (!currentFormData.username.trim()) {
      errors.username = 'logins.usernameRequired';

    } else if (!regexUsername.test(currentFormData.username.trim())) {
      errors.username = 'logins.usernameInvalid';
    }

    // this is done by react somehow but we need to also do it to release the save login button
    if (!currentFormData.email.trim()) {
      errors.email = 'logins.emailRequired';

    } else if (!regexEmailStrict.test(currentFormData.email.trim())) {
      errors.email = 'logins.emailInvalid';
    }

    setformErrors(errors);
    debugLog('ddebug setformErrors errors:', errors)
    return errors;
  };


  const handleLoginSave = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // no need anymore since validateLoginForm is done after each change
    // if (!validateloginForm()) {
    //   return;
    // }

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
        user.id,
        {username:loginFormData.username, email:loginFormData.email, mailserver:loginFormData.mailserver},
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
    setPasswordFormErrors({});
    setShowPasswordModal(false);
    setSelectedLogin(null);
  };

  // Handle input changes for password change form
  const handlePasswordInputChange = (e) => {
    const { name, value, type } = e.target;
    
    setPasswordFormData({
      ...passwordFormData,
      [name]: type === 'number' ? Number(value) : value,
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

    // admins can do anything including disregard password length
    } else if (passwordFormData.newPassword.length < 8 && !user.isAdmin) {
      errors.newPassword = 'password.passwordLength';
    }

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      errors.confirmPassword = 'logins.passwordsNotMatch';
    }

    setPasswordFormErrors(errors);
    return isNonEmptyDict(errors);
  };

  // Submit password change
  const handleSubmitPasswordChange = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validatePasswordForm()) {
      return;
    }

    let result = {success:false, message:''};
    try {

      // normal dms-gui local account; always done, otherwise how will the user login when we turn it to normal user?
      result = await updateLogin(
        selectedLogin.id,
        { password: passwordFormData.newPassword }
      );
      if (result.success) {
        result.message = t('password.passwordUpdated', {key:'username', value:selectedLogin.username});

        // change mailbox password when user isAccount
        if (selectedLogin.isAccount) {
          result = await updateAccount(
            getValueFromArrayOfObj(mailservers, containerName, 'value', 'schema'), 
            containerName,
            selectedLogin.mailbox,
            { password: passwordFormData.newPassword }
          );
        }
        if (result.success) {
          result.message = t('password.passwordUpdated', {key:'mailbox', value:selectedLogin.mailbox});
        } else {
          setErrorMessage(result?.error);
        }

      } else setErrorMessage(result?.error);
      
    } catch (error) {
      errorLog(t('api.errors.changePassword'), error);
      setErrorMessage('api.errors.changePassword');

    } finally {
      if (result.success) setSuccessMessage(result.message);
      handleClosePasswordModal(); // Close the modal
    }

  };


  // highlight options by shades of yellow if they aequal to login's mailbox or at least the domains are the same
  const highlightOptionByDomain = (option, mailbox=undefined, className="") => {
    let highlight = "";
    if (mailbox) {
      highlight = (mailbox == option) ? " bg-warning bg-opacity-25" : ((mailbox.match(option.split('@')[1])) ? " bg-warning bg-opacity-10" : "");
    }
    return className + highlight;
  };


  if (isLoading) {
    return <LoadingSpinner />;
  }



  // BUG: passing defaultActiveKey to Accordion as string does not activate said key, while setting it up as "1" in Accordion also does not
  // icons: https://icons.getbootstrap.com/
  return (
    <div>
      <h2 className="mb-4">{Translate('logins.profilePage')}</h2>
      
      <AlertMessage type="danger" message={errorMessage} />
      <AlertMessage type="warning" message={warningMessage} />
      <AlertMessage type="success" message={successMessage} />
      
      <Form onSubmit={handleLoginSave} className="form-wrapper">
        <FormField
          type="checkbox"
          id="isAdmin"
          name="isAdmin"
          label="logins.isAdmin"
          error={formErrors.isAdmin}
          defaultChecked={loginFormData.isAdmin}
          disabled
        />

        <FormField
          type="checkbox"
          id="isAccount"
          name="isAccount"
          label="logins.isAccountChoice"
          error={formErrors.isAccount}
          defaultChecked={loginFormData.isAccount && !loginFormData.isAdmin}
          disabled
        />

        <SelectField
          id="mailserver"
          name="mailserver"
          label="logins.mailserver"
          value={loginFormData?.mailserver || mailservers[0]?.containerName || null}
          onChange={handleInputChange}
          options={mailservers}
          placeholder="logins.mailserverRequired"
          error={formErrors.mailserver}
          helpText="logins.mailserverRequired"
          required
        />

        {!loginFormData.isAccount && (
          <FormField
            type="email"
            id="mailbox"
            name="mailbox"
            label="logins.mailbox"
            value={loginFormData.mailbox}
            onChange={handleInputChange}
            maxLength={254}
            placeholder="user@domain.com"
            error={formErrors.mailbox}
            helpText="logins.mailboxHelp"
            required
            disabled
          />
        )}

        <Autocomplete
          multiple
          id="roles"
          options={user.roles}
          groupBy={(mailbox) => mailbox.split('@')[1]}    // groupBy with an array of strings: so easy! create the group off the valuesdirectly!
          filterSelectedOptions
          disabled
          
          value={user.roles}
          renderOption={(props, option) => (
            <li
              {...props}
              className={highlightOptionByDomain(option, user.mailbox, props.className)}
              key={option}
            >
            {option}
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              sx={{ minWidth: 0 }}
              label={t('logins.roles')}
            />
          )}
        />

        <div>
          <FormField
            type="text"
            id="username"
            name="username"
            label="logins.username"
            value={loginFormData.username}
            onChange={handleInputChange}
            maxLength={36}
            groupClass="mb-0" // Removed margin so the badge sits cleanly right under the input field
            placeholder="admin"
            error={formErrors.username}
            helpText="logins.usernameHelp"
            required
            disabled={!loginFormData.isAdmin}
          />
          
          {/* The Live Character Counter Badge */}
          <div className="text-end small mb-2" style={{ marginTop: "-2px" }}>
            <span className={loginFormData.username?.length >= 30 ? "text-danger fw-bold" : "text-muted"}>
              {loginFormData.username?.length || 0}/36
            </span>
          </div>
        </div>
        
        <div>
          <FormField
            type="email"
            id="email"
            name="email"
            label="logins.email"
            value={loginFormData.email}
            onChange={handleInputChange}
            maxLength={254}
            groupClass="mb-0" // Removed margin so the badge sits cleanly right under the input field
            placeholder="user@domain.com"
            error={formErrors.email}
            helpText="logins.emailHelp"
            required
          />
          
          {/* The Live Character Counter Badge */}
          <div className="text-end small mb-2" style={{ marginTop: "-2px" }}>
            <span className={loginFormData.email?.length >= 200 ? "text-danger fw-bold" : "text-muted"}>
              {loginFormData.email?.length || 0}/254
            </span>
          </div>
        </div>

        <FormField
          type="checkbox"
          id="isActive"
          name="isActive"
          label="logins.isActive"
          error={formErrors.isActive}
          defaultChecked={loginFormData.isActive}
          disabled
        />

        <Button
          variant="primary"
          type="submit"
          icon="floppy"
          text="logins.updateLogin"
          className="me-2"
          disabled={submitDisabled}
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
            {Translate('password.changePassword')}: {selectedLogin?.username} / {selectedLogin?.mailbox}{' '}
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
