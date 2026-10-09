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
 * @param {string} opts.containerName – current mailserver container
 * @param {Array}  opts.mailservers   – mailserver list from localStorage
 * @param {object} opts.user          – authenticated user from useAuth()
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
      // setErrorMessage('api.errors.changePassword');
      setErrorMessage({key: 'api.errors.changePassword', values: { error: error.message }});

    } finally {
      if (result.success) setSuccessMessage(result.message);
      handleClosePasswordModal(); // Close the modal
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