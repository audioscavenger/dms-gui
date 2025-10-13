const debug = false;
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getAccounts,
  getSettings,
  getServerInfos,
  addAccount,
  deleteAccount,
  reindexAccount,
  updateAccountPassword,
} from '../services/api';
import {
  AlertMessage,
  Accordion,
  Button,
  Card,
  DataTable,
  FormField,
  LoadingSpinner,
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
  const [settings, setSettings] = useState({});
  const [infos, setServerInfos] = useState({});

  // Common states -------------------------------------------------
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  
  // State for new account inputs ----------------------------------
  const [newAccountformData, setNewAccountFormData] = useState({
    email: '',
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


  useEffect(() => {
    fetchAllAccounts(false);
  }, []);

  const fetchAllAccounts = async (refresh) => {
    refresh = (refresh === undefined) ? false : refresh;
    // if (debug) console.debug(`ddebug: ------------- fetchAllAccounts call getAccounts(${refresh})`);
    
    try {
      setLoading(true);
      const [accountsData, settingsData, infosData] = await Promise.all([
        getAccounts(refresh),
        getSettings(false),
        getServerInfos(false),
      ]);
      setAccounts(accountsData);
      setSettings(settingsData);
      setServerInfos(infosData);
      setErrorMessage(null);
      
      // if (debug) console.debug('ddebug: ------------- accountsData', accountsData);
      // if (debug) console.debug('ddebug: ------------- settingsData', settingsData);
      // if (debug) console.debug('ddebug: ------------- infosData', infosData);
      
    } catch (err) {
      console.error(t('api.errors.fetchAllAccounts'), err);
      setErrorMessage('api.errors.fetchAllAccounts');
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!newAccountformData.email.trim()) {
      errors.email = 'accounts.emailRequired';
    } else if (!emailRegex.test(newAccountformData.email)) {
      errors.email = 'accounts.invalidEmail';
    }

    if (!newAccountformData.password) {
      errors.password = 'accounts.passwordRequired';
    } else if (newAccountformData.password.length < 8) {
      errors.password = 'accounts.passwordLength';
    }

    if (newAccountformData.password !== newAccountformData.confirmPassword) {
      errors.confirmPassword = 'accounts.passwordsNotMatch';
    }

    setNewAccountFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage(null);

    if (!validateNewAccountForm()) {
      return;
    }

    try {
      await addAccount(
        newAccountformData.email,
        newAccountformData.password,
      );
      setSuccessMessage('accounts.accountCreated');
      setNewAccountFormData({
        email: '',
        password: '',
        confirmPassword: '',
      });
      fetchAllAccounts(true); // Refresh the accounts list
    } catch (err) {
      console.error(t('api.errors.addAccount'), err);
      setErrorMessage('api.errors.addAccount');
      (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.addAccount');
    }
  };

  const handleDelete = async (email) => {
    if (window.confirm(t('accounts.confirmDelete', { email }))) {
      try {
        await deleteAccount(email);
        setSuccessMessage('accounts.accountDeleted');
        fetchAllAccounts(true); // Refresh the accounts list
      } catch (err) {
        console.error(t('api.errors.deleteAccount'), err);
        setErrorMessage('api.errors.deleteAccount');
        (err.response.data.error) ? setErrorMessage(String(err.response.data.error)) : setErrorMessage('api.errors.deleteAccount');
      }
    }
  };

  const handleReindex = async (email) => {
    try {
      await reindexAccount(email);
      setSuccessMessage('accounts.reindexStarted');
    } catch (err) {
      console.error(t('api.errors.reindexAccount'), err);
      setErrorMessage('api.errors.reindexAccount');
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
      errors.newPassword = 'accounts.passwordRequired';
    } else if (passwordFormData.newPassword.length < 8) {
      errors.newPassword = 'accounts.passwordLength';
    }

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      errors.confirmPassword = 'accounts.passwordsNotMatch';
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
      await updateAccountPassword(
        selectedAccount.email,
        passwordFormData.newPassword
      );
      setSuccessMessage('accounts.passwordUpdated');
      handleClosePasswordModal(); // Close the modal
    } catch (err) {
      console.error(t('api.errors.updatePassword'), err);
      setErrorMessage('api.errors.updatePassword');
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

    if (!dnsFormData.newPassword) {
      errors.newPassword = 'accounts.passwordRequired';
    } else if (dnsFormData.newPassword.length < 8) {
      errors.newPassword = 'accounts.passwordLength';
    }

    if (dnsFormData.newPassword !== dnsFormData.confirmPassword) {
      errors.confirmPassword = 'accounts.passwordsNotMatch';
    }

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
        selectedAccount.email,
        passwordFormData.newPassword
      );
      setSuccessMessage('accounts.dnsUpdated');
      handleCloseDNSModal(); // Close the modal
    } catch (err) {
      console.error(t('api.errors.updateDNS'), err);
      setErrorMessage('api.errors.updateDNS');
    }
  };


  if (isLoading && !accounts.length && !infos.env) {
    return <LoadingSpinner />;
  }
  
  // Column definitions for existing accounts table
  const columns = [
    { key: 'email', label: 'accounts.email' },
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
          'N/A'
        ),
    },
    {
      key: 'actions',
      label: 'accounts.actions',
      render: (account) => (
        <div className="d-flex">
          <Button
            variant="primary"
            size="sm"
            icon="key"
            title={t('accounts.changePassword')}
            onClick={() => handleChangePassword(account)}
            className="me-2"
          />
          <Button
            variant="danger"
            size="sm"
            icon="trash"
            title={t('accounts.confirmDelete', { email: account.email })}
            onClick={() => handleDelete(account.email)}
            className="me-2"
          />
          {(infos.env.FTS_PLUGIN != "none") && (
          <Button
            variant="info"
            size="sm"
            icon="recycle"
            title={t('accounts.reindex')}
            onClick={() => handleReindex(account.email)}
            className="me-2"
          />
          )}
          {(settings.dnsProvider != "") && (
          <Button
            variant="info"
            size="sm"
            icon="globe"
            title={t('accounts.manageDNS')}
            onClick={() => handleChangeDNS(account.email)}
            className="me-2"
          />
          )}
        </div>
      ),
    },
  ];


  const Form1 = (
          <form onSubmit={handleSubmit} className="form-wrapper">
            <FormField
              type="email"
              id="email"
              name="email"
              label="accounts.email"
              value={newAccountformData.email}
              onChange={handleNewAccountInputChange}
              placeholder="user@domain.com"
              error={newAccountFormErrors.email}
              required
            />

            <FormField
              type="password"
              id="password"
              name="password"
              label="accounts.password"
              value={newAccountformData.password}
              onChange={handleNewAccountInputChange}
              error={newAccountFormErrors.password}
              required
            />

            <FormField
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              label="accounts.confirmPassword"
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
  
  const DataTable1 = (
            <DataTable
            columns={columns}
            data={accounts}
            keyExtractor={(account) => account.email}
            isLoading={isLoading}
            emptyMessage="accounts.noAccounts"
            sortKeysInObject={sortKeysInObject}
            />
  );
  
  const tabs = [
  { id: 1, title: "accounts.newAccount",        icon: "envelope-plus-fill", content: Form1 },
  { id: 2, title: "accounts.existingAccounts",  titleExtra: `(${accounts.length})`, icon: "inboxes-fill", onClickRefresh: () => fetchAllAccounts(true), content: DataTable1 }
  ];

  // BUG: passing defaultActiveKey to Accordion as string does not activate said key, while setting it up as "1" in Accordion also does not
  // icons: https://icons.getbootstrap.com/
  return (
    <div>
      <h2 className="mb-4">{t('accounts.title')}</h2>
      <AlertMessage type="danger" message={errorMessage} />
      <AlertMessage type="success" message={successMessage} />
      
        <Accordion
          tabs={tabs}
          refresh="true"
        >
        </Accordion>

      {/* Password Change Modal using react-bootstrap */}
      <Modal show={showPasswordModal} onHide={handleClosePasswordModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {t('accounts.changePassword')} - {selectedAccount?.email}{' '}
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
                label="accounts.newPassword"
                value={passwordFormData.newPassword}
                onChange={handlePasswordInputChange}
                error={passwordFormErrors.newPassword}
                required
              />

              <FormField
                type="password"
                id="confirmPasswordModal"
                name="confirmPassword"
                label="accounts.confirmPassword"
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
            text="accounts.updatePassword"
          />
        </Modal.Footer>
      </Modal>

      {/* DNS Modal using react-bootstrap */}
      <Modal show={showDNSModal} onHide={handleCloseDNSModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {t('accounts.manageDNS')} - {selectedAccount?.email}{' '}
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
