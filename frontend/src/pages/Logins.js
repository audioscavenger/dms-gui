import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Modal from 'react-bootstrap/Modal'; // Import Modal
import ProgressBar from 'react-bootstrap/ProgressBar'; // Import ProgressBar

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
  moveKeyToLast,
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
  SelectField,
  LoadingSpinner,
  Translate,
} from '../components';


const Logins = () => {
  // const sortKeysInObject = ['email', 'username'];   // not needed as they are not objects, just rendered FormControl
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const [logins, setLogins] = useState([]);
  
  // Form states --------------------------------------------------
  const [accountOptions, setAccountOptions] = useState([]);

  // Roles states -------------------------------------------------- // https://mui.com/material-ui/react-autocomplete/#multiple-values
  const [rolesAvailable, setRolesAvailable] = useState([]);
  
  // Common states -------------------------------------------------
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedLogin, setSelectedLogin] = useState(null);
  
  // changed data --------------------------------------------------
  // Track changes in a separate dictionary
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
    email: '',
    username: '',
    password: '',
    isAdmin: 0,
    isAccount: 0,
    isActive: 1,
    roles: [],
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
      const [loginsData, accountsData] = await Promise.all([    // loginsData better have a uniq readOnly id field we can use, as we may modify each other fields
        getLogins(),
        getAccounts(),
        // getRoles(),
      ]);

      // Prepare account options for the select field
      setAccountOptions(accountsData.map((account) => ({
        value: account.mailbox,
        label: account.mailbox,
      })));

      let loginsDataAltered;
        
      // add bolder for admins
      loginsDataAltered = loginsData.map(login => { return { 
      ...login, 
      color:    (login.isAdmin) ? "fw-bolder" : null,
      }; });
      
      // add blue color for linked accounts
      loginsDataAltered = loginsData.map(login => { return { 
      ...login, 
      color:    (login.isAccount) ? login?.color+" text-info" : login?.color,
      }; });
      
      // add muted color for inactives
      loginsDataAltered = loginsDataAltered.map(login => { return { 
      ...login, 
      color:  (login.isActive) ? login?.color : login?.color+" td-opacity-25",
      }; });
      
      debugLog('loginsDataAltered', loginsDataAltered);
      
      setLogins(loginsDataAltered);
      let mailboxes = (pluck(accountsData, 'mailbox', true, false));  // we keep only an array of uniq (true) mailbox names [box1@domain.com, ..], already sorted by domain and no extra sort (false)
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
      // but we keep the email that was selected
      // setNewLoginFormData({
        // ...newLoginformData,
        // isAccount: 0
      // });
      jsonDict.isAccount = 0;
    }

    if (name == 'isAccount' && checked) {
      debugLog('isAccount ==> 1');
      jsonDict.roles = pluck(accountOptions, 'value').includes(newLoginformData.email) ? [newLoginformData.email] : [];
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
        newLoginformData.email,
        newLoginformData.username,
        newLoginformData.password,
        newLoginformData.isAdmin,
        newLoginformData.isActive,
        newLoginformData.isAccount,
        [],
      );
      setSuccessMessage('logins.loginCreated');
      setNewLoginFormData({
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        isAdmin: 0,
        isAccount: 0,
        isActive: 1,
        roles: [],
      });
      fetchLogins(); // Refresh the logins list
      
    } catch (err) {
      errorLog(t('api.errors.addLogin'), err);
      (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.addLogin');
    }
  };



  const handleLoginChange = (e, login, key, newValue) => {  // newValue is an arrey with all the options selected
    
    debugLog('login', login);               // { id: 1, email: "admin@domain.com", username: "admin", isAdmin: 1, isActive: 1, color: "" }
    debugLog('key', key);                   // roles, emails, username...
    debugLog('newValue', newValue);         // role: _[ "box1@domain.com", .. ]_ or email: _new.email@gmail.com_ or username: _admin2_
    debugLog('editedData', editedData);     // { 1:{email:newValue, username:newValue}, .. }
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

    if (window.confirm(t('logins.confirmDelete', { username:login.email }))) {
      try {
        await deleteLogin(login.email);
        setSuccessMessage('logins.loginDeleted');
        fetchLogins(); // Refresh the logins list
        
      } catch (err) {
        errorLog(t('api.errors.deleteLogin'), err);
        (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.deleteLogin');
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
      
      const result = await updateLogin(
        login.email,
        jsonDict
      );

      if (result.success) {
        // reflect changes in the table instead of fetching all again
        setLogins(prevLogins =>
          prevLogins.map(item =>
            item.id === login.id                          // for that login...
              ? { ...item, ...jsonDict }                  // Set state for what hasChanged
              : item                                      // and keep other items as they are
          )
        );
        setSuccessMessage(t('logins.updated', {username:login.email}));
        
      } else setErrorMessage(result.message);
      
    } catch (err) {
      errorLog(t('api.errors.updateLogin'), err);
      (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.updateLogin');
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

    // send only the editedData from id: {email:newEmail, username:newValue, roles:[whatever]}
    // ATTENTION the key field=email must come last or else subsequent db updates will fail!
      await updateLogin(
        login.email,
        moveKeyToLast(editedData[login.id], 'email')
      );
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

      setSuccessMessage(t('logins.saved', {username:login.email}));
      
    } catch (err) {
      errorLog(t('api.errors.updateLogin'), err);
      (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.updateLogin');
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
      await updateLogin(
        selectedLogin.email,
        { password: passwordFormData.newPassword }
      );
      setSuccessMessage('password.passwordUpdated');
      handleClosePasswordModal(); // Close the modal
      
    } catch (err) {
      errorLog(t('api.errors.changePassword'), err);
      setErrorMessage('api.errors.changePassword');
    }
  };

  // highlight options by shades of yellow if they aequal to login's email or at least the domains are the same
  const highlightOptionByDomain = (option, email=undefined, className="") => {
    let highlight = "";
    if (email) {
      highlight = (email == option) ? " bg-warning bg-opacity-25" : ((email.match(option.split('@')[1])) ? " bg-warning bg-opacity-10" : "");
    }
    return className + highlight;
  };


  if (isLoading && !logins && !rolesAvailable) {
    return <LoadingSpinner />;
  }

            // getOptionLabel={rolesAvailable}    // requires a dict
                // placeholder={t('logins.roles2pick')}

  // Column definitions for existing logins table
  // adding hidden data in the span before the FormField let us sort also this column
  const columns = [
    { 
      key: 'email',
      label: 'logins.email',
      render: (login) => (
        <span><span className="d-none">{login.email}</span>
        <FormField
          type="email"
          id="email"
          name="email"
          value={getFieldValue(login.id, 'email')}
          onChange={(e) => handleLoginChange(e, login, "email", event.target.value)}
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
          onChange={(e) => handleLoginChange(e, login, "username", event.target.value)}
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
      /* only render linkAccount button when isAccount=0 if rolesAvailable.includes(login.email) */
      /* always render unlinkAccount button when isAccount=1 */
      ( login.isAccount || rolesAvailable.includes(login.email) ) &&
        <>
        <span>{(login.isAccount) ? t('common.yes') : t('common.no')}</span>
        <Button
          variant={(login.isAccount) ? "warning" : "info"}
          size="xs"
          icon={(login.isAccount) ? "person" : "inbox"}
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
                className={highlightOptionByDomain(option, login?.email, props.className)}
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
            title={t('logins.confirmDelete', { username: login.email })}
            onClick={() => handleLoginDelete(login)}
            className="me-2"
          />
          <Button
            variant="secondary"
            size="sm"
            icon={(login.isActive) ? "toggle-on" : "toggle-off"}
            title={(login.isActive) ? t('logins.deactivate', { username: login.email }) : t('logins.activate', { username: login.email })}
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

      {newLoginformData.isAccount && (
        <SelectField
          id="email"
          name="email"
          label="accounts.mailbox"
          value={pluck(accountOptions, 'value').includes(newLoginformData.email) ? newLoginformData.email : ""}
          onChange={handleNewLoginInputChange}
          options={accountOptions}
          placeholder="accounts.mailboxRequired"
          error={newLoginFormErrors.email}
          helpText="accounts.mailboxRequired"
          required
        />
      ) || (
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
            className={highlightOptionByDomain(option, newLoginformData?.email, props.className)}
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
          keyExtractor={(login) => login.email}
          isLoading={isLoading}
          emptyMessage="logins.noLogins"
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

export default Logins;
