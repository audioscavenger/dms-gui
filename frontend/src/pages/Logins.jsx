import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Modal from 'react-bootstrap/Modal'; // Import Modal

// https://mui.com/material-ui/react-autocomplete/#multiple-values
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

import {
  debugLog,
  errorLog,
} from '../../frontend.mjs';
import {
  moveKeyToLast,
  pluck,
} from '../../../common.mjs';

import {
  getLogins,
  addLogin,
  deleteLogin,
  updateLogin,
  getAccounts,
  getScopes,
} from '../services/api.mjs';

import {
  AlertMessage,
  Accordion,
  Button,
  DataTable,
  FormField,
  SelectField,
  LoadingSpinner,
  Translate,
} from '../components/index.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';


const Logins = () => {
  // const sortKeysInObject = ['email', 'username'];   // not needed as they are not objects, just rendered FormControl
  const { t } = useTranslation();
  const { user } = useAuth();
  const [containerName] = useLocalStorage("containerName");

  const [DMSs, setDMSs] = useState([]);

  // Common states -------------------------------------------------
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedLogin, setSelectedLogin] = useState(null);
  
  // Form states --------------------------------------------------
  const [accountOptions, setAccountOptions] = useState([]);

  // Roles states -------------------------------------------------- // https://mui.com/material-ui/react-autocomplete/#multiple-values
  const [rolesAvailable, setRolesAvailable] = useState([]);
  
  // changed data --------------------------------------------------
  // Track changes in a separate dictionary
  const [logins, setLogins] = useState([]);
  const [editedData, setEditedData] = useState({});
  
  // show and changes in fields without modifying logins state
  const getFieldValue = (id, fieldName) => {
    return editedData[id]?.[fieldName] ?? logins.find((r) => r.id === id)?.[fieldName];
  };
  
  // change detector to enable save button
  const isRowChanged = (id) => {
    return editedData[id] !== undefined;
  };
  
  // State for new login inputs ----------------------------------
  const [newLoginformData, setNewLoginFormData] = useState({
    mailbox: '',
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    isAdmin: 0,
    isAccount: 0,
    isActive: 1,
    favorite: '',
    roles: [],
  });
  const [newLoginFormErrors, setNewLoginFormErrors] = useState({});

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
    fetchAll();
  }, []);

  const formatLoginsForTable = async (data) => {
    // add bolder for admins
    data = data.map(login => { return { 
    ...login, 
    color:    (login.isAdmin) ? "fw-bolder" : null,
    }; });
    
    // add blue color for linked accounts
    data = data.map(login => { return { 
    ...login, 
    color:    (login.isAccount) ? login?.color+" text-info" : login?.color,
    }; });
    
    // add muted color for inactives
    data = data.map(login => { return { 
    ...login, 
    color:  (login.isActive) ? login?.color : login?.color+" td-opacity-25",
    }; });

    return data;
  }

  const fetchAll = async () => {
    
    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      
      await Promise.all([
        fetchScopes(),
        fetchAccounts(),
        fetchLogins(),
      ]);

    } catch (error) {
      errorLog(t('api.errors.fetchLogins'), error);
      setErrorMessage('api.errors.fetchLogins');
      
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    
    try {
      // debugLog('ddebug containerName',containerName)
      const [accountsData] = await Promise.all([    // loginsData better have a uniq readOnly id field we can use, as we may modify each other fields
        getAccounts(containerName),
      ]);
        debugLog('accountsData',accountsData)

      if (accountsData.success) {
        // Prepare account options for the select field
        setAccountOptions(accountsData.message.map((account) => ({
          value: account.mailbox,
          label: account.mailbox,
        })));

        let mailboxes = (pluck(accountsData.message, 'mailbox', true, false));  // we keep only an array of uniq (true) mailbox names [box1@domain.com, ..], already sorted by domain and no extra sort (false)
        setRolesAvailable(mailboxes);
        debugLog('mailboxes',mailboxes)

      } else setErrorMessage(accountsData.message);

    } catch (error) {
      errorLog(t('api.errors.fetchAccounts'), error);
      setErrorMessage('api.errors.fetchAccounts');
      
    } finally {
      setLoading(false);
    }
  };

  const fetchLogins = async () => {
    
    try {
      const [loginsData] = await Promise.all([    // loginsData better have a uniq readOnly id field we can use, as we may modify each other fields
        getLogins(),
      ]);

      if (loginsData.success) {
        let loginsDataAltered = await formatLoginsForTable(loginsData.message);
        debugLog('loginsDataAltered', loginsDataAltered);
        setLogins(loginsDataAltered);

      } else setErrorMessage(loginsData.message);

    } catch (error) {
      errorLog(t('api.errors.fetchLogins'), error);
      setErrorMessage('api.errors.fetchLogins');
      
    } finally {
      setLoading(false);
    }
  };


  const fetchScopes = async () => {
    
    debugLog(`fetchScopes call getScopes()`);
    try {
      const [scopesData] = await Promise.all([
        getScopes(),
      ]);

      if (scopesData.success) {
        // this will be all containers in db except dms-gui
        console.debug('fetchScopes: scopesData', scopesData);   // [ {value:'containerName'}, .. ]
 
        // update selector list
        setDMSs(scopesData.message.map(scope => { return { ...scope, label:scope.value } }));   // duplicate value as label for the select field

      } else setErrorMessage(scopesData.message);

    } catch (error) {
      errorLog(t('api.errors.fetchSettings'), error);
      setErrorMessage('api.errors.fetchSettings');
    }
  };


  const handleNewLoginInputChange = (e) => {
    debugLog(newLoginformData);
    const { name, value } = e.target;
    
    // special cases ------------------------------
    let jsonDict = {[name]: value};
    
    if (name == 'email' && newLoginformData.isAccount) {
      // we are attached to a mailbox and user just chose it from the SelectField
      debugLog(`roles ==> [${value}]`);
      jsonDict.roles = [value];
    }
    
    setNewLoginFormData({
      ...newLoginformData,
      ...jsonDict
    });

    // Clear the error for this field while typing
    if (newLoginFormErrors[name]) {
      setNewLoginFormErrors({
        ...newLoginFormErrors,
        [name]: null,
      });
    }
  };

  const handleNewLoginCheckboxChange = (e) => {
    debugLog(newLoginformData);
    const { name, checked } = e.target;
    
    // special cases ------------------------------
    let jsonDict = {[name]: (checked) ? 1 : 0};
    
    if (name == 'isAdmin' && checked) {
      debugLog('isAccount ==> 0');
      // disable isAccount checkbox and SelectField
      // but we keep the mailbox that was selected
      // setNewLoginFormData({
        // ...newLoginformData,
        // isAccount: 0
      // });
      jsonDict.isAccount = 0;
    }

    if (name == 'isAccount' && checked) {
      debugLog('isAccount ==> 1');
      jsonDict.roles = pluck(accountOptions, 'value').includes(newLoginformData.mailbox) ? [newLoginformData.mailbox] : [];
    }

    setNewLoginFormData({
      ...newLoginformData,
      ...jsonDict
    });

  };

  const handleNewLoginRolesChange = (e, newValue) => {  // newValue is an arrey with all the options selected
    
    debugLog('newValue', newValue);
    debugLog('newLoginformData', newLoginformData);

    setNewLoginFormData({
      ...newLoginformData,
      roles: newValue
    });
    
  };

  const validateNewLoginForm = () => {
    const errors = {};

    if (!newLoginformData.username.trim()) {
      errors.username = 'logins.usernameRequired';
    } else if (!regexUsername.test(newLoginformData.username)) {
      errors.username = 'logins.usernameInvalid';
    }

    // this is done by react
    // if (!newLoginformData.mailbox.trim()) {
      // errors.mailbox = 'logins.emailRequired';
    // } else if (!regexEmailStrict.test(newLoginformData.mailbox)) {
      // errors.mailbox = 'logins.invalidEmail';
    // }

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
      const result = await addLogin(
        newLoginformData.mailbox,
        newLoginformData.username,
        newLoginformData.password,
        newLoginformData.email,
        newLoginformData.isAdmin,
        newLoginformData.isAccount,
        newLoginformData.isActive,
        newLoginformData.favorite,
        newLoginformData.roles,
        [],
      );
      if (result.success) {
        setSuccessMessage('logins.loginCreated');
        setNewLoginFormData({
          mailbox: '',
          username: '',
          password: '',
          confirmPassword: '',
          email: '',
          isAdmin: 0,
          isAccount: 0,
          isActive: 1,
          favorite: '',
          roles: [],
        });
        fetchAll(); // Refresh the logins list
        
      } else setErrorMessage(result.message);
      
    } catch (error) {
      errorLog(t('api.errors.addLogin'), error.message);
      setErrorMessage('api.errors.addLogin', error.message);
    }
  };



  const handleLoginChange = (e, login, key, newValue) => {  // newValue is an arrey with all the options selected
    
    debugLog('login', login);               // { id: 1, mailbox: "admin@domain.com", username: "admin", isAdmin: 1, isActive: 1, color: "" }
    debugLog('key', key);                   // roles, emails, username...
    debugLog('newValue', newValue);         // role: _[ "box1@domain.com", .. ]_ or mailbox: _new.mailbox@gmail.com_ or username: _admin2_
    debugLog('editedData', editedData);     // { 1:{mailbox:newValue, username:newValue}, .. }
    debugLog(`isRowChanged(${login.id})`, isRowChanged(login.id));     // 
    
    // set state, with changes
    // setLogins(prevLogins =>
      // prevLogins.map(item =>
        // item.id === login.id                            // for that login...
          // ? { ...item, [key]: newValue }                // update the key with newValue
          // : item                                        // and keep other items as they are
      // )
    // );

    // register change in a new key for that id
    setEditedData((prevEdited) => ({
      ...prevEdited,
      [login.id]: {
        ...prevEdited[login.id],
        [key]: newValue,
      },
    }));
    
  };


  const handleLoginDelete = async (login) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (window.confirm(t('logins.confirmDelete', { username:login.mailbox }))) {
      try {
        const result = await deleteLogin(login.mailbox);
        if (result.success) {
          setSuccessMessage('logins.loginDeleted');
          fetchAll(); // Refresh the logins list
          
        } else setErrorMessage(result.message);
        
      } catch (error) {
        errorLog(t('api.errors.deleteLogin'), error.message);
        setErrorMessage('api.errors.deleteLogin', error.message);
      }
    }
  };


  const handleLoginFlipBit = async (login, what) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      
      const jsonDict = { [what]: +!login[what] };
      
      // special cases here as well as in the backend
      // disable isAccount for admins:
      if (what == 'isAdmin' && +!login.isAdmin == 1) jsonDict.isAccount = 0;
      // disable isAdmin for linked accounts:
      if (what == 'isAccount' && +!login.isAccount == 1) jsonDict.isAdmin = 0;
      
      const result = await updateLogin(
        login.mailbox,
        jsonDict
      );

      if (result.success) {
        // reflect changes in the table instead of fetching all again // edit: nope, because of the alteration of logins data after fetch, we need to reload
        // setLogins(prevLogins =>
        //   prevLogins.map(item =>
        //     item.id === login.id                          // for that login...
        //       ? { ...item, ...jsonDict }                  // Set state for what hasChanged
        //       : item                                      // and keep other items as they are
        //   )
        // );
        // setSuccessMessage(t('logins.updated', {username:login.mailbox}));  // no need for that, the table will reflect the changes
        fetchLogins();
        
      } else setErrorMessage(result.message);
      
    } catch (error) {
      errorLog(t('api.errors.updateLogin'), error.message);
      setErrorMessage('api.errors.updateLogin', error.message);
    }
  };

  // the save operation is done per id
  const handleLoginSave = async (login) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      
      // // process all rows in editedData
      // const updatedData = data.map((row) =>
        // editedData[row.id] ? { ...row, ...editedData[row.id] } : row
      // );

    // send only the editedData from id: {mailbox:newEmail, username:newValue, roles:[whatever]}
    // ATTENTION the key field=email must come last or else subsequent db updates will fail!
      const result = await updateLogin(
        login.mailbox,
        moveKeyToLast(editedData[login.id], 'mailbox')
      );
      if (result.success) {
        // TODO: handle individual change failure
        
        // apply actual logins data with the changes
        // reflect changes in the table instead of fetching all again
        setLogins(prevLogins =>
          prevLogins.map(item =>
            item.id === login.id                          // for that login...
              ? { ...item, ...editedData[login.id] }      // merge current state with editedData
              : item                                      // and keep other items as they are
          )
        );
        
        // reset editedData without that id
        const { [login.id]:{}, ...editedDataReset } = editedData;
        setEditedData(editedDataReset);

        setSuccessMessage(t('logins.saved', {username:login.mailbox}));
        
      } else setErrorMessage(result.message);
      
    } catch (error) {
        errorLog(t('api.errors.updateLogin'), error.message);
        setErrorMessage('api.errors.updateLogin', error.message);
    }
  };

  // Open password change modal
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
      const result = await updateLogin(
        selectedLogin.mailbox,
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

  // highlight options by shades of yellow if they aequal to login's mailbox or at least the domains are the same
  const highlightOptionByDomain = (option, mailbox=undefined, className="") => {
    let highlight = "";
    if (mailbox) {
      highlight = (mailbox == option) ? " bg-warning bg-opacity-25" : ((mailbox.match(option.split('@')[1])) ? " bg-warning bg-opacity-10" : "");
    }
    return className + highlight;
  };


  if (isLoading || !user?.isAdmin) {
    return <LoadingSpinner />;
  }

            // getOptionLabel={rolesAvailable}    // requires a dict
                // placeholder={t('logins.roles2pick')}

  // Column definitions for existing logins table
  // adding hidden data in the span before the FormField let us sort also this column
  const columns = [
    { 
      key: 'mailbox',
      label: 'logins.mailbox',
      render: (login) => (
        <span><span className="d-none">{login.mailbox}</span>
        <FormField
          type="mailbox"
          id="mailbox"
          name="mailbox"
          value={getFieldValue(login.id, 'mailbox')}
          onChange={(e) => handleLoginChange(e, login, "mailbox", e.target.value)}
          groupClass=""
          className="form-control-sm"
          required
        />
        </span>
      ),
    },
    { 
      key: 'username',
      label: 'logins.username',
      render: (login) => (
        <span><span className="d-none">{login.username}</span>
        <FormField
          type="username"
          id="username"
          name="username"
          value={getFieldValue(login.id, 'username')}
          onChange={(e) => handleLoginChange(e, login, "username", e.target.value)}
          groupClass=""
          className="form-control-sm"
          required
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
          <span>{(login.isAdmin) ? t('common.yes') : t('common.no')}</span>
          <Button
            variant={(login.isAdmin) ? "info" : "warning"}
            size="xs"
            icon={(login.isAdmin) ? "chevron-double-down" : "chevron-double-up"}
            title={(login.isAdmin) ? t('logins.demote', { username: login.username}) : t('logins.promote', { username: login.username})}
            onClick={() => handleLoginFlipBit(login, 'isAdmin')}
            className="me-2 float-end"
          />
          </>
      ),
    },
    { 
      key: 'isAccount',
      label: 'logins.isAccount',
      noFilter: true,
      render: (login) => (
      /* only render linkAccount button when isAccount=0 if rolesAvailable.includes(login.mailbox) */
      /* always render unlinkAccount button when isAccount=1 */
      ( login.isAccount || (rolesAvailable && rolesAvailable.includes(login.mailbox)) ) &&
        <>
        <span>{(login.isAccount) ? t('common.yes') : t('common.no')}</span>
        <Button
          variant={(login.isAccount) ? "warning" : "info"}
          size="xs"
          icon={(login.isAccount) ? "heartbreak" : "link-45deg"}
          title={(login.isAccount) ? t('logins.unlinkAccount', { username: login.username}) : t('logins.linkAccount', { username: login.username})}
          onClick={() => handleLoginFlipBit(login, 'isAccount')}
          className="me-2 float-end"
        />
        </>
      ),
    },
    { 
      key: 'roles',
      label: 'logins.roles',
      noSort: true,
      render: (login) => (
        <>
          <Autocomplete
            multiple
            id="roles"
            size="small"
            options={rolesAvailable}
            groupBy={(mailbox) => mailbox.split('@')[1]}    // groupBy with an array of strings: so easy! create the group off the valuesdirectly!
            filterSelectedOptions
            disabled={login.isAccount}
            
            value={getFieldValue(login.id, 'roles')}
            onChange={(e, newValue) => handleLoginChange(e, login, "roles", newValue)}
            renderOption={(props, option) => (
              <li
                {...props}
                className={highlightOptionByDomain(option, login?.mailbox, props.className)}
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
            title={t('logins.confirmDelete', { username: login.mailbox })}
            onClick={() => handleLoginDelete(login)}
            className="me-2"
          />
          <Button
            variant="secondary"
            size="sm"
            icon={(login.isActive) ? "toggle-on" : "toggle-off"}
            title={(login.isActive) ? t('logins.deactivate', { username: login.mailbox }) : t('logins.activate', { username: login.mailbox })}
            onClick={() => handleLoginFlipBit(login, 'isActive')}
            className="me-2"
          />
          <Button
            variant="primary"
            size="sm"
            icon="floppy2-fill"
            title={t('logins.save')}
            onClick={() => handleLoginSave(login)}
            className="me-2"
            disabled={!isRowChanged(login.id)}
          />
        </div>
      ),
    },
  ];


  const FormNewLogin = (
    <Form onSubmit={handleSubmitNewLogin} className="form-wrapper">
      <FormField
        type="checkbox"
        id="isAdmin"
        name="isAdmin"
        label="logins.isAdmin"
        onChange={handleNewLoginCheckboxChange}
        error={newLoginFormErrors.isAdmin}
        isChecked={newLoginformData.isAdmin}
      />

      <FormField
        type="checkbox"
        id="isAccount"
        name="isAccount"
        label="logins.isAccountChoice"
        onChange={handleNewLoginCheckboxChange}
        error={newLoginFormErrors.isAccount}
        isChecked={newLoginformData.isAccount && !newLoginformData.isAdmin}
        disabled={newLoginformData.isAdmin}
      />

      <SelectField
        id="favorite"
        name="favorite"
        label="logins.favorite"
        value={containerName}
        onChange={handleNewLoginInputChange}
        options={DMSs}
        placeholder="logins.favoriteRequired"
        error={newLoginFormErrors.favorite}
        helpText="logins.favoriteRequired"
        required
      />

      {newLoginformData.isAccount && (
        <SelectField
          id="mailbox"
          name="mailbox"
          label="accounts.mailbox"
          value={pluck(accountOptions, 'value').includes(newLoginformData.mailbox) ? newLoginformData.mailbox : ""}
          onChange={handleNewLoginInputChange}
          options={accountOptions}
          placeholder="accounts.mailboxRequired"
          error={newLoginFormErrors.mailbox}
          helpText="accounts.mailboxHelp"
          required
        />
      ) || (
        <FormField
          type="mailbox"
          id="mailbox"
          name="mailbox"
          label="logins.mailbox"
          value={newLoginformData.mailbox}
          onChange={handleNewLoginInputChange}
          placeholder="user@domain.com"
          error={newLoginFormErrors.mailbox}
          helpText="logins.mailboxHelp"
          required
        />
      )}

      <Autocomplete
        multiple
        id="roles"
        options={rolesAvailable}
        groupBy={(mailbox) => mailbox.split('@')[1]}    // groupBy with an array of strings: so easy! create the group off the valuesdirectly!
        filterSelectedOptions
        disabled={newLoginformData.isAccount}
        
        value={newLoginformData.roles}
        onChange={(e, newValue) => handleNewLoginRolesChange(e, newValue)}
        renderOption={(props, option) => (
          <li
            {...props}
            className={highlightOptionByDomain(option, newLoginformData?.mailbox, props.className)}
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

      <Row className="mb-3">
        <FormField
          as={Col}
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
          as={Col}
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          label="password.confirmPassword"
          value={newLoginformData.confirmPassword}
          onChange={handleNewLoginInputChange}
          error={newLoginFormErrors.confirmPassword}
          required
        />
      </Row>

      <FormField
        type="checkbox"
        id="isActive"
        name="isActive"
        label="logins.isActive"
        onChange={handleNewLoginCheckboxChange}
        error={newLoginFormErrors.isActive}
        isChecked={newLoginformData.isActive}
      />

      <Button
        type="submit"
        variant="primary"
        text="logins.addLogin"
      />
    </Form>
  );
  
  const DataTableLogins = (
          <DataTable
          columns={columns}
          data={logins}
          keyExtractor={(login) => login.mailbox}
          isLoading={isLoading}
          emptyMessage="logins.noLogins"
          />
  );
  
  // https://icons.getbootstrap.com/
  const loginTabs = [
  { id: 1, title: "logins.existingLogins",  titleExtra: `(${logins.length})`, icon: "person-lines-fill", onClickRefresh: () => fetchAll(), content: DataTableLogins },
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
            {Translate('password.changePassword')} - {selectedLogin?.mailbox}{' '}
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
