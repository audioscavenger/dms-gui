import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  debugLog,
  errorLog,
} from '../../frontend.mjs';
import {
//   regexColors,
//   regexPrintOnly,
//   regexFindEmailRegex,
//   regexFindEmailStrict,
//   regexFindEmailLax,
//   regexEmailRegex,
  regexEmailStrict,
//   regexEmailLax,
//   regexMatchPostfix,
//   regexUsername,
//   funcName,
//   fixStringType,
//   arrayOfStringToDict,
//   obj2ArrayOfObj,
//   reduxArrayOfObjByKey,
//   reduxArrayOfObjByValue,
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
} from '../components/index.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';

import { useRef } from 'react';
import Modal from 'react-bootstrap/Modal'; // Import Modal
import ProgressBar from 'react-bootstrap/ProgressBar'; // Import ProgressBar

const Accounts = () => {
  const sortKeysInObject = ['percent'];
  const { t } = useTranslation();
  const { user } = useAuth();
  const [containerName] = useLocalStorage("containerName");
  const [mailservers] = useLocalStorage("mailservers");

  const [accounts, setAccounts] = useState([]);
  const [DOVECOT_FTS, setDOVECOT_FTS] = useState(0);

  // Common states -------------------------------------------------
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // State for new account inputs ----------------------------------
  const [newAccountformData, setNewAccountFormData] = useState({
    mailbox: '',
    password: '',
    confirmPassword: '',
    createLogin: 1,
  });
  const [newAccountFormErrors, setNewAccountFormErrors] = useState({});

  // State for password change modal -------------------------------
  const [selectedAccount, setSelectedAccount] = useState(null);
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


  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAccounts();
  }, [mailservers, containerName]);

  const fetchAccounts = async (refresh) => {
    refresh = (refresh === undefined || !user.isAdmin) ? false : refresh;
    
    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      
      const [accountsData, DOVECOT_FTSdata] = await Promise.all([
        getAccounts(containerName, refresh),
        getServerEnvs('mailserver', getValueFromArrayOfObj(mailservers, containerName, 'value', 'schema'), containerName, refresh, 'DOVECOT_FTS'),
      ]);

      if (accountsData.success) {
        setAccounts(accountsData.message);
        
      } else setErrorMessage(accountsData?.error);

      if (DOVECOT_FTSdata.success) {
        setDOVECOT_FTS(DOVECOT_FTSdata.message);
        
      } else setErrorMessage(DOVECOT_FTSdata?.error);

      debugLog('accountsData', accountsData);
      debugLog('DOVECOT_FTS', DOVECOT_FTS);
      
    } catch (error) {
      errorLog(t('api.errors.fetchAccounts'), error);
      setErrorMessage('api.errors.fetchAccounts');
      
    } finally {
      setLoading(false);
    }
  };

  const handleNewAccountInputChange = (e) => {
    const { name, value, type } = e.target;
    setNewAccountFormData({
      ...newAccountformData,
      [name]: type === 'number' ? Number(value) : value,
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
    return Object.keys(errors).length === 0;
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
        setNewAccountFormData({
          mailbox: '',
          password: '',
          confirmPassword: '',
          createLogin: 1,
        });
        fetchAccounts(true); // Refresh the accounts list
        setSuccessMessage('accounts.accountCreated');
        
      } else setErrorMessage(result?.error);
      
    } catch (error) {
      errorLog(t('api.errors.addAccount'), error.message);
      setErrorMessage('api.errors.addAccount', error.message);
    }
  };

  const handleDelete = async (mailbox) => {
    setErrorMessage(null);
    if (window.confirm(t('accounts.confirmDelete', { mailbox:mailbox }))) {
      try {
        const result = await deleteAccount(getValueFromArrayOfObj(mailservers, containerName, 'value', 'schema'), containerName, mailbox);
        if (result.success) {
          fetchAccounts(true); // Refresh the accounts list
          setSuccessMessage('accounts.accountDeleted');
          
        } else setErrorMessage(result?.error);
        
      } catch (error) {
        errorLog(t('api.errors.deleteAccount'), error.message);
        setErrorMessage('api.errors.deleteAccount', error.message);
      }
    }
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
      setErrorMessage('api.errors.doveadm', error.message);
    }
  };



  // Open password change modal for an account
  const handleChangePassword = (account) => {
    setSelectedAccount(account);
    
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
    } else if (passwordFormData.newPassword.length < 8) {
      errors.newPassword = 'password.passwordLength';
    }

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      errors.confirmPassword = 'password.passwordsNotMatch';
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
      const result = await updateAccount(
        getValueFromArrayOfObj(mailservers, containerName, 'value', 'schema'), 
        containerName,
        selectedAccount.mailbox,
        { password: passwordFormData.newPassword }
      );
      if (result.success) {
        setSuccessMessage(t('password.passwordUpdated', {username:selectedAccount.mailbox}));
        handleClosePasswordModal(); // Close the modal
        
      } else setErrorMessage(result?.error);
      
    } catch (error) {
      errorLog(t('api.errors.changePassword'), error);
      setErrorMessage('api.errors.changePassword');
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
    return Object.keys(errors).length === 0;
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
      setErrorMessage('api.errors.updateDNS');
    }
  };


  if (isLoading && !accounts) {
    return <LoadingSpinner />;
  }
  
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
              onClick={() => handleDelete(account.mailbox)}
              className="me-2"
            />
          }
          {(DOVECOT_FTS) && (
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
            <FormField
              type="mailbox"
              id="mailbox"
              name="mailbox"
              label="accounts.mailbox"
              value={newAccountformData.mailbox}
              onChange={handleNewAccountInputChange}
              placeholder="user@domain.com"
              error={newAccountFormErrors.mailbox}
              required
            />

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
    { id: 1, title: "accounts.existingAccounts",  titleExtra: `(${accounts.length})`, icon: "inboxes-fill", onClickRefresh: () => fetchAccounts(true), content: DataTableAccounts },
  ];
  if (user.isAdmin) accountTabs.push({ id: 2, title: "accounts.newAccount",        icon: "inbox", content: FormNewAccount });

  // BUG: passing defaultActiveKey to Accordion as string does not activate said key, while setting it up as "1" in Accordion also does not
  // icons: https://icons.getbootstrap.com/
  return (
    <div>
      <h2 className="mb-4">{Translate('accounts.title')} {t('common.for', {what:containerName})}</h2>
      
      <AlertMessage type="danger" message={errorMessage} />
      <AlertMessage type="success" message={successMessage} />
      
      <Accordion tabs={accountTabs}>
      </Accordion>

      {/* Password Change Modal using react-bootstrap */}
      <Modal show={showPasswordModal} onHide={handleClosePasswordModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {Translate('password.changePassword')} - {selectedAccount?.mailbox}{' '}
            {/* Use optional chaining */}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAccount && ( // Ensure selectedAccount exists before rendering form
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

      {/* DNS Modal using react-bootstrap */}
      <Modal show={showDNSModal} onHide={handleCloseDNSModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {Translate('accounts.manageDNS')} - {selectedAccount?.domain}{' '}
            {/* Use optional chaining */}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAccount && ( // Ensure selectedAccount exists before rendering form
            <form onSubmit={handleSubmitDNSChange} ref={dnsFormRef}>
              TBD
            </form>
          )}
        </Modal.Body>
        <Modal.Footer>
          {/* Use refactored Button component */}
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
