import React, { useRef } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from './Button';
import FormField from './FormField';
import Translate from './Translate';
import AlertMessage from './AlertMessage';

const PasswordChangeModal = ({
  show,
  selectedLogin,
  formData,
  errors,
  onInputChange,
  onSubmit,
  onClose,
}) => {
  const passwordFormRef = useRef(null);

  return (
    <Modal show={show} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>
          {Translate('password.changePassword')}: {selectedLogin?.username} / {selectedLogin?.mailbox}{' '}
          {/* Use optional chaining */}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Local Agent FIX: moved here from Profile.jsx – shared by both pages */}
        {selectedLogin && !selectedLogin.isAdmin && !selectedLogin.isAccount && (
          <AlertMessage type="info" message={Translate('password.notMailbox')} />
        )}
        {selectedLogin && ( // Ensure selectedLogin exists before rendering form
          <form onSubmit={onSubmit} ref={passwordFormRef}>
            <FormField
              type="password"
              id="newPassword"
              name="newPassword"
              label="password.newPassword"
              value={formData.newPassword}
              onChange={onInputChange}
              error={errors.newPassword}
              required
            />

            <FormField
              type="password"
              id="confirmPasswordModal"
              name="confirmPassword"
              label="password.confirmPassword"
              value={formData.confirmPassword}
              onChange={onInputChange}
              error={errors.confirmPassword}
              required
            />
          </form>
        )}
      </Modal.Body>
      <Modal.Footer>
        {/* Use refactored Button component */}
        <Button
          variant="secondary"
          onClick={onClose}
          text="common.cancel"
        />
        <Button
          variant="primary"
          onClick={onSubmit}
          text="password.changePassword"
        />
      </Modal.Footer>
    </Modal>
  );
};

export default PasswordChangeModal;