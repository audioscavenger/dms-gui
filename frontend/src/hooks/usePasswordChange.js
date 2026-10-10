import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  debugLog,
  errorLog,
} from '../frontend.mjs';
import {
  isNonEmptyDict,
  getValueFromArrayOfObj,
} from '../../../common.mjs';
import {
  updateLogin,
  updateAccount,
} from '../services/api.mjs';

/**
 * Handles all state + logic for the "Change Password" modal.
 *
 * @param {object} opts
 * @param {string} opts.containerName - current mailserver container
 * @param {Array}  opts.mailservers   - mailserver list from localStorage
 * @param {object} opts.user          - authenticated user from useAuth()
 */
export default function usePasswordChange({ containerName, mailservers, user }) {
  const { t } = useTranslation();

  // State for password change modal -------------------------------
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordFormErrors, setPasswordFormErrors] = useState({});
  const [selectedLogin, setSelectedLogin] = useState(null);

  // Local messages for password operations
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);


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

    } else if (!user.isAdmin && passwordFormData.newPassword.length < 8) {
      errors.newPassword = 'password.passwordLength';
    }

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      errors.confirmPassword = 'logins.passwordsNotMatch';
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

    // Local Agent FIX: do the irrevocable / more-important step (dovecot) first,
    // then the local GUI login.  If dovecot fails we haven't touched the local
    // password at all → no out-of-sync state.

    const newPassword = passwordFormData.newPassword;
    const completedSteps = [];

    try {
      // ── Step 1 (most important): update mailbox via dovecot ──
      if (selectedLogin.isAccount) {
        const accountResult = await updateAccount(
          getValueFromArrayOfObj(mailservers, containerName, 'value', 'schema'),
          containerName,
          selectedLogin.mailbox,
          { password: newPassword },
        );
        if (!accountResult.success) {
          throw new Error(accountResult.error || t('api.errors.changePassword'));
        }
        completedSteps.push(
          t('password.passwordUpdated', { key: 'mailbox', value: selectedLogin.mailbox }),
        );
      }

      // ── Step 2: update local GUI login ──
      // Local Agent FIX: guard - account objects from Accounts.jsx don't carry a login id,
      // so this step is skipped for pure-mailbox password changes.
      // When the account data includes a linked login's `id` (future backend enhancement),
      // both dovecot and local login will be updated in sync automatically.
      if (selectedLogin.id) {
        const loginResult = await updateLogin(selectedLogin.id, { password: newPassword });
        if (!loginResult.success) {
          // Mailbox already changed - report both facts so the admin knows
          // what state they're in.
          throw new Error(
            completedSteps.length
              ? `${completedSteps.join('; ')} - ${loginResult.error || t('api.errors.changePassword')}`
              : (loginResult.error || t('api.errors.changePassword')),
          );
        }
        completedSteps.push(
          t('password.passwordUpdated', { key: 'username', value: selectedLogin.username }),
        );
      }

      // Local Agent FIX: if neither step ran (no isAccount, no id) that's a caller bug -
      // surface it instead of silently succeeding with an empty message.
      if (completedSteps.length === 0) {
        throw new Error(t('api.errors.changePassword'));
      }

      // ── All good ──
      setSuccessMessage(completedSteps.join(' · '));

    } catch (error) {
      errorLog(t('api.errors.changePassword'), error);
      // Local Agent FIX: include any partial-success context so the admin
      // knows exactly which step succeeded and which failed.
      setErrorMessage(completedSteps.length
        ? { key: 'api.errors.changePassword', values: { error: error.message } }
        : { key: 'api.errors.changePassword', values: { error: error.message } });

    } finally {
      handleClosePasswordModal();
    }
  };

  // ── public API ──────────────────────────────────────────────
  return {
    // state
    showPasswordModal,
    passwordFormData,
    passwordFormErrors,
    selectedLogin,
    errorMessage,
    successMessage,
    // handlers
    handleChangePassword,
    handleClosePasswordModal,
    handlePasswordInputChange,
    handleSubmitPasswordChange,
  };
}
