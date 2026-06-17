import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  getValueFromArrayOfObj,
  pluck,
  regexUsername,
  regexEmailStrict,
} from '../../../common.mjs';

import {
  getLogins,
  addLogin,
  deleteLogin,
  updateLogin,
  getAccounts,
  updateAccount,
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
  const { user } = useAuth();   // {"id":1,"username":"adminn","email":"admin@dms-gui.com","isAdmin":1,"isActive":1,"isAccount":0,"mailserver":"dms","roles":[],"mailbox":"admin@dms-gui.com"}
  const navigate = useNavigate();
  const [containerName] = useLocalStorage("containerName", '');
  const [mailservers] = useLocalStorage("mailservers", []);

  // Common states -------------------------------------------------
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedLogin, setSelectedLogin] = useState(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  
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
  const isRowChanged = (id, currentEditedData = editedData) => {
    // debugLog('isRowChanged currentEditedData:', currentEditedData)
    return currentEditedData[id] !== undefined;
  };
  
  const removeIdFromEditedData = (idToRemove) => {
    // Compute the clean remaining data object upfront synchronously
    const nextEditedData = { ...editedData };
    delete nextEditedData[idToRemove]; // Safely drop the item from our local copy

    // debugLog('removeIdFromEditedData editedData:', editedData)
    setEditedData((prevData) => {
      // Destructure to separate the unwanted ID from the rest of the object
      const { [idToRemove]: _, ...remainingData } = prevData;
      
      // Return the new object to update the state and trigger a re-render
      return remainingData;
    });
    // debugLog('removeIdFromEditedData nextEditedData:', nextEditedData)
    return nextEditedData;
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
    mailserver: user?.mailserver,
    roles: [],
  });

  // errors must be initialized unfortunately, otherwise the save login button is never disabled
  const [newLoginFormErrors, setNewLoginFormErrors] = useState({
    mailserver: 'logins.mailserverRequired',
    username: 'logins.usernameRequired',
    mailbox: 'logins.emailRequired',
    email: 'logins.emailRequired',
    password: 'password.passwordRequired',
  });

  // State for save login button ----------------------------------
  // useEffect(() => {  // too laggy
  //   Object.keys(newLoginFormErrors).length === 0 ? setSubmitDisabled(false) : setSubmitDisabled(true);
  //   debugLog('Object.keys(newLoginFormErrors).length:', Object.keys(newLoginFormErrors).length)
  // }, [newLoginFormErrors]);
  const [submitDisabled, setSubmitDisabled] = useState(true);

  // State for password change modal -------------------------------
  const passwordFormRef = useRef(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordFormErrors, setPasswordFormErrors] = useState({});


  // filter out the mailbox dropdown entries that are already used in logins
  const filteredAccountOptions = useMemo(() => {
    return accountOptions.filter(option => 
      !logins.some(login => login.mailbox === option.value)
    );
  }, [logins, accountOptions]);


  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAll();
  }, [containerName]);

  const formatLoginsForTable = async (data, currentEditedData) => {
    debugLog('formatLoginsForTable currentEditedData:', currentEditedData)
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

    // add red color for edited
    data = data.map(login => { return { 
    ...login, 
    color:  (isRowChanged(login.id, currentEditedData)) ? login?.color+" text-danger" : login?.color,
    }; });

    return data;
  }

  const fetchAll = async () => {
    
    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      
      await Promise.all([
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
    // debugLog('ddebug containerName', containerName);

    try {
      const [accountsData] = await Promise.all([    // loginsData better have a uniq readOnly id field we can use, as we may modify each other fields
        // getAccounts(getValueFromArrayOfObj(mailservers, containerName, 'value', 'schema'), containerName),
        getAccounts(containerName),
      ]);
        debugLog('accountsData',accountsData)

      if (accountsData?.success) {
        debugLog('ddebug accountsData', accountsData);
        // { success: true,
        //   message: [
        //     { mailbox: "admin@aaa.com", domain: "aaa.com", username: "admin@aaa.com", storage: {} },
        //     { mailbox: "chloe@bbb.com", domain: "bbb.com", username: "chloe@bbb.com", storage: {} },
        //   ]
        // }

        // Prepare all account options for the select field; this will be trimmed down by fetchAll
        setAccountOptions(accountsData.message.map((account) => ({
          value: account.mailbox,
          label: account.mailbox,
        })));

        let mailboxes = (pluck(accountsData.message, 'mailbox', true, false));  // we keep only an array of uniq (true) mailbox names [box1@domain.com, ..], already sorted by domain and no extra sort (false)
        setRolesAvailable(mailboxes);
        debugLog('mailboxes',mailboxes)

      } else setErrorMessage(accountsData?.error);

    } catch (error) {
      errorLog(t('api.errors.fetchAccounts'), error);
      setErrorMessage('api.errors.fetchAccounts');
      
    }
  };

  const fetchLogins = async (currentEditedData = editedData) => {
    debugLog('fetchLogins currentEditedData:', currentEditedData)
    
    try {
      const [loginsData] = await Promise.all([    // loginsData better have a uniq readOnly id field we can use, as we may modify each other fields
        getLogins(),
      ]);

      if (loginsData?.success) {
        debugLog('loginsData', loginsData);
        // { success: true, 
        //   message: [
        //     { id: 1, username: "admin", mailbox: "admin@dms-gui.com", email: "admin@dms-gui.com", isAccount: 0, isActive: 1, isAdmin: 1, mailserver: "dms", roles: Array [] },
        //     { id: 2, username: "test", mailbox: "test@aaa.com", email: "test@xyz.com", isAccount: 0, isActive: 1, isAdmin: 1, mailserver: "dms", roles: Array [] },
        //   ]
        // }


        let loginsDataAltered = await formatLoginsForTable(loginsData.message, currentEditedData);
        debugLog('loginsDataAltered', loginsDataAltered);
        setLogins(loginsDataAltered);

      } else setErrorMessage(loginsData?.error);

    } catch (error) {
      errorLog(t('api.errors.fetchLogins'), error);
      setErrorMessage('api.errors.fetchLogins');
      
    }
  };


  const handleNewLoginInputChange = (e) => {
    const { name, value, type, checked } = e.target;    // { name: "isAccount", value: "on", type: "checkbox", checked: true }
    debugLog('{ name, value, type, checked }',{ name, value, type, checked });
    
    // special cases ------------------------------
    let jsonDict, inputValue;
    // Determine the actual value based on the element type
    // BUG FOUND:
    // type === 'checkbox' ? ((checked === true) ? 1 : 0) : value   ===> evaluates to "on"
    // This should evaluate to 1 when type is 'checkbox' and checked is true. 
    // The string "on" should be entirely bypassed.
    // If this function is still spitting out "on", it means the event triggering the function isn't what I think it is.
    // If the checkbox looks like <Checkbox /> or <Form.Check /> (which it is) instead of a raw HTML <input type="checkbox" />, 
    // these libraries don't pass a real HTML event to onChange.
    // Instead, they pass a custom synthetic event where:
      // e.target.type is often undefined or 'text' rather than 'checkbox'
      // e.target.value is overridden to pass the value string directly.

    if (type === 'checkbox') {
      inputValue = checked ? 1 : 0; // Directly assigns 1 or 0
    } else {
      inputValue = type === 'number' ? Number(value) : value; // Assigns the typed text string or resolve as a number
    }

    // selecting various checkboxes will alter other options and we also need to construct the roles array, so we will use a temporary dict
    jsonDict = {[name]: inputValue};

    // checkboxes will resolve to 0 or 1 and 1 is == true
    if (name == 'isAdmin' && checked) {
      debugLog('isAdmin ==> 1: disabling isAccount');
      // disable isAccount checkbox and SelectField
      jsonDict.isAccount = 0;
    }

    if (name == 'isAccount' && checked) {
      // test if the mailbox entered manually prior / chosen from the list is in the list, and select it as a role, otherwise start from scratch
      if (pluck(accountOptions, 'value').includes(newLoginformData.mailbox)) {
        debugLog(`isAccount ==> 1: adding ${newLoginformData.mailbox} to the roles`);
        jsonDict.roles = [newLoginformData.mailbox]

      } else {
        debugLog(`isAccount ==> 1: removing ${newLoginformData.mailbox} as it is NOT defined in available mailboxes`);
        // we MUST reset mailbox since it is not in the official list
        jsonDict.mailbox = '';
        jsonDict.roles = [];
      }
    }

    if (name == 'mailbox') {
      if (newLoginformData.isAccount) {
        // we are attached to a mailbox and user just chose it from the SelectField
        debugLog(`roles ==> [${inputValue}]`);
        jsonDict.roles = [inputValue];
      }
    }

    // Calculate the exact next state
    const updatedFormData = {
      ...newLoginformData,
      ...jsonDict
    };
    setNewLoginFormData(updatedFormData);
    debugLog('newLoginformData:', updatedFormData);

    // Clear the error for this field while typing // now done by validateNewLoginForm
    // if (newLoginFormErrors[name]) {
    //   setNewLoginFormErrors({
    //     ...newLoginFormErrors,
    //     [name]: null,
    //   });
    // }
    // validateNewLoginForm();  // this is delayed
    // Validate using the fresh data directly:

    // Update the button instantly using the fresh error object
    const freshErrors = validateNewLoginForm(updatedFormData);
    const hasErrors = Object.keys(freshErrors).length > 0;
    setSubmitDisabled(hasErrors);
    
  };

  const handleNewLoginRolesChange = (e, newValue) => {  // newValue is an arrey with all the options selected
    
    debugLog('newValue', newValue);
    debugLog('newLoginformData', newLoginformData);

    setNewLoginFormData({
      ...newLoginformData,
      roles: newValue
    });
    
  };

  const validateNewLoginForm = (currentFormData) => {
    let errors = {};

    if (!currentFormData.mailserver) {
      errors.mailserver = 'logins.mailserverRequired';
    }
    
    if (!currentFormData.username.trim()) {
      errors.username = 'logins.usernameRequired';

    } else if (!regexUsername.test(currentFormData.username.trim())) {
      errors.username = 'logins.usernameInvalid';
    }

    // this is done by react somehow but we need to also do it to release the save login button
    if (!currentFormData.mailbox.trim()) {
      errors.mailbox = 'logins.mailboxRequired';

    } else if (!regexEmailStrict.test(currentFormData.mailbox.trim())) {
      errors.mailbox = 'logins.mailboxInvalid';
    }

    // this is done by react somehow but we need to also do it to release the save login button
    if (!currentFormData.email.trim()) {
      errors.email = 'logins.emailRequired';

    } else if (!regexEmailStrict.test(currentFormData.email.trim())) {
      errors.email = 'logins.emailInvalid';
    }

    if (!currentFormData.password) {
      errors.password = 'password.passwordRequired';

    } else if (currentFormData.password.length < 8) {
      errors.password = 'password.passwordLength';

    } else if (currentFormData.password !== currentFormData.confirmPassword) {
      errors.confirmPassword = 'logins.passwordsNotMatch';
    }

    setNewLoginFormErrors(errors);
    debugLog('ddebug setNewLoginFormErrors errors:', errors)
    return errors;
  };


  const handleSubmitNewLogin = async (e) => {
    e.preventDefault();
    setSuccessMessage(null);

    // no need anymore since validateNewLoginForm is done after each change
    // if (!validateNewLoginForm()) {
    //   return;
    // }

    try {
      const result = await addLogin(
        newLoginformData.mailbox,
        newLoginformData.username,
        newLoginformData.password,
        newLoginformData.email,
        newLoginformData.isAdmin,
        newLoginformData.isAccount,
        newLoginformData.isActive,
        newLoginformData.mailserver,
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
          mailserver: '',
          roles: [],
        });
        fetchAll(); // Refresh the logins list
        
      } else setErrorMessage(result?.error);
      
    } catch (error) {
      errorLog(t('api.errors.addLogin'), error.message);
      setErrorMessage('api.errors.addLogin', error.message);
    }
  };



  const handleLoginChange = (e, login, key, newValue) => {  // newValue is an arrey with all the options selected
    
    debugLog('login', login);                                       // { id: 1, mailbox: "admin@domain.com", username: "admin", isAdmin: 1, isActive: 1, color: "" }
    debugLog('key', key);                                           // roles, emails, username...
    debugLog('editedData (prev)    ', editedData);                  // { 1:{username: "admin"}, .. }
    debugLog('editedData (newValue)', newValue);                    // "adminn"
    debugLog(`isRowChanged(${login.id}):`, isRowChanged(login.id)); // isRowChanged(1) true
    
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

    // reflect changes in the table row
    setLogins(prevLogins =>
      prevLogins.map(item =>
        item.id === login.id                                      // for that login...
          ? { ...item, color: `${item.color || ''} text-danger` } // add color class
          : item                                                  // and keep other items as they are
      )
    );

  };


  // const handleLoginDelete = async (login) => {
  //   setErrorMessage(null);
  //   setSuccessMessage(null);

  //   if (window.confirm(t('logins.confirmDelete', { username:login.username }))) {
  //     try {
  //       const result = await deleteLogin(login.id);
  //       if (result.success) {
  //         setSuccessMessage('logins.loginDeleted');
  //         fetchAll(); // Refresh the logins list
          
  //       } else setErrorMessage(result?.error);
        
  //     } catch (error) {
  //       errorLog(t('api.errors.deleteLogin'), error.message);
  //       setErrorMessage('api.errors.deleteLogin', error.message);
  //     }
  //   }
  // };


  const handleConfirmDeleteLogin = async (login) => {
    setSelectedLogin(login);
    setShowDeleteConfirmModal(true);
  };

  // Handles the actual deletion after confirmation from the modal
  const handleDeleteLoginModal = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await deleteLogin(setSelectedLogin.id);
      if (result.success) {
        setLogins(reduxArrayOfObjByValue(logins, 'id', setSelectedLogin.id, true));
        removeIdFromEditedData(setSelectedLogin.id);
        setSuccessMessage('logins.loginDeleted');
        
      } else {
        setErrorMessage(result?.error);
      }
    } catch (error) {
      errorLog(t('api.errors.deleteLogin'), error.message);
      setErrorMessage('api.errors.deleteLogin', error.message);

    } finally {
      handleCloseDeleteConfirmModal();
    }
  };

  // Closes the delete confirmation modal
  const handleCloseDeleteConfirmModal = () => {
    setShowDeleteConfirmModal(false);
    setSelectedLogin(null);
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
        login.id,
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
        
      } else setErrorMessage(result?.error);
      
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
      // moveKeyToLast(editedData[login.id], 'mailbox')   // no need anymore we use id instead
      const result = await updateLogin(
        login.id,
        editedData[login.id]
      );
      debugLog('result:', result);

      if (result.success) {
        // TODO: handle individual change failure
        
        setSuccessMessage(t('logins.saved', {username:login.mailbox}));

        // if you modified yourself, logout immediately since we cannot reflect the changes in the token nor the profile dynamically
        if (login.id == user.id) {
          setTimeout(() => {
            navigate("/login");
          }, 2000);
        }
        
        // remove that id from editedData object
        let nextEditedData = removeIdFromEditedData(login.id);

        // reload table with remaining editedData if any
        await fetchLogins(nextEditedData);

      } else setErrorMessage(result?.error);
      
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

    let result = {success:false, message: ''};
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


  if (isLoading || !user?.isAdmin) {
    return <LoadingSpinner />;
  }

            // getOptionLabel={rolesAvailable}    // requires a dict
                // placeholder={t('logins.roles2pick')}

//   ░██████             ░██                                                  
//  ░██   ░██            ░██                                                  
// ░██         ░███████  ░██ ░██    ░██ ░█████████████  ░████████   ░███████  
// ░██        ░██    ░██ ░██ ░██    ░██ ░██   ░██   ░██ ░██    ░██ ░██        
// ░██        ░██    ░██ ░██ ░██    ░██ ░██   ░██   ░██ ░██    ░██  ░███████  
//  ░██   ░██ ░██    ░██ ░██ ░██   ░███ ░██   ░██   ░██ ░██    ░██        ░██ 
//   ░██████   ░███████  ░██  ░█████░██ ░██   ░██   ░██ ░██    ░██  ░███████  

  // Column definitions for existing logins table
  // adding hidden data in the span before the FormField let us sort also this column
  const columns = [
    { 
      key: 'mailbox',
      label: 'logins.mailbox',
      render: (login) => (
        <>
        <span className="d-none">{login.mailbox}</span>
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
        </>
      ),
    },
    { 
      key: 'username',
      label: 'logins.username',
      render: (login) => (
        <>
        <span className="d-none">{login.username}</span>
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
        </>
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
            title={(login.isAdmin) ? t('password.changeLocalPassword') : t('password.changeMailboxPassword') }
            onClick={() => handleChangePassword(login)}
            className="me-2"
          />
          <Button
            variant="danger"
            size="sm"
            icon="trash"
            title={t('logins.confirmDelete', { username: login.mailbox })}
            onClick={() => handleConfirmDeleteLogin(login)}
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


// ░██████████                                    ░███    ░██                              ░██                               ░██           
// ░██                                            ░████   ░██                              ░██                                             
// ░██         ░███████  ░██░████ ░█████████████  ░██░██  ░██  ░███████  ░██    ░██    ░██ ░██          ░███████   ░████████ ░██░████████  
// ░█████████ ░██    ░██ ░███     ░██   ░██   ░██ ░██ ░██ ░██ ░██    ░██ ░██    ░██    ░██ ░██         ░██    ░██ ░██    ░██ ░██░██    ░██ 
// ░██        ░██    ░██ ░██      ░██   ░██   ░██ ░██  ░██░██ ░█████████  ░██  ░████  ░██  ░██         ░██    ░██ ░██    ░██ ░██░██    ░██ 
// ░██        ░██    ░██ ░██      ░██   ░██   ░██ ░██   ░████ ░██          ░██░██ ░██░██   ░██         ░██    ░██ ░██   ░███ ░██░██    ░██ 
// ░██         ░███████  ░██      ░██   ░██   ░██ ░██    ░███  ░███████     ░███   ░███    ░██████████  ░███████   ░█████░██ ░██░██    ░██ 
//                                                                                                                       ░██               
//                                                                                                                 ░███████                

  const FormNewLogin = (
    <Form onSubmit={handleSubmitNewLogin} className="form-wrapper">
      <FormField
        type="checkbox"
        id="isAdmin"
        name="isAdmin"
        label="logins.isAdmin"
        onChange={handleNewLoginInputChange}
        error={newLoginFormErrors.isAdmin}
        isChecked={newLoginformData.isAdmin}
      />

      <FormField
        type="checkbox"
        id="isAccount"
        name="isAccount"
        label="logins.isAccountChoice"
        onChange={handleNewLoginInputChange}
        error={newLoginFormErrors.isAccount}
        isChecked={newLoginformData.isAccount && !newLoginformData.isAdmin}
        disabled={newLoginformData.isAdmin}
      />

      <SelectField
        id="mailserver"
        name="mailserver"
        label="logins.mailserver"
        value={containerName}
        onChange={handleNewLoginInputChange}
        options={mailservers}
        placeholder="logins.mailserverRequired"
        error={newLoginFormErrors.mailserver}
        helpText="logins.mailserverRequired"
        required
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

      {newLoginformData.isAccount && (
        <SelectField
          id="mailbox"
          name="mailbox"
          label="accounts.mailbox"
          value={pluck(filteredAccountOptions, 'value').includes(newLoginformData.mailbox) ? newLoginformData.mailbox : ""}
          onChange={handleNewLoginInputChange}
          options={filteredAccountOptions}
          placeholder="accounts.mailboxRequired"
          error={(filteredAccountOptions.length) ? newLoginFormErrors.mailbox : t('logins.mailboxNothingToPick')}
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
        onChange={handleNewLoginInputChange}
        error={newLoginFormErrors.isActive}
        isChecked={newLoginformData.isActive}
      />

      <Button
        type="submit"
        variant="primary"
        text="logins.addLogin"
        disabled={submitDisabled}
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
  

  // ░██████████           ░██                   
  //   ░██               ░██                   
  //   ░██     ░██████   ░████████   ░███████  
  //   ░██          ░██  ░██    ░██ ░██        
  //   ░██     ░███████  ░██    ░██  ░███████  
  //   ░██    ░██   ░██  ░███   ░██        ░██ 
  //   ░██     ░█████░██ ░██░█████   ░███████  
                                            

  // https://icons.getbootstrap.com/
  const loginTabs = [
    { id: 1, 
      title: "logins.existingLogins",
      titleExtra: `(${logins.length})`, 
      icon: "person-lines-fill", 
      onClickRefresh: () => fetchAll(), 
      content: DataTableLogins 
    },
    { id: 2, 
      title: "logins.newLogin",
      icon: "person-fill-add",
      content: FormNewLogin
    },
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

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteConfirmModal} onHide={handleCloseDeleteConfirmModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {/* selectedLogin is null by default, must use ? */}
            {(selectedLogin && selectedLogin.admin) ? Translate('logins.confirmDeleteTitle') : Translate('logins.confirmDeleteTitle') - selectedLogin?.mailbox}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{Translate('logins.confirmDeleteBody')}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={handleCloseDeleteConfirmModal}
            text="common.cancel"
          />
          <Button
            variant="danger"
            onClick={handleDeleteLoginModal}
            text="logins.deleteLogin"
          />
        </Modal.Footer>
      </Modal>
      
      {/* Password Change Modal using react-bootstrap */}
      <Modal show={showPasswordModal} onHide={handleClosePasswordModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {(selectedLogin && selectedLogin.admin) ? Translate('password.changePassword') : Translate('password.changePassword') - selectedLogin?.mailbox}
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
