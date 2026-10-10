import React, { useState, useEffect } from 'react'; // Local Agent FIX: removed useRef (no longer needed)
import { useTranslation } from 'react-i18next';
import Form from 'react-bootstrap/Form';
// Local Agent FIX: removed import Modal from 'react-bootstrap/Modal' - now in shared PasswordChangeModal

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
} from '../frontend.mjs';
import {
  regexUsername,
  isNonEmptyDict,
  regexEmailStrict,
} from '../../../common.mjs'; // Local Agent FIX: removed getValueFromArrayOfObj (only used in password change, now in hook)

import {
  updateLogin,
} from '../services/api.mjs'; // Local Agent FIX: removed updateAccount (only used in password change, now in hook)

import AlertMessage from '../components/AlertMessage';
import Button from '../components/Button';
import FormField from '../components/FormField';
import LoadingSpinner from '../components/LoadingSpinner';
import Translate from '../components/Translate';
import SelectField from '../components/SelectField';
import PasswordChangeModal from '../components/PasswordChangeModal'; // Local Agent FIX: shared component (was inline)

import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import usePasswordChange from '../hooks/usePasswordChange'; // Local Agent FIX: extracted hook (was copy-pasted state+handlers)

const Profile = () => {
  // const sortKeysInObject = ['mailbox', 'username'];   // not needed as they are not objects, just rendered FormControl
  const { t } = useTranslation();
  const triggerToast = useToast();
  const { user, login } = useAuth();

  const [containerName] = useLocalStorage("containerName", '');
  const [mailservers] = useLocalStorage("mailservers", []);
  const [firstRun] = useLocalStorage("firstRun", false); // this is obviously used in Login, Profile and Settings

  // Common states -------------------------------------------------
  const [isLoading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // State for new login inputs ----------------------------------
  const [loginFormData, setloginFormData] = useState(() => user);
  // errors must not be initialized as there are no errors for a valid user Profile
  const [formErrors, setformErrors] = useState({});
  const [submitDisabled, setSubmitDisabled] = useState(true);

  // Local Agent FIX: password change extracted to usePasswordChange hook (was ~100 lines of copy-pasted state+handlers)
  const passwordChange = usePasswordChange({ containerName, mailservers, user });

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

  // Calculate the success message directly on render instead of an effect state
  // (firstRun) ? setSuccessMessage('password.isFirstRun') : setSuccessMessage(null);  // Uncaught Error: Too many re-renders. React limits the number of renders to prevent an infinite loop.

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
    const hasErrors = !!isNonEmptyDict(freshErrors);
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
    setWarningMessage(null);
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
        // setSuccessMessage(t('logins.saved', {username:user.mailbox}));
        triggerToast({
          type: 'success',
          message: t('logins.saved', {username:user.mailbox}),
        });
        
      // } else setErrorMessage(result?.error);
      } else triggerToast({
        type: 'error',
        message: result?.error,
      });
      
      
    } catch (error) {
      errorLog(error.message || error);
      // setErrorMessage('api.errors.updateLogin', error.message);
      // setErrorMessage({key: 'api.errors.updateLogin', values: { error: error.message }});
      triggerToast({
        type: 'error',
        message: {key: 'api.errors.updateLogin', values: { error: error.message }},
      });
    }
  };


  // Local Agent FIX: removed ~100 lines of copy-pasted password change state+handlers
  // (handleChangePassword, handleClosePasswordModal, handlePasswordInputChange,
  //  validatePasswordForm, handleSubmitPasswordChange) - all now in usePasswordChange hook


  // highlight options by shades of yellow if they aequal to login's mailbox or at least the domains are the same
  const highlightOptionByDomain = (option, mailbox=undefined, className="") => {
    let highlight = "";
    if (mailbox) {
      highlight = (mailbox == option) ? " bg-warning bg-opacity-25" : ((mailbox.match(option.split('@')[1])) ? " bg-warning bg-opacity-10" : "");
    }
    return className + highlight;
  };



  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    debugLog('user', user);
    // setLoading(true);  // eslint fix
    // setloginFormData(user);  // eslint fix
    // if (firstRun) setSuccessMessage('password.isFirstRun');  // eslint fix is a lie
    if (firstRun) setSuccessMessage('password.isFirstRun');
    setLoading(false);  // eslint fix is a lie
    debugLog('loginFormData',loginFormData);
  }, [user]);


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
      {/* Local Agent FIX: password change messages from the shared hook */}
      <AlertMessage type="danger" message={passwordChange.errorMessage} />
      <AlertMessage type="success" message={passwordChange.successMessage} />
      
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
          onClick={() => passwordChange.handleChangePassword(user)} // Local Agent FIX: calls shared hook with user as the login
          className="me-2"
        />
      </Form>

      {/* Local Agent FIX: replaced inline <Modal> with shared PasswordChangeModal component */}
      <PasswordChangeModal
        show={passwordChange.showPasswordModal}
        selectedLogin={passwordChange.selectedLogin}
        formData={passwordChange.passwordFormData}
        errors={passwordChange.passwordFormErrors}
        onInputChange={passwordChange.handlePasswordInputChange}
        onSubmit={passwordChange.handleSubmitPasswordChange}
        onClose={passwordChange.handleClosePasswordModal}
      />

    </div>
  );
};

export default Profile;