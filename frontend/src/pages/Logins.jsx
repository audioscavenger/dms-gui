import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import AlertMessage from '../components/AlertMessage';
import Accordion from '../components/Accordion';
import LoadingSpinner from '../components/LoadingSpinner';
import Translate from '../components/Translate';

// Local extracted components
import LoginsTable from '../components/logins/LoginsTable';
import NewLoginForm from '../components/logins/NewLoginForm';
import DeleteConfirmModal from '../components/logins/DeleteConfirmModal';
import PasswordChangeModal from '../components/logins/PasswordChangeModal';

// Local extracted hooks
import useLoginsData from '../hooks/useLoginsData';
import useNewLoginForm from '../hooks/useNewLoginForm';
import usePasswordChange from '../hooks/usePasswordChange';

import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const Logins = () => {
  // const sortKeysInObject = ['email', 'username'];   // not needed as they are not objects, just rendered FormControl
  const { t } = useTranslation();
  const triggerToast = useToast();
  const { user } = useAuth();   // {"id":1,"username":"adminn","email":"admin@dms-gui.com","isAdmin":1,"isActive":1,"isAccount":0,"mailserver":"dms","roles":[],"mailbox":"admin@dms-gui.com"}
  const [containerName] = useLocalStorage("containerName", '');
  const [mailservers] = useLocalStorage("mailservers", []);

  // ── hooks ───────────────────────────────────────────────────

  const loginsData = useLoginsData({ containerName, user });

  const newLoginForm = useNewLoginForm({
    accountOptions: loginsData.accountOptions,
    logins: loginsData.logins,
    containerName,
    refetch: loginsData.fetchAll,
  });

  const passwordChange = usePasswordChange({ containerName, mailservers, user });

  // ── full refresh (resets both data + form) ──────────────────

  const handleFullRefresh = async () => {
    newLoginForm.reset();
    await loginsData.fetchAll();
  };

  // https://www.w3schools.com/react/react_useeffect.asp
  useEffect(() => {
    handleFullRefresh();
  }, [containerName]);


  if (loginsData.isLoading || !user?.isAdmin) {
    return <LoadingSpinner />;
  }

  // ── tabs ────────────────────────────────────────────────────

  // BUG: passing defaultActiveKey to Accordion as string does not activate said key, while setting it up as "1" in Accordion also does not
  // icons: https://icons.getbootstrap.com/
  const loginTabs = [
    {
      id: 1,
      title: "logins.existingLogins",
      titleExtra: `(${loginsData.logins.length})`,
      icon: "person-lines-fill",
      onClickRefresh: handleFullRefresh,
      content: (
        <LoginsTable
          logins={loginsData.logins}
          rolesAvailable={loginsData.rolesAvailable}
          isLoading={loginsData.isLoading}
          getFieldValue={loginsData.getFieldValue}
          isRowChanged={loginsData.isRowChanged}
          onLoginChange={loginsData.handleLoginChange}
          onLoginFlipBit={loginsData.handleLoginFlipBit}
          onLoginSave={loginsData.handleLoginSave}
          onChangePassword={passwordChange.handleChangePassword}
          onConfirmDelete={loginsData.handleConfirmDeleteLogin}
        />
      ),
    },
    {
      id: 2,
      title: "logins.newLogin",
      icon: "person-fill-add",
      content: (
        <NewLoginForm
          formData={newLoginForm.newLoginformData}
          errors={newLoginForm.newLoginFormErrors}
          submitDisabled={newLoginForm.submitDisabled}
          filteredAccountOptions={newLoginForm.filteredAccountOptions}
          rolesAvailable={loginsData.rolesAvailable}
          containerName={containerName}
          mailservers={mailservers}
          onInputChange={newLoginForm.handleNewLoginInputChange}
          onRolesChange={newLoginForm.handleNewLoginRolesChange}
          onSubmit={newLoginForm.handleSubmitNewLogin}
        />
      ),
    },
  ];

  return (
    <>
      <h2 className="mb-4">{Translate('logins.title')}</h2>

      <AlertMessage type="danger" message={loginsData.errorMessage} />
      <AlertMessage type="success" message={loginsData.successMessage} />
      <AlertMessage type="danger" message={passwordChange.errorMessage} />
      <AlertMessage type="success" message={passwordChange.successMessage} />

      <Accordion tabs={loginTabs}>
      </Accordion>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        show={loginsData.showDeleteConfirmModal}
        selectedLogin={loginsData.selectedLogin}
        onAlsoDeleteMailboxChange={loginsData.handleAlsoDeleteMailboxInputChange}
        onConfirm={loginsData.handleDeleteLoginModal}
        onClose={loginsData.handleCloseDeleteConfirmModal}
      />

      {/* Password Change Modal using react-bootstrap */}
      <PasswordChangeModal
        show={passwordChange.showPasswordModal}
        selectedLogin={passwordChange.selectedLogin}
        formData={passwordChange.passwordFormData}
        errors={passwordChange.passwordFormErrors}
        onInputChange={passwordChange.handlePasswordInputChange}
        onSubmit={passwordChange.handleSubmitPasswordChange}
        onClose={passwordChange.handleClosePasswordModal}
      />
    </>
  );
};

export default Logins;