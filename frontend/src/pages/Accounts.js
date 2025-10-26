import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const {
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
  getValueFromArrayOfObj,
  byteSize2HumanSize,
} = require('../../frontend');

import {
  getAccounts,
  getSettings,
  getServerEnv,
  addAccount,
  deleteAccount,
  reindexAccount,
  updateAccount,
} from '../services/api';

import {
  AlertMessage,
  Accordion,
  Button,
  Card,
  DataTable,
  FormField,
  LoadingSpinner,
  Translate,
} from '../components';

import { useRef } from 'react';
import Row from 'react-bootstrap/Row'; // Import Row
import Col from 'react-bootstrap/Col'; // Import Col
import Modal from 'react-bootstrap/Modal'; // Import Modal
import ProgressBar from 'react-bootstrap/ProgressBar'; // Import ProgressBar

const Accounts = () => {
  const sortKeysInObject = ['percent'];
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const [accounts, setAccounts] = useState([]);
  const [dnsProvider, setDnsProvider] = useState({});
  const [DOVECOT_FTS, setDOVECOT_FTS] = useState(0);

  // Common states -------------------------------------------------
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  
  // State for new account inputs ----------------------------------
  const [newAccountformData, setNewAccountFormData] = useState({
    mailbox: '',
    password: '',
    confirmPassword: '',
  });
  const [newAccountFormErrors, setNewAccountFormErrors] = useState({});

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


  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async (refresh) => {
    refresh = (refresh === undefined) ? false : refresh;
    
    try {
      setLoading(true);
      const [accountsData, dnsProviderData, DOVECOT_FTSdata] = await Promise.all([
        getAccounts(refresh),
        getSettings('dnsProvider'),
        getServerEnv('DOVECOT_FTS'),
      ]);
      setAccounts(accountsData);        console.debug('ddebug accountsData',accountsData)
      setDnsProvider(dnsProviderData);
      setDOVECOT_FTS(DOVECOT_FTSdata);
      setErrorMessage(null);
      
      debugLog('accountsData', accountsData);
      debugLog('dnsProvider', dnsProvider);
      debugLog('DOVECOT_FTS', DOVECOT_FTS);
      
    } catch (err) {
      errorLog(t('api.errors.fetchAccounts'), err);
      setErrorMessage('api.errors.fetchAccounts');
      
    } finally {
      setLoading(false);
    }
  };

  const handleNewAccountInputChange = (e) => {
    const { name, value } = e.target;
    setNewAccountFormData({
      ...newAccountformData,
      [name]: value,
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
      await addAccount(
        newAccountformData.mailbox,
        newAccountformData.password,
      );
      setSuccessMessage('accounts.accountCreated');
      setNewAccountFormData({
        mailbox: '',
        password: '',
        confirmPassword: '',
      });
      fetchAccounts(true); // Refresh the accounts list
    } catch (err) {
      errorLog(t('api.errors.addAccount'), err);
      (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.addAccount');
    }
  };

  const handleDelete = async (mailbox) => {
    if (window.confirm(t('accounts.confirmDelete', { mailbox }))) {
      try {
        await deleteAccount(mailbox);
        setSuccessMessage('accounts.accountDeleted');
        fetchAccounts(true); // Refresh the accounts list
      } catch (err) {
        errorLog(t('api.errors.deleteAccount'), err);
        (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.deleteAccount');
      }
    }
  };

  const handleReindex = async (mailbox) => {
    try {
      await reindexAccount(mailbox);
      setSuccessMessage('accounts.reindexStarted');
    } catch (err) {
      errorLog(t('api.errors.reindexAccount'), err);
      (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.reindexAccount');
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
      await updateAccount(
        selectedAccount.mailbox,
        { password: passwordFormData.newPassword }
      );
      setSuccessMessage('accounts.passwordUpdated');
      handleClosePasswordModal(); // Close the modal
    } catch (err) {
      errorLog(t('api.errors.changePassword'), err);
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
    const { name, value } = e.target;
    setDNSFormData({
      ...dnsFormData,
      [name]: value,
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
    } catch (err) {
      errorLog(t('api.errors.updateDNS'), err);
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
          {(dnsProvider) && (
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
      key: 'storage',
      label: 'accounts.storage',
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
          <Button
            variant="danger"
            size="sm"
            icon="trash"
            title={t('accounts.confirmDelete', { mailbox: account.mailbox })}
            onClick={() => handleDelete(account.mailbox)}
            className="me-2"
          />
          {(DOVECOT_FTS) && (
          <Button
            variant="info"
            size="sm"
            icon="recycle"
            title={t('accounts.reindex')}
            onClick={() => handleReindex(account.mailbox)}
            className="me-2"
          />
          )}
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
  { id: 1, title: "accounts.newAccount",        icon: "inbox", content: FormNewAccount },
  { id: 2, title: "accounts.existingAccounts",  titleExtra: `(${accounts.length})`, icon: "inboxes-fill", onClickRefresh: () => fetchAccounts(true), content: DataTableAccounts },
  ];

  // BUG: passing defaultActiveKey to Accordion as string does not activate said key, while setting it up as "1" in Accordion also does not
  // icons: https://icons.getbootstrap.com/
  return (
    <div>
      <h2 className="mb-4">{Translate('accounts.title')}</h2>
      
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
