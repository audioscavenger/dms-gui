import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from 'react-bootstrap/Modal'; // Import Modal
import ProgressBar from 'react-bootstrap/ProgressBar'; // Import ProgressBar

// https://mui.com/material-ui/react-autocomplete/#multiple-values
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

import {
  plucks,
  isNonEmptyDict,
} from '../../../common.mjs';
import {
  debugLog,
  errorLog,
} from '../../frontend.mjs';
import {
//   regexColors,
//   regexPrintOnly,
//   regexFindEmailStrict,
  regexEmailStrict,
//   regexMatchPostfix,
//   regexUsername,
//   funcName,
//   fixStringType,
//   arrayOfStringToDict,
//   obj2ArrayOfObj,
//   reduxArrayOfObjByKey,
  reduxArrayOfObjByValue,
//   reduxPropertiesOfObj,
//   mergeArrayOfObj,
  getValueFromArrayOfObj,
//   getValuesFromArrayOfObj,
//   pluck,
//   byteSize2HumanSize,
//   humanSize2ByteSize,
//   moveKeyToLast,
} from '../../../common.mjs';

import {
  getAccounts,
  getDomains,
  getServerEnvs,
  addAccount,
  deleteAccount,
  updateDNS,
  updateAccount,
  doveadm,
} from '../services/api.mjs';

import {
  AlertMessage,
  Accordion,
  Button,
  DataTable,
  FormField,
  LoadingSpinner,
  Translate,
} from '../components';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';

const Accounts = () => {
  const sortKeysInObject = ['percent'];
  const { t } = useTranslation();
  const { user } = useAuth();
  const [containerName] = useLocalStorage("containerName", '');
  const [mailservers] = useLocalStorage("mailservers", []);

  const [accounts, setAccounts] = useLocalStorage("accounts", []);
  // [
    // { domain: "aaa.com", mailbox: "eric@aaa.com", username: "eric@aaa.com", storage: { used: "565M", total: "5.2G", percent: "10" } }
    // { domain: "bbb.com", mailbox: "admin@bbb.com", username: "admin@bbb.com", storage: { used: "0M", total: "5.2G", percent: "0" } }

  const [DOVECOT_FTS, setDOVECOT_FTS] = useState(0);

  // Common states -------------------------------------------------
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  // Roles states -------------------------------------------------- // https://mui.com/material-ui/react-autocomplete/#multiple-values
  const [rolesAvailable, setRolesAvailable] = useState([]);
  
  // State for new new account inputs ------------------------------
  const newAccountformDataINIT = {
    mailbox: '',
    password: '',
    confirmPassword: '',
    createLogin: 1,
  };
  const [newAccountformData, setNewAccountFormData] = useState(newAccountformDataINIT);
  const [newAccountFormErrors, setNewAccountFormErrors] = useState({});
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // State for password change modal -------------------------------
  const passwordFormRef = useRef(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordFormErrors, setPasswordFormErrors] = useState({});

  // State for DNS change modal ------------------------------------
  const dnsFormRef = useRef(null);
  const [showDNSModal, setShowDNSModal] = useState(false);
  const [dnsFormData, setDNSFormData] = useState({});
  const [dnsFormErrors, setDNSFormErrors] = useState({});


  const fetchAll = async (refresh=false) => {

    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      setRolesAvailable([]);
      
      await Promise.all([
        fetchAccounts(refresh),
        fetchDOVECOT_FTS(),
      ]);

    } catch (error) {
      // each fetch has its own error handling

    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async (refresh=false) => {
    refresh = !user.isAdmin ? false : refresh;
    
    try {
      // const [accountsData, DOVECOT_FTSdata] = await Promise.all([
      //   getAccounts(containerName, refresh),
      //   getServerEnvs('mailserver', containerName, refresh, 'DOVECOT_FTS'),
      // ]);
      const accountsData = await getAccounts(containerName, refresh);
      if (accountsData?.success) {
        debugLog('ddebug accountsData', accountsData);
        setAccounts(accountsData.message);
        // also set managers available for the disabled selector
        setRolesAvailable(plucks(accountsData.message, 'managers', false));

      } else setErrorMessage(accountsData?.error);

    } catch (error) {
      errorLog(t('api.errors.fetchAccounts'), error);
      // setErrorMessage(t('api.errors.fetchAccounts'), ": ", error);
      setErrorMessage({key: 'api.errors.fetchAccounts', values: { error: error.message }});
    }
  };

  const fetchDOVECOT_FTS = async (refresh=false) => {
    refresh = !user.isAdmin ? false : refresh;
    
    try {
      const DOVECOT_FTSdata = await getServerEnvs('mailserver', containerName, refresh, 'DOVECOT_FTS');
      debugLog('ddebug DOVECOT_FTSdata', DOVECOT_FTSdata);
      if (DOVECOT_FTSdata?.success) {
        setDOVECOT_FTS(DOVECOT_FTSdata.message);
        
      } else setErrorMessage(DOVECOT_FTSdata?.error);

    } catch (error) {
      errorLog(t('api.errors.fetchServerEnvs'), error);
      // setErrorMessage(t('api.errors.fetchServerEnvs'), ": ", error);
      setErrorMessage({key: 'api.errors.fetchServerEnvs', values: { error: error.message }});
    }
  };

  const handleNewAccountInputChange = (e) => {
    const { name, value, type, checked } = e.target; // Destructure 'checked'
    
    let inputValue;
    if (type === 'checkbox') {
      inputValue = checked ? 1 : 0; // Assign 1 or 0 based on checked state
    } else {
      inputValue = type === 'number' ? Number(value) : value;
    }
    setNewAccountFormData({
      ...newAccountformData,
      [name]: inputValue,
    });

    // Clear the error for this field while typing
    if (newAccountFormErrors[name]) {
      setNewAccountFormErrors({
        ...newAccountFormErrors,
        [name]: null,
      });
    }
  };

  const validateNewAccountForm = () => {
    const errors = {};

    if (!newAccountformData.mailbox.trim()) {
      errors.mailbox = 'accounts.mailboxRequired';
    } else if (!regexEmailStrict.test(newAccountformData.mailbox)) {
      errors.mailbox = 'accounts.invalidMailbox';
    }

    if (!newAccountformData.password) {
      errors.password = 'password.passwordRequired';
    } else if (newAccountformData.password.length < 8) {
      errors.password = 'password.passwordLength';
    }

    if (newAccountformData.password !== newAccountformData.confirmPassword) {
      errors.confirmPassword = 'password.passwordsNotMatch';
    }

    setNewAccountFormErrors(errors);
    return !isNonEmptyDict(errors);
  };

  const handleSubmitNewAccount = async (e) => {
    e.preventDefault();
    setSuccessMessage(null);

    if (!validateNewAccountForm()) {
      return;
    }

    try {
      const result = await addAccount(
        getValueFromArrayOfObj(mailservers, containerName, 'value', 'schema'), 
        containerName,
        newAccountformData.mailbox,
        newAccountformData.password,
        newAccountformData.createLogin,
      );
      if (result.success) {
        setNewAccountFormData(newAccountformDataINIT);

        fetchAccounts(); // Refresh the accounts list fast, since getAccounts will do the work in the backend, we don't bother adding a manually crafted data line in current DataTable state
        setSuccessMessage('accounts.accountCreated');
        
      } else setErrorMessage(result?.error);
      
    } catch (error) {
      errorLog(t('api.errors.addAccount'), error.message);
      // setErrorMessage('api.errors.addAccount', error.message);
      setErrorMessage({key: 'api.errors.addAccount', values: { error: error.message }});
    }
  };


  // Handle alsoDeleteLogin checkbox
  const handleAlsoDeleteLoginInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    debugLog('{ name, value, type, checked }',{ name, value, type, checked });
    
    let inputValue;
    // Determine the actual value based on the element type
    if (type === 'checkbox') {
      inputValue = checked ? 1 : 0; // Directly assigns 1 or 0
      
      let updatedSelectedAccount = {
        ...selectedAccount,
        [name]: inputValue
      };
      setSelectedAccount(updatedSelectedAccount);
    
    } // ignore anything else
  };

  const handleConfirmDeleteAccount = async (account) => {
    setSelectedAccount(account);
    setShowDeleteConfirmModal(true);
  };

  // Handles the actual deletion after confirmation from the modal
  const handleDeleteAccountModal = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await deleteAccount(getValueFromArrayOfObj(mailservers, containerName, 'value', 'schema'), containerName, selectedAccount.mailbox, !!selectedAccount?.alsoDeleteLogin);
      // debugLog('ddebug deleteAccount result', result)
      if (result.success) {
        setAccounts(reduxArrayOfObjByValue(accounts, 'mailbox', selectedAccount.mailbox, true));
        setSuccessMessage('accounts.accountDeleted');
        
      } else {
        setErrorMessage(result?.error);
      }
    } catch (error) {
      errorLog(t('api.errors.deleteAccount'), error.message);
      // setErrorMessage('api.errors.deleteAccount', error.message);
      setErrorMessage({key: 'api.errors.deleteAccount', values: { error: error.message }});

    } finally {
      handleCloseDeleteConfirmModal();
    }
  };

  // Closes the delete confirmation modal
  const handleCloseDeleteConfirmModal = () => {
    setShowDeleteConfirmModal(false);
    setSelectedAccount(null);
  };


  const handleDoveadm = async (command, mailbox) => {
    setErrorMessage(null);
    
    try {
      const result = await doveadm(getValueFromArrayOfObj(mailservers, containerName, 'value', 'schema'), containerName, command, mailbox);
      debugLog('result',result);
      if (result.success) {
        // setSuccessMessage('accounts.doveadmExecuted');
        setSuccessMessage(result.message);
      
      } else setErrorMessage(result?.error);
      
    } catch (error) {
      errorLog(t('api.errors.doveadm'), error.message);
      // setErrorMessage('api.errors.doveadm', error.message);
      setErrorMessage({key: 'api.errors.doveadm', values: { error: error.message }});
    }
  };



  // Open password change modal for an account
  const handleChangePassword = (account) => {
    setSelectedAccount(account);
    
    setPasswordFormData({
      newPassword: '',
      confirmPassword: '',
    });
    setShowPasswordModal(true);
  };

  // Close password change modal
  const handleClosePasswordModal = () => {
    setPasswordFormErrors({});
    setShowPasswordModal(false);
    setSelectedAccount(null);
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
    } else if (!user.isAdmin && passwordFormData.newPassword.length < 8) {
      errors.newPassword = 'password.passwordLength';
    }

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      errors.confirmPassword = 'password.passwordsNotMatch';
    }

    setPasswordFormErrors(errors);
    return !isNonEmptyDict(errors);
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

      result = await updateAccount(
        getValueFromArrayOfObj(mailservers, containerName, 'value', 'schema'), 
        containerName,
        selectedAccount.mailbox,
        { password: passwordFormData.newPassword }
      );
      if (result.success) {
        result.message = t('password.passwordUpdated', {key:'mailbox', value:selectedAccount.mailbox});
        
      } else setErrorMessage(result?.error);
      
    } catch (error) {
      errorLog(t('api.errors.changePassword'), error);
      // setErrorMessage('api.errors.changePassword');
      setErrorMessage({key: 'api.errors.changePassword', values: { error: error.message }});

    } finally {
      if (result.success) setSuccessMessage(result.message);
      handleClosePasswordModal(); // Close the modal
    }

  };
  
  
  
  // Open DNS change modal for an account
  const handleChangeDNS = (account) => {
    setSelectedAccount(account);
    setPasswordFormData({
      newPassword: '',
      confirmPassword: '',
    });
    setDNSFormErrors({});
    setShowDNSModal(true);
  };

  // Close password change modal
  const handleCloseDNSModal = () => {
    setShowDNSModal(false);
    setSelectedAccount(null);
  };

  // Handle input changes for password change form
  const handleDNSInputChange = (e) => {
    const { name, value, type } = e.target;
    setDNSFormData({
      ...dnsFormData,
      [name]: type === 'number' ? Number(value) : value,
    });

    // Clear the error for this field while typing
    if (dnsFormErrors[name]) {
      setDNSFormErrors({
        ...dnsFormErrors,
        [name]: null,
      });
    }
  };

  // Validate DNS change form
  const validateDNSForm = () => {
    const errors = {};

    setDNSFormErrors(errors);
    return !isNonEmptyDict(errors);
  };

  // Submit password change
  const handleSubmitDNSChange = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validateDNSForm()) {
      return;
    }

    try {
      await updateDNS(
        selectedAccount.domain,
        passwordFormData.newPassword
      );
      setSuccessMessage('accounts.dnsUpdated');
      handleCloseDNSModal(); // Close the modal

    } catch (error) {
      errorLog(t('api.errors.updateDNS'), error);
      // setErrorMessage('api.errors.updateDNS');
      setErrorMessage({key: 'api.errors.updateDNS', values: { error: error.message }});
    }
  };

  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAll();
  // }, [mailservers, containerName]);
  // }, [mailservers, containerName, fetchAll]);   // eslint fix 2
  }, [mailservers, containerName]);   // eslint fix 2 lied to me


  if (isLoading) {
    return <LoadingSpinner />;
  };
  
  // Column definitions for existing accounts table
  const columns = [
    { 
      key: 'domain',
      label: 'accounts.domain',
      render: (account) => (
        <>
          <span>{account.domain}</span>
          {user.isAdmin == 1 && (
            <Button
              variant="info"
              size="sm"
              icon="globe"
              title={t('accounts.manageDNS')}
              onClick={() => handleChangeDNS(account)}
              className="me-2 float-end"
            />
          )}
        </>
      ),
    },
    { 
      key: 'mailbox',
      label: 'accounts.mailbox',
    },
    { 
      key: 'username',
      label: 'logins.login',
    },
    { 
      key: 'managers',
      label: 'accounts.managers',
      noSort: true,
      render: (account) => (
        <>
        <Autocomplete
          multiple
          id="managers"
          size="small"
          options={rolesAvailable}
          filterSelectedOptions
          disabled
          
          value={account.managers}
          renderOption={(props, option) => (
            <li
              {...props}
              key={option}
            >
            {option}
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              sx={{ minWidth: 0 }}
              label={t('accounts.managers')}
            />
          )}
        />
        </>
      ),
    },
    {
      key: 'storage',
      label: 'accounts.storage',
      noFilter: true,
      render: (account) =>
        account.storage ? (
          <div>
            <div>
              {account.storage.used} / {account.storage.total}
            </div>
            {/* Use ProgressBar component */}
            <ProgressBar
              now={parseInt(account.storage.percent)}
              style={{ height: '5px' }}
              className="mt-1"
            />
          </div>
        ) : (
          <span>N/A</span>
        ),
    },
    {
      key: 'actions',
      label: 'common.actions',
      noSort: true,
      noFilter: true,
      render: (account) => (
        <div className="d-flex">
          <Button
            variant="primary"
            size="sm"
            icon="key"
            title={t('password.changePassword')}
            onClick={() => handleChangePassword(account)}
            className="me-2"
          />
          {user.isAdmin == 1 &&
            <Button
              variant="danger"
              size="sm"
              icon="trash"
              title={t('accounts.confirmDelete', { mailbox: account.mailbox })}
              onClick={() => handleConfirmDeleteAccount(account)}
              className="me-2"
            />
          }
          {DOVECOT_FTS && (
          <Button
            variant="warning"
            size="sm"
            icon="stack-overflow"
            title={t('accounts.index')}
            onClick={() => handleDoveadm('index', account.mailbox)}
            className="me-2"
          />
          )}
          <Button
            variant="warning"
            size="sm"
            icon="arrow-repeat"
            title={t('accounts.forceResync')}
            onClick={() => handleDoveadm('forceResync', account.mailbox)}
            className="me-2"
          />
          <Button
            variant="info"
            size="sm"
            icon="bar-chart-fill"
            title={t('accounts.mailboxStatus')}
            onClick={() => handleDoveadm('mailboxStatus', account.mailbox)}
            className="me-2"
          />
        </div>
      ),
    },
  ];


  const FormNewAccount = (
          <form onSubmit={handleSubmitNewAccount} className="form-wrapper">
            <div>
              <FormField
                type="email"
                id="mailbox"
                name="mailbox"
                label="accounts.mailbox"
                value={newAccountformData.mailbox}
                onChange={handleNewAccountInputChange}
                maxLength={254}
                groupClass="mb-0" // Removed margin so the badge sits cleanly right under the input field
                placeholder="user@domain.com"
                error={newAccountFormErrors.mailbox}
                required
              />
              
              {/* The Live Character Counter Badge */}
              <div className="text-end small mb-2" style={{ marginTop: "-2px" }}>
                <span className={newAccountformData.mailbox?.length >= 200 ? "text-danger fw-bold" : "text-muted"}>
                  {newAccountformData.mailbox?.length || 0}/254
                </span>
              </div>
            </div>

            <FormField
              type="password"
              id="password"
              name="password"
              label="password.password"
              value={newAccountformData.password}
              onChange={handleNewAccountInputChange}
              error={newAccountFormErrors.password}
              required
            />

            <FormField
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              label="password.confirmPassword"
              value={newAccountformData.confirmPassword}
              onChange={handleNewAccountInputChange}
              error={newAccountFormErrors.confirmPassword}
              required
            />

            <FormField
              type="checkbox"
              id="createLogin"
              name="createLogin"
              label="accounts.createLogin"
              value={newAccountformData.createLogin}
              onChange={handleNewAccountInputChange}
              error={newAccountFormErrors.createLogin}
              isChecked={newAccountformData.createLogin}
            />

            <Button
              type="submit"
              variant="primary"
              text="accounts.addAccount"
            />
          </form>
  );
  
  const DataTableAccounts = (
            <DataTable
            columns={columns}
            data={accounts}
            keyExtractor={(account) => account.mailbox}
            isLoading={isLoading}
            emptyMessage="accounts.noAccounts"
            sortKeysInObject={sortKeysInObject}
            />
  );
  
  const accountTabs = [
    { id: 1, 
      title: "accounts.existingAccounts",  
      titleExtra: `(${accounts.length})`, 
      icon: "inboxes-fill", 
      onClickRefresh: () => fetchAccounts(true), 
      titleRefresh: t('common.forceResync'), 
      content: DataTableAccounts },
  ];
  if (user.isAdmin) accountTabs.push({ id: 2, title: "accounts.newAccount",        icon: "inbox", content: FormNewAccount });

  // BUG: passing defaultActiveKey to Accordion as string does not activate said key, while setting it up as "1" in Accordion also does not
  // icons: https://icons.getbootstrap.com/
  return (
    <div>
      <h2 className="mb-4">{Translate('accounts.title')} {t('common.forWhat', {what:containerName})}</h2>
      
      <AlertMessage type="danger" message={errorMessage} />
      <AlertMessage type="success" message={successMessage} />
      
      <Accordion tabs={accountTabs}>
      </Accordion>

      {/* Password Change Modal */}
      <Modal show={showPasswordModal} onHide={handleClosePasswordModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {/* selectedAccount is null by default, must use ? */}
            {Translate('password.changePassword')}: {selectedAccount?.mailbox}{' '}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
        </Modal.Body>
        <Modal.Footer>
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

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteConfirmModal} onHide={handleCloseDeleteConfirmModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {/* selectedAccount is null by default, must use ? */}
            {Translate('accounts.confirmDeleteTitle')}: {selectedAccount?.mailbox}{' '}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{Translate('accounts.confirmDeleteBody')}</p>
          {selectedAccount && ( // Ensure selectedAccount exists before rendering form
            <>
              {!!selectedAccount?.username && ( // Ensure selectedAccount has a login attached
                <FormField
                  type="checkbox"
                  id="alsoDeleteLogin"
                  name="alsoDeleteLogin"
                  label="accounts.confirmAlsoDeleteLogin"
                  onChange={handleAlsoDeleteLoginInputChange}
                  isChecked={!!selectedAccount?.alsoDeleteLogin}
                />
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={handleCloseDeleteConfirmModal}
            text="common.cancel"
          />
          <Button
            variant="danger"
            onClick={handleDeleteAccountModal}
            text="accounts.deleteAccount"
          />
        </Modal.Footer>
      </Modal>
      
      {/* DNS Modal */}
      <Modal show={showDNSModal} onHide={handleCloseDNSModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {/* selectedAccount is null by default, must use ? */}
            {Translate('accounts.manageDNS')} - {selectedAccount?.domain}{' '}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleSubmitDNSChange} ref={dnsFormRef}>
            TBD
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={handleCloseDNSModal}
            text="common.cancel"
          />
          <Button
            variant="primary"
            onClick={handleSubmitDNSChange}
            text="accounts.updateDNS"
          />
        </Modal.Footer>
      </Modal>
      
    </div>
  );
};

export default Accounts;
