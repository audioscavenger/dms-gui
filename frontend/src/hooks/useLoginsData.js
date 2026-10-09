import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  debugLog,
  errorLog,
} from '../frontend.mjs';
import {
  plucks,
  reduxArrayOfObjByValue,
} from '../../../common.mjs';
import {
  getLogins,
  deleteLogin,
  updateLogin,
  getAccounts,
} from '../services/api.mjs';

/**
 * Core data hook for the Logins page.
 * Owns: logins, editedData, accounts, roles, loading, messages,
 *       delete-confirm modal, and all table actions.
 *
 * @param {object}  opts
 * @param {string}  opts.containerName  – current mailserver container
 * @param {object}  opts.user          – authenticated user from useAuth()
 */
export default function useLoginsData({ containerName, user }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Common states -------------------------------------------------
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedLogin, setSelectedLogin] = useState({});
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

  // ── formatting ──────────────────────────────────────────────

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

  // ── fetching ────────────────────────────────────────────────

  const fetchAll = async () => {

    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      setLogins([]);
      setEditedData({});
      setAccountOptions([]);
      setRolesAvailable([]);
      setSelectedLogin({});
      setShowDeleteConfirmModal(false);

      await Promise.all([
        fetchAccounts(),
        fetchLogins({}),
      ]);

    } catch (error) {
      errorLog(t('api.errors.fetchLogins'), error);
      // setErrorMessage('api.errors.fetchLogins');
      setErrorMessage({key: 'api.errors.fetchLogins', values: { error: error.message }});

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

        let mailboxes = (plucks(accountsData.message, 'mailbox', false));  // we keep only an array of uniq (true) mailbox names [box1@domain.com, ..], already sorted by domain and no extra sort (false)
        setRolesAvailable(mailboxes);
        debugLog('mailboxes',mailboxes)

      } else setErrorMessage(accountsData?.error);

    } catch (error) {
      errorLog(t('api.errors.fetchAccounts', {error:error.message}));
      // setErrorMessage('api.errors.fetchAccounts');
      setErrorMessage({key: 'api.errors.fetchAccounts', values: { error: error.message }});

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
      // setErrorMessage('api.errors.fetchLogins');
      setErrorMessage({key: 'api.errors.fetchLogins', values: { error: error.message }});

    }
  };

  // ── table actions ───────────────────────────────────────────

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


  // ── delete modal ────────────────────────────────────────────

  // Handle alsoDeleteMailbox checkbox
  const handleAlsoDeleteMailboxInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    debugLog('{ name, value, type, checked }',{ name, value, type, checked });

    let inputValue;
    // Determine the actual value based on the element type
    if (type === 'checkbox') {
      inputValue = checked ? 1 : 0; // Directly assigns 1 or 0

      let updatedSelectedLogin = {
        ...selectedLogin,
        [name]: inputValue
      };
      setSelectedLogin(updatedSelectedLogin);

    } // ignore anything else
  };

  const handleConfirmDeleteLogin = async (login) => {
    setSelectedLogin(login);
    setShowDeleteConfirmModal(true);
  };

  // Handles the actual deletion after confirmation from the modal
  const handleDeleteLoginModal = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      debugLog('selectedLogin:', selectedLogin);
      const result = await deleteLogin(selectedLogin.id, !!selectedLogin?.alsoDeleteMailbox);
      if (result.success) {
        setLogins(reduxArrayOfObjByValue(logins, 'id', selectedLogin.id, true));
        removeIdFromEditedData(selectedLogin.id);
        setSuccessMessage('logins.loginDeleted');

      } else {
        setErrorMessage(result?.error);
      }
    } catch (error) {
      errorLog(t('api.errors.deleteLogin'), error.message);
      // setErrorMessage('api.errors.deleteLogin');
      setErrorMessage({key: 'api.errors.deleteLogin', values: { error: error.message }});

    } finally {
      handleCloseDeleteConfirmModal();
    }
  };

  // Closes the delete confirmation modal
  const handleCloseDeleteConfirmModal = () => {
    setShowDeleteConfirmModal(false);
    setSelectedLogin(null);
  };


  // ── flip bit (isAdmin / isAccount / isActive) ───────────────

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
      // setErrorMessage('api.errors.updateLogin', error.message);
      setErrorMessage({key: 'api.errors.updateLogin', values: { error: error.message }});
    }
  };


  // ── save edited row ─────────────────────────────────────────

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
        // setErrorMessage('api.errors.updateLogin', error.message);
        setErrorMessage({key: 'api.errors.updateLogin', values: { error: error.message }});
    }
  };

  // ── public API ──────────────────────────────────────────────

  return {
    // state
    logins,
    editedData,
    accountOptions,
    rolesAvailable,
    isLoading,
    errorMessage,
    successMessage,
    selectedLogin,
    showDeleteConfirmModal,
    // row helpers
    getFieldValue,
    isRowChanged,
    // fetching
    fetchAll,
    fetchAccounts,
    fetchLogins,
    // table actions
    handleLoginChange,
    handleLoginFlipBit,
    handleLoginSave,
    // delete modal
    handleConfirmDeleteLogin,
    handleDeleteLoginModal,
    handleCloseDeleteConfirmModal,
    handleAlsoDeleteMailboxInputChange,
  };
}
